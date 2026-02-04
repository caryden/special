/// BFGS quasi-Newton optimizer with Strong Wolfe line search.

use crate::finite_diff::forward_diff_gradient;
use crate::line_search::wolfe_line_search;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{dot, norm, sub};

fn identity_matrix(n: usize) -> Vec<Vec<f64>> {
    let mut m = vec![vec![0.0; n]; n];
    for i in 0..n {
        m[i][i] = 1.0;
    }
    m
}

fn mat_vec_mul(m: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    m.iter().map(|row| dot(row, v)).collect()
}

fn bfgs_update(h: &mut Vec<Vec<f64>>, s: &[f64], y: &[f64], rho: f64) {
    let n = s.len();
    // H_{k+1} = (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
    // Compute H*y
    let hy = mat_vec_mul(h, y);

    // Compute (I - rho*y*s') = each row: h_row - rho * (h_row . y) * s
    // Actually use the full formula directly
    let mut h_new = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..n {
            let mut val = 0.0;
            for k in 0..n {
                let ik = if i == k { 1.0 } else { 0.0 } - rho * s[i] * y[k];
                for l in 0..n {
                    let lj = if l == j { 1.0 } else { 0.0 } - rho * y[l] * s[j];
                    val += ik * h[k][l] * lj;
                }
            }
            val += rho * s[i] * s[j];
            h_new[i][j] = val;
        }
    }
    *h = h_new;
}

pub fn bfgs(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<&OptimizeOptions>,
) -> OptimizeResult {
    let defaults = OptimizeOptions::default();
    let opts = options.unwrap_or(&defaults);
    let n = x0.len();

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
    let mut h = identity_matrix(n);

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
        // Direction: d = -H * g
        let hg = mat_vec_mul(&h, &gx);
        let d: Vec<f64> = hg.iter().map(|v| -v).collect();

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

        let s: Vec<f64> = sub(&x_new, &x);
        let y: Vec<f64> = sub(&g_new, &gx);
        let ys = dot(&s, &y);

        let step_norm = norm(&s);
        let func_change = (fx - ls.f_new).abs();

        x = x_new;
        fx = ls.f_new;
        gx = g_new;

        // BFGS update with curvature guard
        if ys > 1e-10 {
            let rho = 1.0 / ys;
            bfgs_update(&mut h, &s, &y, rho);
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
    fn test_sphere() {
        let tf = sphere();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
        assert!(r.iterations < 20);
    }

    #[test]
    fn test_booth() {
        let tf = booth();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_beale() {
        let tf = beale();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_himmelblau() {
        let tf = himmelblau();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!(r.fun < 1e-8);
    }

    #[test]
    fn test_goldstein_price() {
        let tf = goldstein_price();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.converged);
        assert!((r.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_sphere_fd() {
        let tf = sphere();
        let r = bfgs(&tf.f, &tf.starting_point, None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_at_minimum() {
        let tf = sphere();
        let r = bfgs(&tf.f, &[0.0, 0.0], Some(&tf.gradient), None);
        assert!(r.converged);
        assert_eq!(r.iterations, 0);
    }

    #[test]
    fn test_max_iter() {
        let tf = rosenbrock();
        let opts = OptimizeOptions {
            max_iterations: 3,
            ..Default::default()
        };
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), Some(&opts));
        assert!(r.iterations <= 3);
    }

    #[test]
    fn test_returns_gradient() {
        let tf = sphere();
        let r = bfgs(&tf.f, &tf.starting_point, Some(&tf.gradient), None);
        assert!(r.gradient.is_some());
    }
}
