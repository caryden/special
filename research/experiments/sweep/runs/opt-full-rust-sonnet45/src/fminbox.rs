/// Box-constrained optimization via logarithmic barrier method.

use crate::bfgs;
use crate::conjugate_gradient;
use crate::gradient_descent;
use crate::l_bfgs;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops;

#[derive(Debug, Clone, Copy)]
pub enum FminboxMethod {
    Bfgs,
    LBfgs,
    ConjugateGradient,
    GradientDescent,
}

pub struct FminboxOptions {
    pub lower: Vec<f64>,
    pub upper: Vec<f64>,
    pub method: FminboxMethod,
    pub mu0: Option<f64>,
    pub mu_factor: f64,
    pub outer_iterations: usize,
    pub outer_grad_tol: f64,
    pub inner_opts: OptimizeOptions,
}

pub fn barrier_value(x: &[f64], lower: &[f64], upper: &[f64]) -> f64 {
    let mut val = 0.0;
    for i in 0..x.len() {
        if lower[i].is_finite() {
            let dxl = x[i] - lower[i];
            if dxl <= 0.0 {
                return f64::INFINITY;
            }
            val -= dxl.ln();
        }
        if upper[i].is_finite() {
            let dxu = upper[i] - x[i];
            if dxu <= 0.0 {
                return f64::INFINITY;
            }
            val -= dxu.ln();
        }
    }
    val
}

pub fn barrier_gradient(x: &[f64], lower: &[f64], upper: &[f64]) -> Vec<f64> {
    let mut g = vec![0.0; x.len()];
    for i in 0..x.len() {
        if lower[i].is_finite() {
            g[i] += -1.0 / (x[i] - lower[i]);
        }
        if upper[i].is_finite() {
            g[i] += 1.0 / (upper[i] - x[i]);
        }
    }
    g
}

pub fn projected_gradient_norm(x: &[f64], g: &[f64], lower: &[f64], upper: &[f64]) -> f64 {
    let mut max_val = 0.0_f64;
    for i in 0..x.len() {
        let clamped = (x[i] - g[i]).max(lower[i]).min(upper[i]);
        let projected = x[i] - clamped;
        max_val = max_val.max(projected.abs());
    }
    max_val
}

pub fn fminbox(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    lower: &[f64],
    upper: &[f64],
    method: FminboxMethod,
    options: Option<&FminboxOptions>,
) -> OptimizeResult {
    let n = x0.len();
    let mu_factor = options.map(|o| o.mu_factor).unwrap_or(0.001);
    let outer_iterations = options.map(|o| o.outer_iterations).unwrap_or(20);
    let outer_grad_tol = options.map(|o| o.outer_grad_tol).unwrap_or(1e-8);
    let inner_opts = options
        .map(|o| o.inner_opts.clone())
        .unwrap_or(OptimizeOptions::default());

    // Validate bounds
    for i in 0..n {
        if lower[i] >= upper[i] {
            return OptimizeResult {
                x: x0.to_vec(),
                fun: f(x0),
                gradient: Some(grad(x0)),
                iterations: 0,
                function_calls: 1,
                gradient_calls: 1,
                converged: false,
                message: "Invalid bounds: lower >= upper".to_string(),
            };
        }
    }

    // Nudge to interior
    let mut x = x0.to_vec();
    for i in 0..n {
        if x[i] <= lower[i] || x[i] >= upper[i] {
            if x[i] <= lower[i] {
                x[i] = if lower[i].is_finite() && upper[i].is_finite() {
                    0.99 * lower[i] + 0.01 * upper[i]
                } else if lower[i].is_finite() {
                    lower[i] + 1.0
                } else {
                    0.0
                };
            } else {
                x[i] = if lower[i].is_finite() && upper[i].is_finite() {
                    0.01 * lower[i] + 0.99 * upper[i]
                } else if upper[i].is_finite() {
                    upper[i] - 1.0
                } else {
                    0.0
                };
            }
        }
    }

    let mut function_calls = 0_usize;
    let mut gradient_calls = 0_usize;

    let mut fx = f(&x);
    let mut gx = grad(&x);
    function_calls += 1;
    gradient_calls += 1;

    // Compute initial mu
    let mu_init = options.and_then(|o| o.mu0);
    let mut mu = if let Some(m) = mu_init {
        m
    } else {
        let obj_grad_l1: f64 = gx.iter().map(|g| g.abs()).sum();
        let bar_grad = barrier_gradient(&x, lower, upper);
        let bar_grad_l1: f64 = bar_grad.iter().map(|g| g.abs()).sum();
        if bar_grad_l1 > 0.0 {
            mu_factor * obj_grad_l1 / bar_grad_l1
        } else {
            1e-4
        }
    };

    let pgn = projected_gradient_norm(&x, &gx, lower, upper);
    if pgn <= outer_grad_tol {
        return OptimizeResult {
            x,
            fun: fx,
            gradient: Some(gx),
            iterations: 0,
            function_calls,
            gradient_calls,
            converged: true,
            message: "Converged: projected gradient norm below tolerance".to_string(),
        };
    }

    for outer_iter in 1..=outer_iterations {
        let current_mu = mu;
        let lower_c = lower.to_vec();
        let upper_c = upper.to_vec();

        let barrier_f = move |xp: &[f64]| -> f64 {
            let bv = barrier_value(xp, &lower_c, &upper_c);
            if !bv.is_finite() {
                return f64::INFINITY;
            }
            f(xp) + current_mu * bv
        };

        let lower_c2 = lower.to_vec();
        let upper_c2 = upper.to_vec();
        let barrier_grad = move |xp: &[f64]| -> Vec<f64> {
            let g_obj = grad(xp);
            let g_bar = barrier_gradient(xp, &lower_c2, &upper_c2);
            g_obj
                .iter()
                .zip(g_bar.iter())
                .map(|(go, gb)| go + current_mu * gb)
                .collect()
        };

        let inner_result = match method {
            FminboxMethod::Bfgs => {
                bfgs::bfgs(&barrier_f, &x, Some(&barrier_grad), Some(&inner_opts))
            }
            FminboxMethod::LBfgs => {
                l_bfgs::lbfgs(&barrier_f, &x, Some(&barrier_grad), Some(&inner_opts))
            }
            FminboxMethod::ConjugateGradient => conjugate_gradient::conjugate_gradient(
                &barrier_f,
                &x,
                Some(&barrier_grad),
                Some(&inner_opts),
            ),
            FminboxMethod::GradientDescent => gradient_descent::gradient_descent(
                &barrier_f,
                &x,
                Some(&barrier_grad),
                Some(&inner_opts),
            ),
        };

        x = inner_result.x;

        // Clamp to strict interior
        for i in 0..n {
            if lower[i].is_finite() {
                x[i] = x[i].max(lower[i] + 1e-15);
            }
            if upper[i].is_finite() {
                x[i] = x[i].min(upper[i] - 1e-15);
            }
        }

        fx = f(&x);
        gx = grad(&x);
        function_calls += inner_result.function_calls + 1;
        gradient_calls += inner_result.gradient_calls + 1;

        let pgn = projected_gradient_norm(&x, &gx, lower, upper);
        if pgn <= outer_grad_tol {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: outer_iter,
                function_calls,
                gradient_calls,
                converged: true,
                message: "Converged: projected gradient norm below tolerance".to_string(),
            };
        }

        mu *= mu_factor;
    }

    OptimizeResult {
        x,
        fun: fx,
        gradient: Some(gx),
        iterations: outer_iterations,
        function_calls,
        gradient_calls,
        converged: false,
        message: format!(
            "Stopped: reached maximum outer iterations ({})",
            outer_iterations
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_interior_minimum() {
        let tf = sphere();
        let r = fminbox(
            &tf.f,
            &[1.0, 1.0],
            &tf.gradient,
            &[-5.0, -5.0],
            &[5.0, 5.0],
            FminboxMethod::LBfgs,
            None,
        );
        assert!(r.converged);
        assert!(r.fun < 1e-4);
    }

    #[test]
    fn test_boundary_minimum() {
        // Minimum of x^2 is at 0, but constrained to [2, 10], so minimum is at x=2
        let f = |x: &[f64]| x[0] * x[0];
        let g = |x: &[f64]| vec![2.0 * x[0]];
        let r = fminbox(&f, &[5.0], &g, &[2.0], &[10.0], FminboxMethod::LBfgs, None);
        // Solution should be near the lower bound
        assert!((r.x[0] - 2.0).abs() < 0.1);
        assert!((r.fun - 4.0).abs() < 0.5);
    }

    #[test]
    fn test_constrained_rosenbrock() {
        // Rosenbrock minimum at (1,1) is outside box [1.5,3]x[1.5,3]
        let tf = rosenbrock();
        let r = fminbox(
            &tf.f,
            &[2.0, 2.0],
            &tf.gradient,
            &[1.5, 1.5],
            &[3.0, 3.0],
            FminboxMethod::LBfgs,
            None,
        );
        // x[0] should be near lower bound 1.5
        assert!((r.x[0] - 1.5).abs() < 0.2);
    }

    #[test]
    fn test_invalid_bounds() {
        let f = |x: &[f64]| x[0] * x[0];
        let g = |x: &[f64]| vec![2.0 * x[0]];
        let r = fminbox(
            &f,
            &[1.0],
            &g,
            &[5.0],
            &[2.0],
            FminboxMethod::LBfgs,
            None,
        );
        assert!(!r.converged);
        assert!(r.message.contains("Invalid bounds"));
    }

    #[test]
    fn test_barrier_value() {
        let v = barrier_value(&[2.0], &[0.0], &[4.0]);
        assert!((v - (-2.0 * 2.0_f64.ln())).abs() < 1e-10);
    }

    #[test]
    fn test_barrier_value_outside() {
        let v = barrier_value(&[0.0], &[0.0], &[4.0]);
        assert!(v == f64::INFINITY);
    }

    #[test]
    fn test_barrier_value_infinite_bounds() {
        let v = barrier_value(&[5.0], &[f64::NEG_INFINITY], &[f64::INFINITY]);
        assert_eq!(v, 0.0);
    }

    #[test]
    fn test_projected_gradient_norm_boundary() {
        let pgn = projected_gradient_norm(&[0.0], &[1.0], &[0.0], &[10.0]);
        assert_eq!(pgn, 0.0);
    }

    #[test]
    fn test_projected_gradient_norm_interior() {
        let pgn = projected_gradient_norm(&[2.0, 3.0], &[0.5, -0.3], &[0.0, 0.0], &[10.0, 10.0]);
        assert!((pgn - 0.5).abs() < 1e-10);
    }
}
