// line-search — Backtracking (Armijo) and Strong Wolfe line search

use crate::vec_ops::{add_scaled, dot};

#[derive(Debug, Clone)]
pub struct LineSearchResult {
    pub alpha: f64,
    pub f_new: f64,
    pub g_new: Option<Vec<f64>>,
    pub function_calls: usize,
    pub gradient_calls: usize,
    pub success: bool,
}

/// Backtracking line search (Armijo condition)
pub fn backtracking_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    initial_alpha: Option<f64>,
    c1: Option<f64>,
    rho: Option<f64>,
    max_iter: Option<usize>,
) -> LineSearchResult {
    let mut alpha = initial_alpha.unwrap_or(1.0);
    let c1 = c1.unwrap_or(1e-4);
    let rho = rho.unwrap_or(0.5);
    let max_iter = max_iter.unwrap_or(20);

    let slope = dot(gx, d);
    let mut function_calls = 0;

    for _ in 0..max_iter {
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        function_calls += 1;

        // Armijo condition
        if f_new <= fx + c1 * alpha * slope {
            return LineSearchResult {
                alpha,
                f_new,
                g_new: None,
                function_calls,
                gradient_calls: 0,
                success: true,
            };
        }

        alpha *= rho;
    }

    // Failed to find acceptable step
    LineSearchResult {
        alpha,
        f_new: fx,
        g_new: None,
        function_calls,
        gradient_calls: 0,
        success: false,
    }
}

/// Strong Wolfe line search (bracket and zoom)
pub fn wolfe_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    c1: Option<f64>,
    c2: Option<f64>,
    alpha_max: Option<f64>,
    max_iter: Option<usize>,
) -> LineSearchResult {
    let c1 = c1.unwrap_or(1e-4);
    let c2 = c2.unwrap_or(0.9);
    let alpha_max = alpha_max.unwrap_or(1e6);
    let max_iter = max_iter.unwrap_or(25);

    let slope0 = dot(gx, d);
    let mut function_calls = 0;
    let mut gradient_calls = 0;

    let mut alpha_prev = 0.0;
    let mut f_prev = fx;
    let mut alpha = 1.0;

    for i in 0..max_iter {
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        function_calls += 1;

        // Check Armijo condition and non-monotonicity
        if f_new > fx + c1 * alpha * slope0 || (i > 0 && f_new >= f_prev) {
            return zoom(
                f,
                grad,
                x,
                d,
                fx,
                slope0,
                alpha_prev,
                alpha,
                f_prev,
                f_new,
                c1,
                c2,
                &mut function_calls,
                &mut gradient_calls,
            );
        }

        let g_new = grad(&x_new);
        gradient_calls += 1;
        let slope_new = dot(&g_new, d);

        // Check curvature condition
        if slope_new.abs() <= -c2 * slope0 {
            return LineSearchResult {
                alpha,
                f_new,
                g_new: Some(g_new),
                function_calls,
                gradient_calls,
                success: true,
            };
        }

        // Check if slope is non-negative (bracket found)
        if slope_new >= 0.0 {
            return zoom(
                f,
                grad,
                x,
                d,
                fx,
                slope0,
                alpha,
                alpha_prev,
                f_new,
                f_prev,
                c1,
                c2,
                &mut function_calls,
                &mut gradient_calls,
            );
        }

        alpha_prev = alpha;
        f_prev = f_new;
        alpha = (alpha + alpha_max) / 2.0;

        if alpha >= alpha_max {
            break;
        }
    }

    // Failed
    LineSearchResult {
        alpha: 0.0,
        f_new: fx,
        g_new: None,
        function_calls,
        gradient_calls,
        success: false,
    }
}

#[allow(clippy::too_many_arguments)]
fn zoom(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    slope0: f64,
    mut alpha_lo: f64,
    mut alpha_hi: f64,
    mut f_lo: f64,
    mut _f_hi: f64,
    c1: f64,
    c2: f64,
    function_calls: &mut usize,
    gradient_calls: &mut usize,
) -> LineSearchResult {
    for _ in 0..20 {
        let alpha = (alpha_lo + alpha_hi) / 2.0;
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        *function_calls += 1;

        if f_new > fx + c1 * alpha * slope0 || f_new >= f_lo {
            alpha_hi = alpha;
            _f_hi = f_new;
        } else {
            let g_new = grad(&x_new);
            *gradient_calls += 1;
            let slope_new = dot(&g_new, d);

            if slope_new.abs() <= -c2 * slope0 {
                return LineSearchResult {
                    alpha,
                    f_new,
                    g_new: Some(g_new),
                    function_calls: *function_calls,
                    gradient_calls: *gradient_calls,
                    success: true,
                };
            }

            if slope_new * (alpha_hi - alpha_lo) >= 0.0 {
                alpha_hi = alpha_lo;
            }

            alpha_lo = alpha;
            f_lo = f_new;
        }

        if (alpha_hi - alpha_lo).abs() < 1e-10 {
            break;
        }
    }

    LineSearchResult {
        alpha: alpha_lo,
        f_new: f_lo,
        g_new: None,
        function_calls: *function_calls,
        gradient_calls: *gradient_calls,
        success: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sphere(x: &[f64]) -> f64 {
        x.iter().map(|xi| xi * xi).sum()
    }

    fn sphere_grad(x: &[f64]) -> Vec<f64> {
        x.iter().map(|xi| 2.0 * xi).collect()
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (1.0 - x0).powi(2) + 100.0 * (x1 - x0 * x0).powi(2)
    }

    fn rosenbrock_grad(x: &[f64]) -> Vec<f64> {
        let x0 = x[0];
        let x1 = x[1];
        vec![
            -2.0 * (1.0 - x0) - 400.0 * x0 * (x1 - x0 * x0),
            200.0 * (x1 - x0 * x0),
        ]
    }

    #[test]
    fn test_backtracking_sphere() {
        let x = vec![10.0, 10.0];
        let fx = sphere(&x);
        let gx = sphere_grad(&x);
        let d = gx.iter().map(|g| -g).collect::<Vec<_>>();

        let result = backtracking_line_search(&sphere, &x, &d, fx, &gx, None, None, None, None);

        assert!(result.success);
        assert!(result.f_new < fx);
    }

    #[test]
    fn test_backtracking_ascending() {
        let x = vec![5.0, 5.0];
        let fx = sphere(&x);
        let gx = sphere_grad(&x);
        let d = gx.clone(); // Ascending direction

        let result = backtracking_line_search(&sphere, &x, &d, fx, &gx, None, None, None, None);

        assert!(!result.success);
    }

    #[test]
    fn test_wolfe_sphere() {
        let x = vec![10.0, 10.0];
        let fx = sphere(&x);
        let gx = sphere_grad(&x);
        let d = gx.iter().map(|g| -g).collect::<Vec<_>>();

        let result =
            wolfe_line_search(&sphere, &sphere_grad, &x, &d, fx, &gx, None, None, None, None);

        assert!(result.success);
        assert!(result.f_new < fx);
        assert!(result.g_new.is_some());
        assert_eq!(result.g_new.as_ref().unwrap().len(), 2);

        // Verify Wolfe conditions
        let c1 = 1e-4;
        let c2 = 0.9;
        let slope0 = dot(&gx, &d);
        assert!(result.f_new <= fx + c1 * result.alpha * slope0);

        let g_new = result.g_new.unwrap();
        let slope_new = dot(&g_new, &d);
        assert!(slope_new.abs() <= -c2 * slope0);
    }

    #[test]
    fn test_wolfe_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let fx = rosenbrock(&x);
        let gx = rosenbrock_grad(&x);
        let d = gx.iter().map(|g| -g).collect::<Vec<_>>();

        let result = wolfe_line_search(
            &rosenbrock,
            &rosenbrock_grad,
            &x,
            &d,
            fx,
            &gx,
            None,
            None,
            None,
            None,
        );

        assert!(result.success);
        assert!(result.f_new < fx);
    }
}
