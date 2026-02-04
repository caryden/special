/// Steepest descent with backtracking line search.

use crate::finite_diff::forward_diff_gradient;
use crate::line_search::backtracking_line_search;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{negate, norm, sub};

pub fn gradient_descent(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&OptimizeOptions>,
) -> OptimizeResult {
    let defaults = OptimizeOptions::default();
    let opts = options.unwrap_or(&defaults);

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

    let grad_norm = norm(&gx);
    if grad_norm < opts.grad_tol {
        return OptimizeResult {
            x,
            fun: fx,
            gradient: Some(gx),
            iterations: 0,
            function_calls,
            gradient_calls,
            converged: true,
            message: format!("Converged: gradient norm {:.2e} below tolerance", grad_norm),
        };
    }

    for iteration in 1..=opts.max_iterations {
        let d = negate(&gx);

        let ls = backtracking_line_search(f, &x, &d, fx, &gx, None);
        function_calls += ls.function_calls;

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
        let f_new = ls.f_new;
        let step_norm = norm(&sub(&x_new, &x));
        let func_change = (fx - f_new).abs();

        x = x_new;
        fx = f_new;
        gx = grad_fn(&x);
        gradient_calls += 1;

        let grad_norm = norm(&gx);
        if grad_norm < opts.grad_tol {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iteration,
                function_calls,
                gradient_calls,
                converged: true,
                message: format!("Converged: gradient norm {:.2e} below tolerance", grad_norm),
            };
        }
        if step_norm < opts.step_tol {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iteration,
                function_calls,
                gradient_calls,
                converged: true,
                message: format!("Converged: step size {:.2e} below tolerance", step_norm),
            };
        }
        if func_change < opts.func_tol {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iteration,
                function_calls,
                gradient_calls,
                converged: true,
                message: format!("Converged: function change {:.2e} below tolerance", func_change),
            };
        }
    }

    OptimizeResult {
        x,
        fun: fx,
        gradient: Some(gx),
        iterations: opts.max_iterations,
        function_calls,
        gradient_calls,
        converged: false,
        message: format!(
            "Stopped: reached maximum iterations ({})",
            opts.max_iterations
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_sphere_analytic() {
        let tf = sphere();
        let r = gradient_descent(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_booth_analytic() {
        let tf = booth();
        let r = gradient_descent(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_sphere_fd() {
        let tf = sphere();
        let r = gradient_descent(&tf.f, &tf.starting_point, None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_at_minimum() {
        let tf = sphere();
        let r = gradient_descent(&tf.f, &[0.0, 0.0], Some(&tf.gradient), None);
        assert!(r.converged);
        assert_eq!(r.iterations, 0);
    }

    #[test]
    fn test_max_iter() {
        let tf = rosenbrock();
        let opts = OptimizeOptions {
            max_iterations: 2,
            ..Default::default()
        };
        let r = gradient_descent(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(&opts),
        );
        assert!(!r.converged);
        assert!(r.message.contains("maximum iterations"));
    }

    #[test]
    fn test_wrong_gradient() {
        let tf = sphere();
        // Gradient that points uphill
        let wrong_grad = |x: &[f64]| vec![-2.0 * x[0], -2.0 * x[1]]; // negated = uphill
        let r = gradient_descent(&tf.f, &tf.starting_point, Some(&wrong_grad), None);
        // With ascending direction, backtracking should fail
        assert!(!r.converged);
        assert!(r.message.contains("line search failed"));
    }
}
