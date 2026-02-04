// fminbox — Box-constrained optimization via logarithmic barrier method

use crate::bfgs::bfgs;
use crate::conjugate_gradient::conjugate_gradient;
use crate::l_bfgs::lbfgs;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{norm_inf, sub};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FminboxMethod {
    Bfgs,
    LBfgs,
    ConjugateGradient,
}

#[derive(Debug, Clone)]
pub struct FminboxOptions {
    pub lower: Vec<f64>,
    pub upper: Vec<f64>,
    pub method: FminboxMethod,
    pub mu0: Option<f64>,
    pub mu_factor: f64,
    pub outer_iterations: usize,
    pub outer_grad_tol: f64,
    pub grad_tol: f64,
    pub step_tol: f64,
    pub func_tol: f64,
    pub max_iterations: usize,
}

impl FminboxOptions {
    pub fn new(n: usize) -> Self {
        Self {
            lower: vec![f64::NEG_INFINITY; n],
            upper: vec![f64::INFINITY; n],
            method: FminboxMethod::LBfgs,
            mu0: None,
            mu_factor: 0.001,
            outer_iterations: 20,
            outer_grad_tol: 1e-8,
            grad_tol: 1e-8,
            step_tol: 1e-8,
            func_tol: 1e-12,
            max_iterations: 1000,
        }
    }

    pub fn to_optimize_options(&self) -> OptimizeOptions {
        OptimizeOptions {
            grad_tol: self.grad_tol,
            step_tol: self.step_tol,
            func_tol: self.func_tol,
            max_iterations: self.max_iterations,
        }
    }
}

pub fn fminbox(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    options: Option<FminboxOptions>,
) -> OptimizeResult {
    let n = x0.len();
    let opts = options.unwrap_or_else(|| FminboxOptions::new(n));

    // Validate bounds
    for i in 0..n {
        if opts.lower[i].is_finite() && opts.upper[i].is_finite() && opts.lower[i] >= opts.upper[i]
        {
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

    // Nudge x0 to strict interior
    let mut x = x0.to_vec();
    for i in 0..n {
        if opts.lower[i].is_finite() && opts.upper[i].is_finite() {
            if x[i] <= opts.lower[i] {
                x[i] = 0.99 * opts.lower[i] + 0.01 * opts.upper[i];
            } else if x[i] >= opts.upper[i] {
                x[i] = 0.01 * opts.lower[i] + 0.99 * opts.upper[i];
            }
        } else if opts.lower[i].is_finite() && x[i] <= opts.lower[i] {
            x[i] = opts.lower[i] + 1.0;
        } else if opts.upper[i].is_finite() && x[i] >= opts.upper[i] {
            x[i] = opts.upper[i] - 1.0;
        }
    }

    let mut total_function_calls = 0;
    let mut total_gradient_calls = 0;

    // Compute initial mu
    let grad_f = grad(&x);
    let grad_b = barrier_gradient(&x, &opts.lower, &opts.upper);
    let grad_f_l1: f64 = grad_f.iter().map(|g| g.abs()).sum();
    let grad_b_l1: f64 = grad_b.iter().map(|g| g.abs()).sum();
    let mut mu = if let Some(m) = opts.mu0 {
        m
    } else if grad_b_l1 > 1e-30 {
        opts.mu_factor * grad_f_l1 / grad_b_l1
    } else {
        1.0
    };

    for outer_iter in 0..opts.outer_iterations {
        // Create barrier-augmented objective and gradient
        let barrier_f = |x_inner: &[f64]| -> f64 {
            f(x_inner) + mu * barrier_value(x_inner, &opts.lower, &opts.upper)
        };

        let barrier_grad = |x_inner: &[f64]| -> Vec<f64> {
            let gf = grad(x_inner);
            let gb = barrier_gradient(x_inner, &opts.lower, &opts.upper);
            gf.iter().zip(gb.iter()).map(|(gfi, gbi)| gfi + mu * gbi).collect()
        };

        // Run inner optimizer
        let inner_result = match opts.method {
            FminboxMethod::Bfgs => bfgs(&barrier_f, &x, Some(&barrier_grad), Some(opts.to_optimize_options())),
            FminboxMethod::LBfgs => {
                let lbfgs_opts = crate::l_bfgs::LbfgsOptions {
                    memory: 10,
                    grad_tol: opts.grad_tol,
                    step_tol: opts.step_tol,
                    func_tol: opts.func_tol,
                    max_iterations: opts.max_iterations,
                };
                lbfgs(&barrier_f, &x, Some(&barrier_grad), Some(lbfgs_opts))
            }
            FminboxMethod::ConjugateGradient => {
                let cg_opts = crate::conjugate_gradient::ConjugateGradientOptions {
                    eta: 0.4,
                    restart_interval: None,
                    grad_tol: opts.grad_tol,
                    step_tol: opts.step_tol,
                    func_tol: opts.func_tol,
                    max_iterations: opts.max_iterations,
                };
                conjugate_gradient(&barrier_f, &x, Some(&barrier_grad), Some(cg_opts))
            }
        };

        total_function_calls += inner_result.function_calls;
        total_gradient_calls += inner_result.gradient_calls;

        x = inner_result.x;

        // Clamp to strict interior (numerical safety)
        for i in 0..n {
            if opts.lower[i].is_finite() {
                x[i] = x[i].max(opts.lower[i] + 1e-15);
            }
            if opts.upper[i].is_finite() {
                x[i] = x[i].min(opts.upper[i] - 1e-15);
            }
        }

        // Check projected gradient norm of original objective
        let grad_original = grad(&x);
        let proj_grad_norm = projected_gradient_norm(&x, &grad_original, &opts.lower, &opts.upper);

        if proj_grad_norm < opts.outer_grad_tol {
            let fx = f(&x);
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(grad_original),
                iterations: outer_iter + 1,
                function_calls: total_function_calls,
                gradient_calls: total_gradient_calls,
                converged: true,
                message: "Converged: projected gradient norm below tolerance".to_string(),
            };
        }

        // Reduce mu
        mu *= opts.mu_factor;
    }

    let fx_final = f(&x);
    let grad_final = grad(&x);
    OptimizeResult {
        x,
        fun: fx_final,
        gradient: Some(grad_final),
        iterations: opts.outer_iterations,
        function_calls: total_function_calls,
        gradient_calls: total_gradient_calls,
        converged: false,
        message: "Maximum outer iterations reached".to_string(),
    }
}

pub fn barrier_value(x: &[f64], lower: &[f64], upper: &[f64]) -> f64 {
    let mut val = 0.0;
    for i in 0..x.len() {
        if lower[i].is_finite() {
            let diff = x[i] - lower[i];
            if diff <= 0.0 {
                return f64::INFINITY;
            }
            val -= diff.ln();
        }
        if upper[i].is_finite() {
            let diff = upper[i] - x[i];
            if diff <= 0.0 {
                return f64::INFINITY;
            }
            val -= diff.ln();
        }
    }
    val
}

pub fn barrier_gradient(x: &[f64], lower: &[f64], upper: &[f64]) -> Vec<f64> {
    let mut grad = vec![0.0; x.len()];
    for i in 0..x.len() {
        if lower[i].is_finite() {
            grad[i] -= 1.0 / (x[i] - lower[i]);
        }
        if upper[i].is_finite() {
            grad[i] += 1.0 / (upper[i] - x[i]);
        }
    }
    grad
}

pub fn projected_gradient_norm(x: &[f64], g: &[f64], lower: &[f64], upper: &[f64]) -> f64 {
    let mut clamped = x.to_vec();
    for i in 0..x.len() {
        clamped[i] = (x[i] - g[i]).max(lower[i]).min(upper[i]);
    }
    let proj_grad = sub(x, &clamped);
    norm_inf(&proj_grad)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_fminbox_interior_minimum() {
        let x0 = vec![1.0, 1.0];
        let mut opts = FminboxOptions::new(2);
        opts.lower = vec![-5.0, -5.0];
        opts.upper = vec![5.0, 5.0];

        let result = fminbox(&sphere, &x0, &sphere_grad, Some(opts));
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        assert!(result.x[0].abs() < 1e-4);
        assert!(result.x[1].abs() < 1e-4);
    }

    #[test]
    fn test_fminbox_boundary_minimum() {
        let f = |x: &[f64]| x[0] * x[0];
        let grad = |x: &[f64]| vec![2.0 * x[0]];
        let x0 = vec![5.0];
        let mut opts = FminboxOptions::new(1);
        opts.lower = vec![2.0];
        opts.upper = vec![10.0];

        let result = fminbox(&f, &x0, &grad, Some(opts));
        assert!(result.converged || result.fun < 4.1);
        assert!((result.x[0] - 2.0).abs() < 0.1);
        assert!((result.fun - 4.0).abs() < 0.5);
    }

    #[test]
    fn test_fminbox_rosenbrock_constrained() {
        let x0 = vec![2.0, 2.0];
        let mut opts = FminboxOptions::new(2);
        opts.lower = vec![1.5, 1.5];
        opts.upper = vec![3.0, 3.0];

        let result = fminbox(&rosenbrock, &x0, &rosenbrock_grad, Some(opts));
        assert!(result.converged || result.fun < 1.0);
        assert!((result.x[0] - 1.5).abs() < 0.2);
    }

    #[test]
    fn test_fminbox_invalid_bounds() {
        let x0 = vec![1.0];
        let mut opts = FminboxOptions::new(1);
        opts.lower = vec![5.0];
        opts.upper = vec![2.0];

        let f = |x: &[f64]| x[0] * x[0];
        let grad = |x: &[f64]| vec![2.0 * x[0]];
        let result = fminbox(&f, &x0, &grad, Some(opts));
        assert!(!result.converged);
        assert!(result.message.contains("Invalid bounds"));
    }

    #[test]
    fn test_barrier_value() {
        let val = barrier_value(&[2.0], &[0.0], &[4.0]);
        assert!((val - (-2.0 * 2.0_f64.ln())).abs() < 1e-8);

        let val_outside = barrier_value(&[0.0], &[0.0], &[4.0]);
        assert!(val_outside.is_infinite());

        let val_infinite = barrier_value(&[5.0], &[f64::NEG_INFINITY], &[f64::INFINITY]);
        assert_eq!(val_infinite, 0.0);
    }

    #[test]
    fn test_projected_gradient_norm() {
        // At lower bound with gradient pointing outward
        let norm = projected_gradient_norm(&[0.0], &[1.0], &[0.0], &[10.0]);
        assert_eq!(norm, 0.0);

        // Interior point
        let norm = projected_gradient_norm(&[2.0, 3.0], &[0.5, -0.3], &[0.0, 0.0], &[10.0, 10.0]);
        assert_eq!(norm, 0.5);
    }

    #[test]
    fn test_fminbox_method_bfgs() {
        let x0 = vec![1.0, 1.0];
        let mut opts = FminboxOptions::new(2);
        opts.lower = vec![-5.0, -5.0];
        opts.upper = vec![5.0, 5.0];
        opts.method = FminboxMethod::Bfgs;

        let result = fminbox(&sphere, &x0, &sphere_grad, Some(opts));
        assert!(result.converged);
        assert!(result.fun < 1e-6);
    }

    #[test]
    fn test_fminbox_method_cg() {
        let x0 = vec![1.0, 1.0];
        let mut opts = FminboxOptions::new(2);
        opts.lower = vec![-5.0, -5.0];
        opts.upper = vec![5.0, 5.0];
        opts.method = FminboxMethod::ConjugateGradient;

        let result = fminbox(&sphere, &x0, &sphere_grad, Some(opts));
        assert!(result.converged);
        assert!(result.fun < 1e-6);
    }
}
