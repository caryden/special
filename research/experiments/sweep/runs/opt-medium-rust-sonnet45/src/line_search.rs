// line-search: Backtracking and Wolfe line search algorithms

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

pub struct BacktrackingOptions {
    pub initial_alpha: f64,
    pub c1: f64,
    pub rho: f64,
    pub max_iter: usize,
}

impl Default for BacktrackingOptions {
    fn default() -> Self {
        Self {
            initial_alpha: 1.0,
            c1: 1e-4,
            rho: 0.5,
            max_iter: 20,
        }
    }
}

pub fn backtracking_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    options: Option<BacktrackingOptions>,
) -> LineSearchResult {
    let opts = options.unwrap_or_default();
    let mut alpha = opts.initial_alpha;
    let mut function_calls = 0;

    let slope = dot(gx, d);

    for _ in 0..opts.max_iter {
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        function_calls += 1;

        // Armijo condition
        if f_new <= fx + opts.c1 * alpha * slope {
            return LineSearchResult {
                alpha,
                f_new,
                g_new: None,
                function_calls,
                gradient_calls: 0,
                success: true,
            };
        }

        alpha *= opts.rho;
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

pub struct WolfeOptions {
    pub c1: f64,
    pub c2: f64,
    pub alpha_max: f64,
    pub max_iter: usize,
}

impl Default for WolfeOptions {
    fn default() -> Self {
        Self {
            c1: 1e-4,
            c2: 0.9,
            alpha_max: 1e6,
            max_iter: 25,
        }
    }
}

pub fn wolfe_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    options: Option<WolfeOptions>,
) -> LineSearchResult {
    let opts = options.unwrap_or_default();
    let mut function_calls = 0;
    let mut gradient_calls = 0;

    let g0_dot_d = dot(gx, d);
    let mut alpha_prev = 0.0;
    let mut f_prev = fx;
    let mut alpha = 1.0;

    for i in 0..opts.max_iter {
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        function_calls += 1;

        // Check Armijo condition
        if f_new > fx + opts.c1 * alpha * g0_dot_d || (i > 0 && f_new >= f_prev) {
            return zoom(
                f, grad, x, d, fx, gx, alpha_prev, alpha, f_prev, f_new,
                &opts, &mut function_calls, &mut gradient_calls
            );
        }

        let g_new = grad(&x_new);
        gradient_calls += 1;
        let g_new_dot_d = dot(&g_new, d);

        // Check curvature condition
        if g_new_dot_d.abs() <= opts.c2 * g0_dot_d.abs() {
            return LineSearchResult {
                alpha,
                f_new,
                g_new: Some(g_new),
                function_calls,
                gradient_calls,
                success: true,
            };
        }

        // If slope is positive, zoom in
        if g_new_dot_d >= 0.0 {
            return zoom(
                f, grad, x, d, fx, gx, alpha, alpha_prev, f_new, f_prev,
                &opts, &mut function_calls, &mut gradient_calls
            );
        }

        alpha_prev = alpha;
        f_prev = f_new;
        alpha = alpha * 2.0; // Expand the step

        if alpha > opts.alpha_max {
            alpha = opts.alpha_max;
            break;
        }
    }

    // Failed to find acceptable step
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
    gx: &[f64],
    mut alpha_lo: f64,
    mut alpha_hi: f64,
    mut f_lo: f64,
    mut f_hi: f64,
    opts: &WolfeOptions,
    function_calls: &mut usize,
    gradient_calls: &mut usize,
) -> LineSearchResult {
    let g0_dot_d = dot(gx, d);

    for _ in 0..20 {
        // Bisection
        let alpha = (alpha_lo + alpha_hi) / 2.0;
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        *function_calls += 1;

        // Check Armijo
        if f_new > fx + opts.c1 * alpha * g0_dot_d || f_new >= f_lo {
            alpha_hi = alpha;
            f_hi = f_new;
        } else {
            let g_new = grad(&x_new);
            *gradient_calls += 1;
            let g_new_dot_d = dot(&g_new, d);

            // Check curvature
            if g_new_dot_d.abs() <= opts.c2 * g0_dot_d.abs() {
                return LineSearchResult {
                    alpha,
                    f_new,
                    g_new: Some(g_new),
                    function_calls: *function_calls,
                    gradient_calls: *gradient_calls,
                    success: true,
                };
            }

            if g_new_dot_d * (alpha_hi - alpha_lo) >= 0.0 {
                alpha_hi = alpha_lo;
                f_hi = f_lo;
            }

            alpha_lo = alpha;
            f_lo = f_new;
        }

        // Check if interval is too small
        if (alpha_hi - alpha_lo).abs() < 1e-10 {
            break;
        }
    }

    // Failed to converge
    LineSearchResult {
        alpha: 0.0,
        f_new: fx,
        g_new: None,
        function_calls: *function_calls,
        gradient_calls: *gradient_calls,
        success: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test functions
    fn sphere(x: &[f64]) -> f64 {
        x.iter().map(|v| v * v).sum()
    }

    fn sphere_grad(x: &[f64]) -> Vec<f64> {
        x.iter().map(|v| 2.0 * v).collect()
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let a = 1.0 - x[0];
        let b = x[1] - x[0] * x[0];
        a * a + 100.0 * b * b
    }

    fn rosenbrock_grad(x: &[f64]) -> Vec<f64> {
        let a = 1.0 - x[0];
        let b = x[1] - x[0] * x[0];
        vec![
            -2.0 * a + 100.0 * 2.0 * b * (-2.0 * x[0]),
            100.0 * 2.0 * b,
        ]
    }

    #[test]
    fn test_backtracking_sphere() {
        let x = vec![10.0, 10.0];
        let gx = sphere_grad(&x);
        let d = crate::vec_ops::scale(&gx, -1.0); // Negative gradient
        let fx = sphere(&x);

        let result = backtracking_line_search(&sphere, &x, &d, fx, &gx, None);
        assert!(result.success);
        assert!((result.alpha - 0.5).abs() < 1e-6);
        assert!(result.f_new < 1e-6);
    }

    #[test]
    fn test_backtracking_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let gx = rosenbrock_grad(&x);
        let d = crate::vec_ops::scale(&gx, -1.0);
        let fx = rosenbrock(&x);

        let result = backtracking_line_search(&rosenbrock, &x, &d, fx, &gx, None);
        assert!(result.success);
        assert!(result.f_new < fx);
    }

    #[test]
    fn test_backtracking_ascending() {
        let x = vec![10.0, 10.0];
        let gx = sphere_grad(&x);
        let d = gx.clone(); // Positive gradient (ascending)
        let fx = sphere(&x);

        let result = backtracking_line_search(&sphere, &x, &d, fx, &gx, None);
        assert!(!result.success);
    }

    #[test]
    fn test_wolfe_sphere() {
        let x = vec![10.0, 10.0];
        let gx = sphere_grad(&x);
        let d = crate::vec_ops::scale(&gx, -1.0);
        let fx = sphere(&x);

        let result = wolfe_line_search(&sphere, &sphere_grad, &x, &d, fx, &gx, None);
        assert!(result.success);
        assert!(result.g_new.is_some());

        // Verify Wolfe conditions
        let c1 = 1e-4;
        let c2 = 0.9;
        let g0_dot_d = dot(&gx, &d);

        // Armijo condition
        assert!(result.f_new <= fx + c1 * result.alpha * g0_dot_d);

        // Curvature condition
        if let Some(ref g_new) = result.g_new {
            let g_new_dot_d = dot(g_new, &d);
            assert!(g_new_dot_d.abs() <= c2 * g0_dot_d.abs());
        }
    }

    #[test]
    fn test_wolfe_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let gx = rosenbrock_grad(&x);
        let d = crate::vec_ops::scale(&gx, -1.0);
        let fx = rosenbrock(&x);

        let result = wolfe_line_search(&rosenbrock, &rosenbrock_grad, &x, &d, fx, &gx, None);
        assert!(result.success);
        assert!(result.f_new < fx);
    }

    #[test]
    fn test_wolfe_returns_gradient() {
        let x = vec![10.0, 10.0];
        let gx = sphere_grad(&x);
        let d = crate::vec_ops::scale(&gx, -1.0);
        let fx = sphere(&x);

        let result = wolfe_line_search(&sphere, &sphere_grad, &x, &d, fx, &gx, None);
        assert!(result.success);
        assert!(result.g_new.is_some());
        assert_eq!(result.g_new.as_ref().unwrap().len(), 2);
    }
}
