/// L-BFGS: limited-memory BFGS with two-loop recursion.

use crate::finite_diff::forward_diff_gradient;
use crate::line_search::wolfe_line_search;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{dot, norm, sub};

fn two_loop_recursion(
    gx: &[f64],
    s_history: &[Vec<f64>],
    y_history: &[Vec<f64>],
    rho_history: &[f64],
    gamma: f64,
) -> Vec<f64> {
    let m = s_history.len();
    let n = gx.len();
    let mut q = gx.to_vec();
    let mut alphas = vec![0.0; m];

    // First loop: i = m-1 down to 0
    for i in (0..m).rev() {
        alphas[i] = rho_history[i] * dot(&s_history[i], &q);
        for j in 0..n {
            q[j] -= alphas[i] * y_history[i][j];
        }
    }

    // Scale: r = gamma * q
    let mut r: Vec<f64> = q.iter().map(|v| gamma * v).collect();

    // Second loop: i = 0 up to m-1
    for i in 0..m {
        let beta = rho_history[i] * dot(&y_history[i], &r);
        for j in 0..n {
            r[j] += (alphas[i] - beta) * s_history[i][j];
        }
    }

    r
}

pub fn lbfgs(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&OptimizeOptions>,
) -> OptimizeResult {
    lbfgs_with_memory(f, x0, grad, options, 10)
}

pub fn lbfgs_with_memory(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&OptimizeOptions>,
    memory: usize,
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

    let mut s_history: Vec<Vec<f64>> = Vec::new();
    let mut y_history: Vec<Vec<f64>> = Vec::new();
    let mut rho_history: Vec<f64> = Vec::new();
    let mut gamma = 1.0_f64;

    for iteration in 1..=opts.max_iterations {
        // Direction
        let d: Vec<f64> = if s_history.is_empty() {
            gx.iter().map(|g| -g).collect()
        } else {
            let hg = two_loop_recursion(&gx, &s_history, &y_history, &rho_history, gamma);
            hg.iter().map(|v| -v).collect()
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

        let s = sub(&x_new, &x);
        let y = sub(&g_new, &gx);
        let ys = dot(&s, &y);
        let step_norm = norm(&s);
        let func_change = (fx - ls.f_new).abs();

        x = x_new;
        fx = ls.f_new;
        gx = g_new;

        if ys > 1e-10 {
            if s_history.len() >= memory {
                s_history.remove(0);
                y_history.remove(0);
                rho_history.remove(0);
            }
            rho_history.push(1.0 / ys);
            s_history.push(s);
            y_history.push(y.clone());
            gamma = ys / dot(&y, &y);
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
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_booth() {
        let tf = booth();
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_beale() {
        let tf = beale();
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_himmelblau() {
        let tf = himmelblau();
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_goldstein_price() {
        let tf = goldstein_price();
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!((r.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_sphere_fd() {
        let tf = sphere();
        let r = lbfgs(&tf.f, &tf.starting_point, None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_at_minimum() {
        let tf = sphere();
        let r = lbfgs(&tf.f, &[0.0, 0.0], Some(&tf.gradient), None);
        assert!(r.converged);
        assert_eq!(r.iterations, 0);
    }

    #[test]
    fn test_max_iter() {
        let tf = rosenbrock();
        let opts = OptimizeOptions { max_iterations: 2, ..Default::default() };
        let r = lbfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), Some(&opts));
        assert!(!r.converged);
        assert!(r.message.contains("maximum iterations"));
    }

    #[test]
    fn test_custom_memory() {
        let tf = rosenbrock();
        let r = lbfgs_with_memory(&tf.f, &tf.starting_point, Some(&tf.gradient), None, 3);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }
}
