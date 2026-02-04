// bfgs — Full-memory BFGS quasi-Newton optimizer

use crate::finite_diff::forward_diff_gradient;
use crate::line_search::wolfe_line_search;
use crate::result_types::{check_convergence, OptimizeOptions, OptimizeResult};
use crate::vec_ops::{add_scaled, dot, norm, sub};

pub fn bfgs(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<OptimizeOptions>,
) -> OptimizeResult {
    let opts = options.unwrap_or_default();

    let n = x0.len();
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

    // Initialize inverse Hessian approximation as identity
    let mut h = identity_matrix(n);

    for iter in 1..=opts.max_iterations {
        // Compute search direction: d = -H*g
        let d = mat_vec_mul(&h, &gx).iter().map(|di| -di).collect::<Vec<_>>();

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
            let rho = 1.0 / ys;
            h = bfgs_update(&h, &s, &y, rho);
        }

        // Convergence check
        let func_change = (fx - fx_new).abs();
        let step_norm = norm(&sub(&x_new, &x));
        let grad_norm = norm(&gx_new);

        x = x_new;
        fx = fx_new;
        gx = gx_new;

        if let Some(reason) = check_convergence(grad_norm, step_norm, func_change, iter, &opts) {
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
        iterations: opts.max_iterations,
        function_calls,
        gradient_calls,
        converged: false,
        message: "Maximum iterations reached".to_string(),
    }
}

fn identity_matrix(n: usize) -> Vec<Vec<f64>> {
    let mut mat = vec![vec![0.0; n]; n];
    for i in 0..n {
        mat[i][i] = 1.0;
    }
    mat
}

fn mat_vec_mul(m: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    m.iter().map(|row| dot(row, v)).collect()
}

fn bfgs_update(h: &[Vec<f64>], s: &[f64], y: &[f64], rho: f64) -> Vec<Vec<f64>> {
    let n = h.len();

    // Compute I - rho*s*y^T
    let mut i_minus_rho_sy = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..n {
            i_minus_rho_sy[i][j] = if i == j { 1.0 } else { 0.0 } - rho * s[i] * y[j];
        }
    }

    // Compute (I - rho*s*y^T) * H
    let mut temp = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..n {
            for k in 0..n {
                temp[i][j] += i_minus_rho_sy[i][k] * h[k][j];
            }
        }
    }

    // Compute temp * (I - rho*y*s^T)
    let mut h_new = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..n {
            for k in 0..n {
                let i_minus_rho_ys_kj = if k == j { 1.0 } else { 0.0 } - rho * y[k] * s[j];
                h_new[i][j] += temp[i][k] * i_minus_rho_ys_kj;
            }
        }
    }

    // Add rho*s*s^T
    for i in 0..n {
        for j in 0..n {
            h_new[i][j] += rho * s[i] * s[j];
        }
    }

    h_new
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_bfgs_sphere() {
        let x0 = vec![5.0, 5.0];
        let result = bfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        assert!((result.x[0]).abs() < 1e-4);
        assert!((result.x[1]).abs() < 1e-4);
        assert!(result.iterations < 20);
    }

    #[test]
    fn test_bfgs_booth() {
        let x0 = vec![0.0, 0.0];
        let result = bfgs(&booth, &x0, Some(&booth_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        assert!((result.x[0] - 1.0).abs() < 1e-4);
        assert!((result.x[1] - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_bfgs_rosenbrock() {
        let x0 = vec![-1.2, 1.0];
        let result = bfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-10);
        assert!((result.x[0] - 1.0).abs() < 1e-4);
        assert!((result.x[1] - 1.0).abs() < 1e-4);
    }

    #[test]
    fn test_bfgs_beale() {
        let x0 = vec![0.0, 0.0];
        let result = bfgs(&beale, &x0, Some(&beale_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
    }

    #[test]
    fn test_bfgs_himmelblau() {
        let x0 = vec![0.0, 0.0];
        let result = bfgs(&himmelblau, &x0, Some(&himmelblau_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
    }

    #[test]
    fn test_bfgs_goldstein_price() {
        let x0 = vec![-0.1, -0.9]; // Use the specified starting point
        let result = bfgs(&goldstein_price, &x0, Some(&goldstein_price_grad), None);
        assert!(result.converged);
        assert!((result.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_bfgs_finite_diff() {
        let x0 = vec![5.0, 5.0];
        let result = bfgs(&sphere, &x0, None, None);
        assert!(result.converged);
        assert!(result.fun < 1e-6);
    }

    #[test]
    fn test_bfgs_already_at_minimum() {
        let x0 = vec![0.0, 0.0];
        let result = bfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert_eq!(result.iterations, 0);
    }

    #[test]
    fn test_bfgs_max_iterations() {
        let x0 = vec![-1.2, 1.0];
        let opts = OptimizeOptions {
            max_iterations: 3,
            ..Default::default()
        };
        let result = bfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(result.iterations <= 3);
    }

    #[test]
    fn test_bfgs_returns_gradient() {
        let x0 = vec![5.0, 5.0];
        let result = bfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.gradient.is_some());
        let grad = result.gradient.unwrap();
        assert!(grad.iter().all(|g| g.abs() < 1e-6));
    }
}
