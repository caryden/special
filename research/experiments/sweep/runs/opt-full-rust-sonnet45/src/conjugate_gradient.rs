/// Nonlinear conjugate gradient with Hager-Zhang beta and line search.

use crate::finite_diff::forward_diff_gradient;
use crate::hager_zhang::hager_zhang_line_search;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{dot, norm, sub};

pub fn conjugate_gradient(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&OptimizeOptions>,
) -> OptimizeResult {
    conjugate_gradient_full(f, x0, grad, options, 0.4, None)
}

pub fn conjugate_gradient_full(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&OptimizeOptions>,
    eta: f64,
    restart_interval: Option<usize>,
) -> OptimizeResult {
    let defaults = OptimizeOptions::default();
    let opts = options.unwrap_or(&defaults);
    let n = x0.len();
    let restart_int = restart_interval.unwrap_or(n);

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
            message: "Converged: gradient norm below tolerance".to_string(),
        };
    }

    // Initial direction: steepest descent
    let mut d: Vec<f64> = gx.iter().map(|g| -g).collect();

    for iteration in 1..=opts.max_iterations {
        let ls = hager_zhang_line_search(f, &grad_fn, &x, &d, fx, &gx, None);
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
        let f_new = ls.f_new;
        let g_new = ls.g_new.unwrap_or_else(|| grad_fn(&x_new));

        let step_norm = norm(&sub(&x_new, &x));
        let func_change = (fx - f_new).abs();

        // Compute HZ beta
        let y: Vec<f64> = sub(&g_new, &gx);
        let d_dot_y = dot(&d, &y);

        let mut beta;
        if d_dot_y.abs() < 1e-30 {
            beta = 0.0; // restart
        } else {
            let y_dot_y = dot(&y, &y);
            let d_dot_g_new = dot(&d, &g_new);
            let y_dot_g_new = dot(&y, &g_new);
            let beta_hz = (y_dot_g_new - 2.0 * y_dot_y * d_dot_g_new / d_dot_y) / d_dot_y;

            // Eta guarantee
            let d_norm = norm(&d);
            let g_norm = norm(&gx);
            let eta_bound = -1.0 / (d_norm * eta.min(g_norm));
            beta = beta_hz.max(eta_bound);
        }

        x = x_new;
        fx = f_new;
        gx = g_new;

        // Update direction
        for i in 0..n {
            d[i] = -gx[i] + beta * d[i];
        }

        // Descent safety check
        if dot(&d, &gx) >= 0.0 {
            for i in 0..n {
                d[i] = -gx[i];
            }
        }

        // Periodic restart
        if iteration % restart_int == 0 {
            for i in 0..n {
                d[i] = -gx[i];
            }
        }

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
                message: "Converged: step size below tolerance".to_string(),
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
                message: "Converged: function change below tolerance".to_string(),
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
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-14);
    }

    #[test]
    fn test_booth() {
        let tf = booth();
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!((r.x[0] - 1.0).abs() < 1e-4);
        assert!((r.x[1] - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_beale() {
        let tf = beale();
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!((r.x[0] - 3.0).abs() < 1e-3);
    }

    #[test]
    fn test_himmelblau() {
        let tf = himmelblau();
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_goldstein_price() {
        let tf = goldstein_price();
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!((r.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_sphere_fd() {
        let tf = sphere();
        let r = conjugate_gradient(&tf.f, &tf.starting_point, None, None);
        assert!(r.converged);
    }

    #[test]
    fn test_at_minimum() {
        let tf = sphere();
        let r = conjugate_gradient(&tf.f, &[0.0, 0.0], Some(&tf.gradient), None);
        assert!(r.converged);
        assert_eq!(r.iterations, 0);
    }

    #[test]
    fn test_max_iter() {
        let tf = rosenbrock();
        let opts = OptimizeOptions { max_iterations: 2, ..Default::default() };
        let r = conjugate_gradient(&tf.f, &tf.starting_point, Some(&tf.gradient), Some(&opts));
        assert!(!r.converged);
        assert!(r.message.contains("maximum iterations"));
    }

    #[test]
    fn test_1d() {
        let f = |x: &[f64]| (x[0] - 3.0).powi(2);
        let g = |x: &[f64]| vec![2.0 * (x[0] - 3.0)];
        let r = conjugate_gradient(&f, &[0.0], Some(&g), None);
        assert!(r.converged);
        assert!((r.x[0] - 3.0).abs() < 1e-6);
    }

    #[test]
    fn test_5d_sphere() {
        let f = |x: &[f64]| x.iter().map(|v| v * v).sum::<f64>();
        let g = |x: &[f64]| x.iter().map(|v| 2.0 * v).collect();
        let r = conjugate_gradient(&f, &[1.0, 2.0, 3.0, 4.0, 5.0], Some(&g), None);
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }
}
