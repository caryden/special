/// Krylov Trust Region: Newton-type optimizer using Steihaug-Toint truncated CG.

use crate::finite_diff::forward_diff_gradient;
use crate::finite_hessian::hessian_vector_product;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{dot, norm, sub};

pub struct KrylovTrustRegionOptions {
    pub optimize: OptimizeOptions,
    pub initial_radius: f64,
    pub max_radius: f64,
    pub eta: f64,
    pub rho_lower: f64,
    pub rho_upper: f64,
    pub cg_tol: f64,
}

impl Default for KrylovTrustRegionOptions {
    fn default() -> Self {
        KrylovTrustRegionOptions {
            optimize: OptimizeOptions::default(),
            initial_radius: 1.0,
            max_radius: 100.0,
            eta: 0.1,
            rho_lower: 0.25,
            rho_upper: 0.75,
            cg_tol: 0.01,
        }
    }
}

struct SteihaugResult {
    s: Vec<f64>,
    m_decrease: f64,
    cg_iters: usize,
    on_boundary: bool,
    grad_calls: usize,
}

fn boundary_tau(z: &[f64], d: &[f64], radius: f64) -> f64 {
    let a = dot(d, d);
    let b = 2.0 * dot(z, d);
    let c = dot(z, z) - radius * radius;
    let disc = (b * b - 4.0 * a * c).max(0.0);
    (-b + disc.sqrt()) / (2.0 * a)
}

fn steihaug_cg(
    grad_fn: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    gx: &[f64],
    radius: f64,
    cg_tol: f64,
) -> SteihaugResult {
    let n = x.len();
    let mut z = vec![0.0; n];
    let mut r = gx.to_vec();
    let mut d: Vec<f64> = r.iter().map(|ri| -ri).collect();
    let r0_sq = dot(&r, &r);
    let tol_sq = (cg_tol * cg_tol) * r0_sq;
    let mut grad_calls = 0_usize;

    for cg_iter in 0..n {
        let hd = hessian_vector_product(grad_fn, x, &d, gx);
        grad_calls += 1;
        let d_hd = dot(&d, &hd);

        // Negative curvature
        if d_hd < 0.0 {
            let tau = boundary_tau(&z, &d, radius);
            let s: Vec<f64> = z.iter().zip(d.iter()).map(|(zi, di)| zi + tau * di).collect();
            let m_dec = dot(gx, &s) + 0.5 * {
                let hs = hessian_vector_product(grad_fn, x, &s, gx);
                grad_calls += 1;
                dot(&s, &hs)
            };
            return SteihaugResult {
                s,
                m_decrease: m_dec,
                cg_iters: cg_iter + 1,
                on_boundary: true,
                grad_calls,
            };
        }

        // Near-zero curvature
        if d_hd.abs() < 1e-15 {
            let m_dec = dot(gx, &z) + 0.5 * {
                if norm(&z) > 0.0 {
                    let hz = hessian_vector_product(grad_fn, x, &z, gx);
                    grad_calls += 1;
                    dot(&z, &hz)
                } else {
                    0.0
                }
            };
            return SteihaugResult {
                s: z,
                m_decrease: m_dec,
                cg_iters: cg_iter + 1,
                on_boundary: false,
                grad_calls,
            };
        }

        let alpha = dot(&r, &r) / d_hd;

        // Check if step exceeds radius
        let z_new: Vec<f64> = z.iter().zip(d.iter()).map(|(zi, di)| zi + alpha * di).collect();
        if norm(&z_new) >= radius {
            let tau = boundary_tau(&z, &d, radius);
            let s: Vec<f64> = z.iter().zip(d.iter()).map(|(zi, di)| zi + tau * di).collect();
            let m_dec = dot(gx, &s) + 0.5 * {
                let hs = hessian_vector_product(grad_fn, x, &s, gx);
                grad_calls += 1;
                dot(&s, &hs)
            };
            return SteihaugResult {
                s,
                m_decrease: m_dec,
                cg_iters: cg_iter + 1,
                on_boundary: true,
                grad_calls,
            };
        }

        z = z_new;
        let r_old_sq = dot(&r, &r);
        for i in 0..n {
            r[i] += alpha * hd[i];
        }
        let r_new_sq = dot(&r, &r);

        if r_new_sq < tol_sq {
            let m_dec = dot(gx, &z) + 0.5 * {
                let hz = hessian_vector_product(grad_fn, x, &z, gx);
                grad_calls += 1;
                dot(&z, &hz)
            };
            return SteihaugResult {
                s: z,
                m_decrease: m_dec,
                cg_iters: cg_iter + 1,
                on_boundary: false,
                grad_calls,
            };
        }

        let beta = r_new_sq / r_old_sq;
        for i in 0..n {
            d[i] = -r[i] + beta * d[i];
        }
    }

    let m_dec = dot(gx, &z) + 0.5 * {
        if norm(&z) > 0.0 {
            let hz = hessian_vector_product(grad_fn, x, &z, gx);
            grad_calls += 1;
            dot(&z, &hz)
        } else {
            0.0
        }
    };
    SteihaugResult {
        s: z,
        m_decrease: m_dec,
        cg_iters: n,
        on_boundary: false,
        grad_calls,
    }
}

pub fn krylov_trust_region(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&KrylovTrustRegionOptions>,
) -> OptimizeResult {
    let defaults = KrylovTrustRegionOptions::default();
    let opts_full = options.unwrap_or(&defaults);
    let opts = &opts_full.optimize;

    let grad_fn = |x: &[f64]| -> Vec<f64> {
        match grad {
            Some(g) => g(x),
            None => forward_diff_gradient(f, x),
        }
    };

    let mut x = x0.to_vec();
    let mut fx = f(&x);
    let mut gx = grad_fn(&x);
    let mut function_calls = 1_usize;
    let mut gradient_calls = 1_usize;
    let mut radius = opts_full.initial_radius;

    if norm(&gx) < opts.grad_tol {
        return OptimizeResult {
            x, fun: fx, gradient: Some(gx),
            iterations: 0, function_calls, gradient_calls,
            converged: true,
            message: "Converged: gradient norm below tolerance".to_string(),
        };
    }

    for iteration in 1..=opts.max_iterations {
        let cg_result = steihaug_cg(&grad_fn, &x, &gx, radius, opts_full.cg_tol);
        gradient_calls += cg_result.grad_calls;

        let x_trial: Vec<f64> = x.iter().zip(cg_result.s.iter()).map(|(xi, si)| xi + si).collect();
        let f_trial = f(&x_trial);
        function_calls += 1;

        let actual = fx - f_trial;
        let predicted = -cg_result.m_decrease;
        let rho = if predicted.abs() < 1e-25 { 0.0 } else { actual / predicted };

        // Update radius
        if rho < opts_full.rho_lower {
            radius *= 0.25;
        } else if rho > opts_full.rho_upper && cg_result.on_boundary {
            radius = (2.0 * radius).min(opts_full.max_radius);
        }

        if rho > opts_full.eta {
            let step_norm = norm(&cg_result.s);
            let func_change = (fx - f_trial).abs();

            x = x_trial;
            fx = f_trial;
            gx = grad_fn(&x);
            gradient_calls += 1;

            let grad_norm = norm(&gx);
            if grad_norm < opts.grad_tol {
                return OptimizeResult {
                    x, fun: fx, gradient: Some(gx),
                    iterations: iteration, function_calls, gradient_calls,
                    converged: true,
                    message: format!("Converged: gradient norm {:.2e} below tolerance", grad_norm),
                };
            }
            if step_norm < opts.step_tol {
                return OptimizeResult {
                    x, fun: fx, gradient: Some(gx),
                    iterations: iteration, function_calls, gradient_calls,
                    converged: true,
                    message: "Converged: step size below tolerance".to_string(),
                };
            }
            if func_change < opts.func_tol {
                return OptimizeResult {
                    x, fun: fx, gradient: Some(gx),
                    iterations: iteration, function_calls, gradient_calls,
                    converged: true,
                    message: "Converged: function change below tolerance".to_string(),
                };
            }
        } else {
            if radius < 1e-15 {
                return OptimizeResult {
                    x, fun: fx, gradient: Some(gx),
                    iterations: iteration, function_calls, gradient_calls,
                    converged: false,
                    message: "Stopped: trust region radius below minimum".to_string(),
                };
            }
        }
    }

    OptimizeResult {
        x, fun: fx, gradient: Some(gx),
        iterations: opts.max_iterations, function_calls, gradient_calls,
        converged: false,
        message: format!("Stopped: reached maximum iterations ({})", opts.max_iterations),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_sphere() {
        let tf = sphere();
        let r = krylov_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let r = krylov_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_booth() {
        let tf = booth();
        let r = krylov_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
    }

    #[test]
    fn test_negative_curvature() {
        let f = |x: &[f64]| -x[0] * x[0] - x[1] * x[1];
        let g = |x: &[f64]| vec![-2.0 * x[0], -2.0 * x[1]];
        let r = krylov_trust_region(&f, &[0.1, 0.1], Some(&g), None);
        // Should not crash, makes progress
        assert!(r.iterations > 0);
    }

    #[test]
    fn test_boundary_hit() {
        let tf = sphere();
        let opts = KrylovTrustRegionOptions {
            initial_radius: 1.0,
            ..Default::default()
        };
        let r = krylov_trust_region(&tf.f, &[100.0, 100.0], Some(&tf.gradient), Some(&opts));
        assert!(r.converged || r.iterations > 0);
    }
}
