// bfgs: BFGS quasi-Newton optimizer

use crate::finite_diff::forward_diff_gradient;
use crate::line_search::{wolfe_line_search, WolfeOptions};
use crate::result_types::{
    check_convergence, ConvergenceReason, OptimizeOptions, OptimizeResult,
};
use crate::vec_ops::{add_scaled, clone_vec, dot, norm_inf, scale, sub};

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
    let mut h_new = vec![vec![0.0; n]; n];

    // Efficient formulation from Nocedal & Wright Eq. 6.17
    // H_{k+1} = H - rho*(s*Hy' + Hy*s') + rho*(1 + rho*y'Hy)*s*s'
    let hy = mat_vec_mul(h, y);
    let y_h_y = dot(y, &hy);

    for i in 0..n {
        for j in 0..n {
            h_new[i][j] = h[i][j]
                - rho * (s[i] * hy[j] + hy[i] * s[j])
                + rho * (1.0 + rho * y_h_y) * s[i] * s[j];
        }
    }

    h_new
}

pub fn bfgs(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    options: Option<OptimizeOptions>,
) -> OptimizeResult {
    let opts = options.unwrap_or_default();
    let n = x0.len();

    let mut x = clone_vec(x0);
    let mut h = identity_matrix(n);

    let mut fx = f(&x);
    let mut function_calls = 1;
    let mut gradient_calls = 0;

    // Use provided gradient or finite differences
    let compute_grad: Box<dyn Fn(&[f64]) -> Vec<f64>> = if let Some(g) = grad {
        Box::new(|p| g(p))
    } else {
        Box::new(|p| forward_diff_gradient(f, p))
    };

    let mut gx = compute_grad(&x);
    gradient_calls += 1;

    let mut grad_norm = norm_inf(&gx);

    // Check if already at minimum
    if grad_norm < opts.grad_tol {
        return OptimizeResult {
            x,
            fun: fx,
            gradient: Some(gx),
            iterations: 0,
            function_calls,
            gradient_calls,
            converged: true,
            message: ConvergenceReason::Gradient { grad_norm }.message(),
        };
    }

    for iteration in 1..=opts.max_iterations {
        // Compute search direction: d = -H * g
        let d = scale(&mat_vec_mul(&h, &gx), -1.0);

        // Wolfe line search
        let ls_result = wolfe_line_search(
            f,
            &|p| compute_grad(p),
            &x,
            &d,
            fx,
            &gx,
            Some(WolfeOptions::default()),
        );

        function_calls += ls_result.function_calls;
        gradient_calls += ls_result.gradient_calls;

        if !ls_result.success {
            return OptimizeResult {
                x,
                fun: fx,
                gradient: Some(gx),
                iterations: iteration - 1,
                function_calls,
                gradient_calls,
                converged: false,
                message: ConvergenceReason::LineSearchFailed {
                    message: "Wolfe conditions not satisfied".to_string(),
                }
                .message(),
            };
        }

        // Update position
        let x_new = add_scaled(&x, &d, ls_result.alpha);
        let fx_new = ls_result.f_new;
        let gx_new = ls_result.g_new.expect("Wolfe should return gradient");

        // Compute step and gradient change
        let s = sub(&x_new, &x);
        let y = sub(&gx_new, &gx);

        let step_norm = norm_inf(&s);
        let func_change = (fx - fx_new).abs();
        grad_norm = norm_inf(&gx_new);

        // Check convergence
        if let Some(reason) = check_convergence(grad_norm, step_norm, func_change, iteration, &opts)
        {
            return OptimizeResult {
                x: x_new,
                fun: fx_new,
                gradient: Some(gx_new),
                iterations: iteration,
                function_calls,
                gradient_calls,
                converged: reason.is_converged(),
                message: reason.message(),
            };
        }

        // Curvature guard
        let ys = dot(&y, &s);
        if ys > 1e-10 {
            let rho = 1.0 / ys;
            h = bfgs_update(&h, &s, &y, rho);
        }

        // Prepare for next iteration
        x = x_new;
        fx = fx_new;
        gx = gx_new;
    }

    // Should not reach here due to max_iterations check in convergence
    OptimizeResult {
        x,
        fun: fx,
        gradient: Some(gx),
        iterations: opts.max_iterations,
        function_calls,
        gradient_calls,
        converged: false,
        message: ConvergenceReason::MaxIterations {
            iterations: opts.max_iterations,
        }
        .message(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::result_types::OptimizeOptions;

    fn sphere(x: &[f64]) -> f64 {
        x.iter().map(|v| v * v).sum()
    }

    fn sphere_grad(x: &[f64]) -> Vec<f64> {
        x.iter().map(|v| 2.0 * v).collect()
    }

    fn booth(x: &[f64]) -> f64 {
        let t1 = x[0] + 2.0 * x[1] - 7.0;
        let t2 = 2.0 * x[0] + x[1] - 5.0;
        t1 * t1 + t2 * t2
    }

    fn booth_grad(x: &[f64]) -> Vec<f64> {
        let t1 = x[0] + 2.0 * x[1] - 7.0;
        let t2 = 2.0 * x[0] + x[1] - 5.0;
        vec![2.0 * t1 + 4.0 * t2, 4.0 * t1 + 2.0 * t2]
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let a = 1.0 - x[0];
        let b = x[1] - x[0] * x[0];
        a * a + 100.0 * b * b
    }

    fn rosenbrock_grad(x: &[f64]) -> Vec<f64> {
        let a = 1.0 - x[0];
        let b = x[1] - x[0] * x[0];
        vec![-2.0 * a - 400.0 * x[0] * b, 200.0 * b]
    }

    fn beale(x: &[f64]) -> f64 {
        let t1 = 1.5 - x[0] + x[0] * x[1];
        let t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
        let t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
        t1 * t1 + t2 * t2 + t3 * t3
    }

    fn beale_grad(x: &[f64]) -> Vec<f64> {
        let t1 = 1.5 - x[0] + x[0] * x[1];
        let t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
        let t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
        let dt1_dx = -1.0 + x[1];
        let dt1_dy = x[0];
        let dt2_dx = -1.0 + x[1] * x[1];
        let dt2_dy = 2.0 * x[0] * x[1];
        let dt3_dx = -1.0 + x[1] * x[1] * x[1];
        let dt3_dy = 3.0 * x[0] * x[1] * x[1];
        vec![
            2.0 * t1 * dt1_dx + 2.0 * t2 * dt2_dx + 2.0 * t3 * dt3_dx,
            2.0 * t1 * dt1_dy + 2.0 * t2 * dt2_dy + 2.0 * t3 * dt3_dy,
        ]
    }

    fn himmelblau(x: &[f64]) -> f64 {
        let t1 = x[0] * x[0] + x[1] - 11.0;
        let t2 = x[0] + x[1] * x[1] - 7.0;
        t1 * t1 + t2 * t2
    }

    fn himmelblau_grad(x: &[f64]) -> Vec<f64> {
        let t1 = x[0] * x[0] + x[1] - 11.0;
        let t2 = x[0] + x[1] * x[1] - 7.0;
        vec![
            4.0 * x[0] * t1 + 2.0 * t2,
            2.0 * t1 + 4.0 * x[1] * t2,
        ]
    }

    fn goldstein_price(x: &[f64]) -> f64 {
        let a = x[0] + x[1] + 1.0;
        let b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1]
            + 3.0 * x[1] * x[1];
        let c = 2.0 * x[0] - 3.0 * x[1];
        let d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1]
            + 27.0 * x[1] * x[1];
        (1.0 + a * a * b) * (30.0 + c * c * d)
    }

    fn goldstein_price_grad(x: &[f64]) -> Vec<f64> {
        let a = x[0] + x[1] + 1.0;
        let b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1]
            + 3.0 * x[1] * x[1];
        let c = 2.0 * x[0] - 3.0 * x[1];
        let d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1]
            + 27.0 * x[1] * x[1];

        let da_dx = 1.0;
        let da_dy = 1.0;
        let db_dx = -14.0 + 6.0 * x[0] + 6.0 * x[1];
        let db_dy = -14.0 + 6.0 * x[0] + 6.0 * x[1];
        let dc_dx = 2.0;
        let dc_dy = -3.0;
        let dd_dx = -32.0 + 24.0 * x[0] - 36.0 * x[1];
        let dd_dy = 48.0 - 36.0 * x[0] + 54.0 * x[1];

        let term1 = 1.0 + a * a * b;
        let term2 = 30.0 + c * c * d;

        let dterm1_dx = 2.0 * a * da_dx * b + a * a * db_dx;
        let dterm1_dy = 2.0 * a * da_dy * b + a * a * db_dy;
        let dterm2_dx = 2.0 * c * dc_dx * d + c * c * dd_dx;
        let dterm2_dy = 2.0 * c * dc_dy * d + c * c * dd_dy;

        vec![
            dterm1_dx * term2 + term1 * dterm2_dx,
            dterm1_dy * term2 + term1 * dterm2_dy,
        ]
    }

    #[test]
    fn test_bfgs_sphere() {
        let x0 = vec![5.0, 5.0];
        let result = bfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        assert!((result.x[0] - 0.0).abs() < 1e-4);
        assert!((result.x[1] - 0.0).abs() < 1e-4);
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
    fn test_bfgs_sphere_finite_diff() {
        let x0 = vec![5.0, 5.0];
        let result = bfgs(&sphere, &x0, None, None);
        assert!(result.converged);
        assert!(result.fun < 1e-6);
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
        assert!((result.x[0] - 3.0).abs() < 1e-3);
        assert!((result.x[1] - 0.5).abs() < 1e-3);
    }

    #[test]
    fn test_bfgs_himmelblau() {
        let x0 = vec![0.0, 0.0];
        let result = bfgs(&himmelblau, &x0, Some(&himmelblau_grad), None);
        assert!(result.converged);
        assert!(result.fun < 1e-8);
        // Himmelblau has 4 minima, check we're close to one of them
        let dist1 = ((result.x[0] - 3.0).powi(2) + (result.x[1] - 2.0).powi(2)).sqrt();
        let dist2 = ((result.x[0] + 2.805118).powi(2) + (result.x[1] - 3.131312).powi(2)).sqrt();
        let dist3 = ((result.x[0] + 3.779310).powi(2) + (result.x[1] + 3.283186).powi(2)).sqrt();
        let dist4 = ((result.x[0] - 3.584428).powi(2) + (result.x[1] + 1.848126).powi(2)).sqrt();
        let min_dist = dist1.min(dist2).min(dist3).min(dist4);
        assert!(min_dist < 0.1);
    }

    #[test]
    fn test_bfgs_goldstein_price() {
        let x0 = vec![0.0, -0.5];
        let result = bfgs(&goldstein_price, &x0, Some(&goldstein_price_grad), None);
        assert!(result.converged);
        assert!((result.fun - 3.0).abs() < 1e-4);
        assert!((result.x[0] - 0.0).abs() < 1e-2);
        assert!((result.x[1] - (-1.0)).abs() < 1e-2);
    }

    #[test]
    fn test_bfgs_rosenbrock_finite_diff() {
        let x0 = vec![-1.2, 1.0];
        let result = bfgs(&rosenbrock, &x0, None, None);
        // May not formally converge due to FD noise
        assert!(result.fun < 1e-6);
        assert!((result.x[0] - 1.0).abs() < 1e-2);
        assert!((result.x[1] - 1.0).abs() < 1e-2);
    }

    #[test]
    fn test_bfgs_returns_gradient() {
        let x0 = vec![5.0, 5.0];
        let result = bfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.gradient.is_some());
        let grad = result.gradient.unwrap();
        assert!(grad[0].abs() < 1e-4);
        assert!(grad[1].abs() < 1e-4);
    }

    #[test]
    fn test_bfgs_max_iterations() {
        let x0 = vec![-1.2, 1.0];
        let opts = OptimizeOptions::with_overrides(None, None, None, Some(3));
        let result = bfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(result.iterations <= 3);
    }

    #[test]
    fn test_bfgs_already_at_minimum() {
        let x0 = vec![0.0, 0.0];
        let result = bfgs(&sphere, &x0, Some(&sphere_grad), None);
        assert!(result.converged);
        assert_eq!(result.iterations, 0);
    }

    #[test]
    fn test_bfgs_impossible_tolerance() {
        let x0 = vec![-1.2, 1.0];
        let opts = OptimizeOptions::with_overrides(None, None, None, Some(2));
        let result = bfgs(&rosenbrock, &x0, Some(&rosenbrock_grad), Some(opts));
        assert!(!result.converged);
        assert!(result.message.contains("Maximum iterations") || result.message.contains("maximum iterations"));
    }
}
