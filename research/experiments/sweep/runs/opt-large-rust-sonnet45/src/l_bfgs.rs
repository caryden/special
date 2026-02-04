// l-bfgs — Limited-memory BFGS with two-loop recursion

use crate::finite_diff::forward_diff_gradient;
use crate::line_search::wolfe_line_search;
use crate::result_types::{check_convergence, OptimizeOptions, OptimizeResult};
use crate::vec_ops::{add_scaled, dot, norm, sub};

#[derive(Debug, Clone)]
pub struct LbfgsOptions {
    pub memory: usize,
    pub grad_tol: f64,
    pub step_tol: f64,
    pub func_tol: f64,
    pub max_iterations: usize,
}

impl Default for LbfgsOptions {
    fn default() -> Self {
        Self {
            memory: 10,
            grad_tol: 1e-8,
            step_tol: 1e-8,
            func_tol: 1e-12,
            max_iterations: 1000,
        }
    }
}

impl LbfgsOptions {
    pub fn to_optimize_options(&self) -> OptimizeOptions {
        OptimizeOptions {
            grad_tol: self.grad_tol,
            step_tol: self.step_tol,
            func_tol: self.func_tol,
            max_iterations: self.max_iterations,
        }
    }
}

pub fn lbfgs(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<LbfgsOptions>,
) -> OptimizeResult {
    let opts = options.unwrap_or_default();
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

    // History storage (circular buffer)
    let mut s_history: Vec<Vec<f64>> = Vec::new();
    let mut y_history: Vec<Vec<f64>> = Vec::new();
    let mut rho_history: Vec<f64> = Vec::new();
    let mut gamma = 1.0;

    for iter in 1..=opt_opts.max_iterations {
        // Compute search direction via two-loop recursion
        let d = if s_history.is_empty() {
            // First iteration: steepest descent
            gx.iter().map(|g| -g).collect()
        } else {
            two_loop_recursion(&gx, &s_history, &y_history, &rho_history, gamma)
        };

        // Line search
        let grad_fn = |x: &[f64]| compute_grad(x);
        let ls_result = wolfe_line_search(f, &grad_fn, &x, &d, fx, &gx, None, None, None, None);
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

        // Compute s, y
        let s = sub(&x_new, &x);
        let y = sub(&gx_new, &gx);
        let ys = dot(&y, &s);

        // Curvature guard
        if ys > 1e-10 {
            // Add to history (circular buffer)
            if s_history.len() >= opts.memory {
                s_history.remove(0);
                y_history.remove(0);
                rho_history.remove(0);
            }
            s_history.push(s);
            y_history.push(y.clone());
            rho_history.push(1.0 / ys);

            // Update gamma
            let yy = dot(&y, &y);
            gamma = ys / yy;
        }

        // Convergence check
        let func_change = (fx - fx_new).abs();
        let step_norm = norm(&sub(&x_new, &x));
        let grad_norm = norm(&gx_new);

        x = x_new;
        fx = fx_new;
        gx = gx_new;

        if let Some(reason) = check_convergence(grad_norm, step_norm, func_change, iter, &opt_opts)
        {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iter,
                function_calls,
                gradient_calls,
                converged: reason.is_converged(),
                message: reason.message(),
            };
        }
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

fn two_loop_recursion(
    g: &[f64],
    s_history: &[Vec<f64>],
    y_history: &[Vec<f64>],
    rho_history: &[f64],
    gamma: f64,
) -> Vec<f64> {
    let m = s_history.len();
    let mut q = g.to_vec();
    let mut alpha = vec![0.0; m];

    // First loop (backward)
    for i in (0..m).rev() {
        alpha[i] = rho_history[i] * dot(&s_history[i], &q);
        q = sub(&q, &y_history[i].iter().map(|yi| alpha[i] * yi).collect::<Vec<_>>());
    }

    // Scale
    let mut r: Vec<f64> = q.iter().map(|qi| gamma * qi).collect();

    // Second loop (forward)
    for i in 0..m {
        let beta = rho_history[i] * dot(&y_history[i], &r);
        r = add_scaled(&r, &s_history[i], alpha[i] - beta);
    }

    // Return -H*g (descent direction)
    r.iter().map(|ri| -ri).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_lbfgs_sphere() {
        let x0 = vec![5.0, 5.0];
        let result = lbfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        assert!((result.x[0]).abs() < 1e-4);
        assert!((result.x[1]).abs() < 1e-4);
    }

    #[test]
    fn test_lbfgs_booth() {
        let x0 = vec![0.0, 0.0];
        let result = lbfgs(&booth, &x0, Some(&booth_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        assert!((result.x[0] - 1.0).abs() < 1e-4);
        assert!((result.x[1] - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_lbfgs_rosenbrock() {
        let x0 = vec![-1.2, 1.0];
        let result = lbfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-10);
        assert!((result.x[0] - 1.0).abs() < 1e-4);
        assert!((result.x[1] - 1.0).abs() < 1e-4);
    }

    #[test]
    fn test_lbfgs_beale() {
        let x0 = vec![0.0, 0.0];
        let result = lbfgs(&beale, &x0, Some(&beale_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
    }

    #[test]
    fn test_lbfgs_himmelblau() {
        let x0 = vec![0.0, 0.0];
        let result = lbfgs(&himmelblau, &x0, Some(&himmelblau_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
    }

    #[test]
    fn test_lbfgs_goldstein_price() {
        let x0 = vec![-0.1, -0.9]; // Use the specified starting point
        let result = lbfgs(&goldstein_price, &x0, Some(&goldstein_price_grad), None);
        assert!(result.converged);
        assert!((result.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_lbfgs_finite_diff() {
        let x0 = vec![5.0, 5.0];
        let result = lbfgs(&sphere, &x0, None, None);
        assert!(result.converged);
        assert!(result.fun < 1e-6);
    }

    #[test]
    fn test_lbfgs_custom_memory() {
        let x0 = vec![-1.2, 1.0];
        let opts = LbfgsOptions {
            memory: 3,
            ..Default::default()
        };
        let result = lbfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(result.converged);
        assert!(result.fun < 1e-6);
    }

    #[test]
    fn test_lbfgs_already_at_minimum() {
        let x0 = vec![0.0, 0.0];
        let result = lbfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert_eq!(result.iterations, 0);
    }

    #[test]
    fn test_lbfgs_max_iterations() {
        let x0 = vec![-1.2, 1.0];
        let opts = LbfgsOptions {
            max_iterations: 2,
            ..Default::default()
        };
        let result = lbfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(!result.converged);
        assert!(result.message.contains("maximum iterations"));
    }
}
