/// Newton with dogleg trust region subproblem.

use crate::finite_diff::forward_diff_gradient;
use crate::finite_hessian::finite_diff_hessian;
use crate::newton::cholesky_solve;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{dot, norm, sub};

pub struct TrustRegionOptions {
    pub optimize: OptimizeOptions,
    pub initial_delta: f64,
    pub max_delta: f64,
    pub eta: f64,
}

impl Default for TrustRegionOptions {
    fn default() -> Self {
        TrustRegionOptions {
            optimize: OptimizeOptions::default(),
            initial_delta: 1.0,
            max_delta: 100.0,
            eta: 0.1,
        }
    }
}

fn mat_vec_mul(m: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    m.iter().map(|row| dot(row, v)).collect()
}

fn dogleg_step(g: &[f64], h: &[Vec<f64>], delta: f64) -> Vec<f64> {
    let n = g.len();
    let g_norm = norm(g);

    // Cauchy point: pC = -tau * g
    let hg = mat_vec_mul(h, g);
    let g_h_g = dot(g, &hg);

    let pc: Vec<f64>;
    let pc_norm: f64;

    if g_h_g > 0.0 {
        let tau = (g_norm * g_norm) / g_h_g;
        pc = g.iter().map(|gi| -tau * gi).collect();
        pc_norm = norm(&pc);
    } else {
        // Negative curvature: go to boundary
        let scale = delta / g_norm;
        return g.iter().map(|gi| -scale * gi).collect();
    }

    if pc_norm >= delta {
        // Cauchy point outside trust region: scale to boundary
        let scale = delta / g_norm;
        return g.iter().map(|gi| -scale * gi).collect();
    }

    // Newton point
    let neg_g: Vec<f64> = g.iter().map(|gi| -gi).collect();
    let pn_opt = cholesky_solve(h, &neg_g);

    let pn = match pn_opt {
        Some(p) => p,
        None => return pc, // Indefinite: use Cauchy point
    };

    let pn_norm = norm(&pn);
    if pn_norm <= delta {
        return pn; // Full Newton step fits
    }

    // Dogleg interpolation: find tau s.t. ||pC + tau*(pN - pC)|| = delta
    let diff: Vec<f64> = sub(&pn, &pc);
    let a = dot(&diff, &diff);
    let b = 2.0 * dot(&pc, &diff);
    let c = dot(&pc, &pc) - delta * delta;
    let disc = b * b - 4.0 * a * c;

    if disc < 0.0 || a <= 0.0 {
        return pc;
    }

    let tau = (-b + disc.sqrt()) / (2.0 * a);
    let tau = tau.max(0.0).min(1.0);

    pc.iter()
        .zip(diff.iter())
        .map(|(pci, di)| pci + tau * di)
        .collect()
}

pub fn newton_trust_region(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    hess: Option<&dyn Fn(&[f64]) -> Vec<Vec<f64>>>,
    options: Option<&TrustRegionOptions>,
) -> OptimizeResult {
    let defaults = TrustRegionOptions::default();
    let opts_full = options.unwrap_or(&defaults);
    let opts = &opts_full.optimize;

    let grad_fn = |x: &[f64]| -> Vec<f64> {
        match grad {
            Some(g) => g(x),
            None => forward_diff_gradient(f, x),
        }
    };

    let hess_fn = |x: &[f64]| -> Vec<Vec<f64>> {
        match hess {
            Some(h) => h(x),
            None => finite_diff_hessian(f, x),
        }
    };

    let mut x = x0.to_vec();
    let mut fx = f(&x);
    let mut gx = grad_fn(&x);
    let mut function_calls = 1_usize;
    let mut gradient_calls = 1_usize;
    let mut delta = opts_full.initial_delta;

    if norm(&gx) < opts.grad_tol {
        return OptimizeResult {
            x, fun: fx, gradient: Some(gx),
            iterations: 0, function_calls, gradient_calls,
            converged: true,
            message: "Converged: gradient norm below tolerance".to_string(),
        };
    }

    for iteration in 1..=opts.max_iterations {
        let h_mat = hess_fn(&x);
        let p = dogleg_step(&gx, &h_mat, delta);
        let p_norm = norm(&p);

        // Trial point
        let x_trial: Vec<f64> = x.iter().zip(p.iter()).map(|(xi, pi)| xi + pi).collect();
        let f_trial = f(&x_trial);
        function_calls += 1;

        // Predicted reduction: -(g'p + 0.5*p'Hp)
        let hp = mat_vec_mul(&h_mat, &p);
        let predicted = -(dot(&gx, &p) + 0.5 * dot(&p, &hp));
        let actual = fx - f_trial;

        let rho = if predicted.abs() < 1e-25 { 0.0 } else { actual / predicted };

        // Update trust region radius
        if rho < 0.25 {
            delta = 0.25 * p_norm;
        } else if rho > 0.75 && p_norm >= 0.99 * delta {
            delta = (2.0 * delta).min(opts_full.max_delta);
        }

        // Accept or reject step
        if rho > opts_full.eta {
            let step_norm = norm(&sub(&x_trial, &x));
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
            // Reject step
            if delta < 1e-15 {
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
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-14);
    }

    #[test]
    fn test_booth() {
        let tf = booth();
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_beale() {
        let tf = beale();
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
    }

    #[test]
    fn test_himmelblau() {
        let tf = himmelblau();
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_goldstein_price() {
        let tf = goldstein_price();
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
        assert!((r.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_at_minimum() {
        let tf = sphere();
        let r = newton_trust_region(&tf.f, &[0.0, 0.0], Some(&tf.gradient), None, None);
        assert!(r.converged);
        assert_eq!(r.iterations, 0);
    }

    #[test]
    fn test_saddle() {
        let f = |x: &[f64]| x[0] * x[0] - x[1] * x[1];
        let g = |x: &[f64]| vec![2.0 * x[0], -2.0 * x[1]];
        let h = |_: &[f64]| vec![vec![2.0, 0.0], vec![0.0, -2.0]];
        let r = newton_trust_region(&f, &[1.0, 1.0], Some(&g), Some(&h), None);
        // Handles indefinite Hessian via Cauchy point
        assert!(r.iterations > 0);
    }

    #[test]
    fn test_small_delta() {
        let tf = sphere();
        let opts = TrustRegionOptions {
            max_delta: 0.5,
            ..Default::default()
        };
        let r = newton_trust_region(&tf.f, &tf.starting_point, Some(&tf.gradient), None, Some(&opts));
        assert!(r.converged);
    }
}
