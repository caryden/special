/// Newton's method with Cholesky solve and modified Newton regularization.

use crate::finite_diff::forward_diff_gradient;
use crate::finite_hessian::finite_diff_hessian;
use crate::line_search::wolfe_line_search;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{dot, norm, sub};

pub fn cholesky_solve(a: &[Vec<f64>], b: &[f64]) -> Option<Vec<f64>> {
    let n = b.len();
    if n == 0 {
        return Some(vec![]);
    }
    let mut l = vec![vec![0.0; n]; n];

    for i in 0..n {
        for j in 0..=i {
            let mut sum = 0.0;
            for k in 0..j {
                sum += l[i][k] * l[j][k];
            }
            if i == j {
                let diag = a[i][i] - sum;
                if diag <= 0.0 {
                    return None;
                }
                l[i][j] = diag.sqrt();
            } else {
                l[i][j] = (a[i][j] - sum) / l[j][j];
            }
        }
    }

    // Forward substitution: L*y = b
    let mut y = vec![0.0; n];
    for i in 0..n {
        let mut sum = 0.0;
        for j in 0..i {
            sum += l[i][j] * y[j];
        }
        y[i] = (b[i] - sum) / l[i][i];
    }

    // Back substitution: L'*x = y
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let mut sum = 0.0;
        for j in (i + 1)..n {
            sum += l[j][i] * x[j];
        }
        x[i] = (y[i] - sum) / l[i][i];
    }

    Some(x)
}

pub struct NewtonOptions {
    pub optimize: OptimizeOptions,
    pub initial_tau: f64,
    pub tau_factor: f64,
    pub max_regularize: usize,
}

impl Default for NewtonOptions {
    fn default() -> Self {
        NewtonOptions {
            optimize: OptimizeOptions::default(),
            initial_tau: 1e-8,
            tau_factor: 10.0,
            max_regularize: 20,
        }
    }
}

pub fn newton(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    hess: Option<&dyn Fn(&[f64]) -> Vec<Vec<f64>>>,
    options: Option<&NewtonOptions>,
) -> OptimizeResult {
    let defaults = NewtonOptions::default();
    let opts_full = options.unwrap_or(&defaults);
    let opts = &opts_full.optimize;
    let n = x0.len();

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

    if norm(&gx) < opts.grad_tol {
        return OptimizeResult {
            x,
            fun: fx,
            gradient: Some(gx),
            iterations: 0,
            function_calls,
            gradient_calls,
            converged: true,
            message: "Converged: gradient norm below tolerance".to_string(),
        };
    }

    for iteration in 1..=opts.max_iterations {
        let h_mat = hess_fn(&x);
        let neg_g: Vec<f64> = gx.iter().map(|g| -g).collect();

        // Try Cholesky, then regularize
        let mut d_opt = cholesky_solve(&h_mat, &neg_g);
        if d_opt.is_none() {
            let mut tau = opts_full.initial_tau;
            for _ in 0..opts_full.max_regularize {
                let mut h_reg: Vec<Vec<f64>> = h_mat.iter().map(|r| r.clone()).collect();
                for i in 0..n {
                    h_reg[i][i] += tau;
                }
                d_opt = cholesky_solve(&h_reg, &neg_g);
                if d_opt.is_some() {
                    break;
                }
                tau *= opts_full.tau_factor;
            }
        }

        let d = match d_opt {
            Some(d) => d,
            None => {
                return OptimizeResult {
                    x,
                    fun: fx,
                    gradient: Some(gx),
                    iterations: iteration,
                    function_calls,
                    gradient_calls,
                    converged: false,
                    message: "Stopped: regularization failed".to_string(),
                };
            }
        };

        // Descent check
        let d = if dot(&d, &gx) >= 0.0 {
            // Use steepest descent
            gx.iter().map(|g| -g).collect()
        } else {
            d
        };

        let ls = wolfe_line_search(f, &grad_fn, &x, &d, fx, &gx, None);
        function_calls += ls.function_calls;
        gradient_calls += ls.gradient_calls;

        if !ls.success {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iteration,
                function_calls,
                gradient_calls,
                converged: false,
                message: "Stopped: line search failed".to_string(),
            };
        }

        let x_new: Vec<f64> = x.iter().zip(d.iter()).map(|(xi, di)| xi + ls.alpha * di).collect();
        let g_new = ls.g_new.unwrap_or_else(|| grad_fn(&x_new));
        let step_norm = norm(&sub(&x_new, &x));
        let func_change = (fx - ls.f_new).abs();

        x = x_new;
        fx = ls.f_new;
        gx = g_new;

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
    fn test_sphere_analytic() {
        let tf = sphere();
        let hess_fn = |x: &[f64]| vec![vec![2.0, 0.0], vec![0.0, 2.0]];
        let r = newton(&tf.f, &tf.starting_point, Some(&tf.gradient), Some(&hess_fn), None);
        assert!(r.converged);
        assert!(r.fun < 1e-14);
        assert!(r.iterations <= 2);
    }

    #[test]
    fn test_booth_analytic() {
        let tf = booth();
        let hess_fn = |_: &[f64]| vec![vec![10.0, 8.0], vec![8.0, 10.0]];
        let r = newton(&tf.f, &tf.starting_point, Some(&tf.gradient), Some(&hess_fn), None);
        assert!(r.converged);
    }

    #[test]
    fn test_rosenbrock_analytic() {
        let tf = rosenbrock();
        let hess_fn = |x: &[f64]| {
            let h11 = 2.0 - 400.0 * x[1] + 1200.0 * x[0] * x[0];
            let h12 = -400.0 * x[0];
            let h22 = 200.0;
            vec![vec![h11, h12], vec![h12, h22]]
        };
        let r = newton(&tf.f, &tf.starting_point, Some(&tf.gradient), Some(&hess_fn), None);
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_sphere_fd_hessian() {
        let tf = sphere();
        let r = newton(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        assert!(r.converged);
    }

    #[test]
    fn test_at_minimum() {
        let tf = sphere();
        let r = newton(&tf.f, &[0.0, 0.0], Some(&tf.gradient), None, None);
        assert!(r.converged);
        assert_eq!(r.iterations, 0);
    }

    #[test]
    fn test_saddle_regularization() {
        let f = |x: &[f64]| x[0] * x[0] - x[1] * x[1];
        let g = |x: &[f64]| vec![2.0 * x[0], -2.0 * x[1]];
        let h = |_: &[f64]| vec![vec![2.0, 0.0], vec![0.0, -2.0]];
        let r = newton(&f, &[1.0, 1.0], Some(&g), Some(&h), None);
        // Should handle indefinite Hessian via regularization
        assert!(r.iterations > 0);
    }

    #[test]
    fn test_regularization_exhausted() {
        let f = |x: &[f64]| x[0] * x[0] - x[1] * x[1];
        let g = |x: &[f64]| vec![2.0 * x[0], -2.0 * x[1]];
        let h = |_: &[f64]| vec![vec![2.0, 0.0], vec![0.0, -2.0]];
        let opts = NewtonOptions {
            max_regularize: 0,
            ..Default::default()
        };
        let r = newton(&f, &[1.0, 1.0], Some(&g), Some(&h), Some(&opts));
        assert!(!r.converged);
        assert!(r.message.contains("regularization failed"));
    }

    #[test]
    fn test_1d() {
        let f = |x: &[f64]| (x[0] - 3.0).powi(2);
        let g = |x: &[f64]| vec![2.0 * (x[0] - 3.0)];
        let h = |_: &[f64]| vec![vec![2.0]];
        let r = newton(&f, &[0.0], Some(&g), Some(&h), None);
        assert!(r.converged);
        assert!(r.iterations <= 2);
    }
}
