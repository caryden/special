// conjugate-gradient — Nonlinear CG with Hager-Zhang beta and line search

use crate::finite_diff::forward_diff_gradient;
use crate::hager_zhang::hager_zhang_line_search;
use crate::result_types::{check_convergence, OptimizeOptions, OptimizeResult};
use crate::vec_ops::{add_scaled, dot, norm, sub};

#[derive(Debug, Clone)]
pub struct ConjugateGradientOptions {
    pub eta: f64,
    pub restart_interval: Option<usize>,
    pub grad_tol: f64,
    pub step_tol: f64,
    pub func_tol: f64,
    pub max_iterations: usize,
}

impl Default for ConjugateGradientOptions {
    fn default() -> Self {
        Self {
            eta: 0.4,
            restart_interval: None, // Will be set to dimension n
            grad_tol: 1e-8,
            step_tol: 1e-8,
            func_tol: 1e-12,
            max_iterations: 1000,
        }
    }
}

impl ConjugateGradientOptions {
    pub fn to_optimize_options(&self) -> OptimizeOptions {
        OptimizeOptions {
            grad_tol: self.grad_tol,
            step_tol: self.step_tol,
            func_tol: self.func_tol,
            max_iterations: self.max_iterations,
        }
    }
}

pub fn conjugate_gradient(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<ConjugateGradientOptions>,
) -> OptimizeResult {
    let mut opts = options.unwrap_or_default();
    let n = x0.len();

    // Set restart interval to dimension if not specified
    if opts.restart_interval.is_none() {
        opts.restart_interval = Some(n);
    }
    let restart_interval = opts.restart_interval.unwrap();

    let opt_opts = opts.to_optimize_options();

    let mut x = x0.to_vec();
    let mut fx = f(&x);
    let mut function_calls = 1;
    let mut gradient_calls = 0;

    // Gradient function
    let compute_grad: Box<dyn Fn(&[f64]) -> Vec<f64>> = if let Some(g) = grad {
        Box::new(|x| g(x))
    } else {
        Box::new(|x| forward_diff_gradient(f, x))
    };

    let mut gx = compute_grad(&x);
    gradient_calls += 1;

    // Check if already at minimum
    let grad_norm = norm(&gx);
    if grad_norm < opt_opts.grad_tol {
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

    // Initial direction: steepest descent
    let mut d: Vec<f64> = gx.iter().map(|g| -g).collect();

    for iter in 1..=opt_opts.max_iterations {
        // Hager-Zhang line search
        let grad_fn = |x: &[f64]| compute_grad(x);
        let ls_result = hager_zhang_line_search(f, &grad_fn, &x, &d, fx, &gx, None);
        function_calls += ls_result.function_calls;
        gradient_calls += ls_result.gradient_calls;

        if !ls_result.success {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iter,
                function_calls,
                gradient_calls,
                converged: false,
                message: "Line search failed".to_string(),
            };
        }

        let x_new = add_scaled(&x, &d, ls_result.alpha);
        let fx_new = ls_result.f_new;
        let gx_new = ls_result.g_new.unwrap_or_else(|| compute_grad(&x_new));

        // Convergence check
        let func_change = (fx - fx_new).abs();
        let step_norm = norm(&sub(&x_new, &x));
        let grad_norm_new = norm(&gx_new);

        // Check convergence before updating direction
        if let Some(reason) =
            check_convergence(grad_norm_new, step_norm, func_change, iter, &opt_opts)
        {
            return OptimizeResult {
                x: x_new,
                fun: fx_new,
                gradient: Some(gx_new),
                iterations: iter,
                function_calls,
                gradient_calls,
                converged: reason.is_converged(),
                message: reason.message(),
            };
        }

        // Compute HZ beta
        let y = sub(&gx_new, &gx);
        let d_dot_y = dot(&d, &y);

        let beta = if d_dot_y.abs() < 1e-30 {
            // Avoid division by zero, restart
            0.0
        } else {
            let y_dot_gnew = dot(&y, &gx_new);
            let y_norm_sq = dot(&y, &y);
            let d_dot_gnew = dot(&d, &gx_new);
            (y_dot_gnew - 2.0 * y_norm_sq * d_dot_gnew / d_dot_y) / d_dot_y
        };

        // Apply eta guarantee
        let d_norm = norm(&d);
        let g_norm = norm(&gx);
        let eta_lower = -1.0 / (d_norm * opts.eta.min(g_norm));
        let beta = beta.max(eta_lower);

        // Update direction: d = -g_new + beta * d
        for i in 0..n {
            d[i] = -gx_new[i] + beta * d[i];
        }

        // Descent safety check
        if dot(&d, &gx_new) >= 0.0 {
            // Not a descent direction, restart
            d = gx_new.iter().map(|g| -g).collect();
        }

        // Periodic restart
        if iter % restart_interval == 0 {
            d = gx_new.iter().map(|g| -g).collect();
        }

        x = x_new;
        fx = fx_new;
        gx = gx_new;
    }

    OptimizeResult {
        x,
        fun: fx,
        gradient: Some(gx),
        iterations: opt_opts.max_iterations,
        function_calls,
        gradient_calls,
        converged: false,
        message: "Maximum iterations reached".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_cg_sphere() {
        let x0 = vec![5.0, 5.0];
        let result = conjugate_gradient(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-14);
    }

    #[test]
    fn test_cg_booth() {
        let x0 = vec![0.0, 0.0];
        let result = conjugate_gradient(&booth, &x0, Some(&booth_grad), None);
        assert!(result.converged);
        assert!((result.x[0] - 1.0).abs() < 1e-4);
        assert!((result.x[1] - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_cg_rosenbrock() {
        let x0 = vec![-1.2, 1.0];
        let result = conjugate_gradient(&rosenbrock, &x0, Some(&rosenbrock_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
    }

    #[test]
    fn test_cg_beale() {
        let x0 = vec![0.0, 0.0];
        let result = conjugate_gradient(&beale, &x0, Some(&beale_grad), None);
        assert!(result.converged);
        assert!((result.x[0] - 3.0).abs() < 1e-3);
        assert!((result.x[1] - 0.5).abs() < 1e-3);
    }

    #[test]
    fn test_cg_himmelblau() {
        let x0 = vec![0.0, 0.0];
        let result = conjugate_gradient(&himmelblau, &x0, Some(&himmelblau_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-10);
    }

    #[test]
    fn test_cg_goldstein_price() {
        let x0 = vec![-0.1, -0.9]; // Use the specified starting point
        let result = conjugate_gradient(&goldstein_price, &x0, Some(&goldstein_price_grad), None);
        assert!(result.converged);
        assert!((result.fun - 3.0).abs() < 1e-3);
    }

    #[test]
    fn test_cg_finite_diff() {
        let x0 = vec![5.0, 5.0];
        let result = conjugate_gradient(&sphere, &x0, None, None);
        assert!(result.converged);
    }

    #[test]
    fn test_cg_already_at_minimum() {
        let x0 = vec![0.0, 0.0];
        let result = conjugate_gradient(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert_eq!(result.iterations, 0);
    }

    #[test]
    fn test_cg_1d() {
        let f = |x: &[f64]| x[0] * x[0];
        let grad = |x: &[f64]| vec![2.0 * x[0]];
        let x0 = vec![5.0];
        let result = conjugate_gradient(&f, &x0, Some(&grad), None);
        assert!(result.converged);
    }

    #[test]
    fn test_cg_5d_sphere() {
        let f = |x: &[f64]| x.iter().map(|xi| xi * xi).sum();
        let grad = |x: &[f64]| x.iter().map(|xi| 2.0 * xi).collect();
        let x0 = vec![5.0, 5.0, 5.0, 5.0, 5.0];
        let result = conjugate_gradient(&f, &x0, Some(&grad), None);
        assert!(result.converged);
    }

    #[test]
    fn test_cg_max_iterations() {
        let x0 = vec![-1.2, 1.0];
        let opts = ConjugateGradientOptions {
            max_iterations: 5,
            ..Default::default()
        };
        let result = conjugate_gradient(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(!result.converged);
    }

    #[test]
    fn test_cg_max_iterations_message() {
        let x0 = vec![-1.2, 1.0];
        let opts = ConjugateGradientOptions {
            max_iterations: 2,
            ..Default::default()
        };
        let result = conjugate_gradient(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(result.message.contains("maximum iterations"));
    }
}
