/// Line search algorithms: backtracking (Armijo) and Strong Wolfe.

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
        BacktrackingOptions {
            initial_alpha: 1.0,
            c1: 1e-4,
            rho: 0.5,
            max_iter: 20,
        }
    }
}

/// Backtracking line search (Armijo condition).
pub fn backtracking_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    options: Option<&BacktrackingOptions>,
) -> LineSearchResult {
    let defaults = BacktrackingOptions::default();
    let opts = options.unwrap_or(&defaults);

    let dg = dot(gx, d);
    let mut alpha = opts.initial_alpha;
    let mut function_calls = 0;

    for _ in 0..opts.max_iter {
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        function_calls += 1;

        if f_new <= fx + opts.c1 * alpha * dg {
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

    LineSearchResult {
        alpha,
        f_new: f(&add_scaled(x, d, alpha)),
        g_new: None,
        function_calls: function_calls + 1,
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
        WolfeOptions {
            c1: 1e-4,
            c2: 0.9,
            alpha_max: 1e6,
            max_iter: 25,
        }
    }
}

/// Strong Wolfe line search (Nocedal & Wright, Algorithms 3.5 + 3.6).
pub fn wolfe_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    options: Option<&WolfeOptions>,
) -> LineSearchResult {
    let defaults = WolfeOptions::default();
    let opts = options.unwrap_or(&defaults);

    let dg0 = dot(gx, d);
    let mut function_calls = 0_usize;
    let mut gradient_calls = 0_usize;

    let mut alpha_prev = 0.0_f64;
    let mut f_prev = fx;
    let mut alpha = 1.0_f64;

    for i in 0..opts.max_iter {
        let x_new = add_scaled(x, d, alpha);
        let f_new = f(&x_new);
        function_calls += 1;

        // Armijo violation or function increased
        if f_new > fx + opts.c1 * alpha * dg0 || (i > 0 && f_new >= f_prev) {
            return zoom(
                f, grad, x, d, fx, dg0, alpha_prev, f_prev, alpha, f_new,
                opts.c1, opts.c2, &mut function_calls, &mut gradient_calls,
            );
        }

        let g_new = grad(&x_new);
        gradient_calls += 1;
        let dg_new = dot(&g_new, d);

        // Curvature condition satisfied
        if dg_new.abs() <= opts.c2 * dg0.abs() {
            return LineSearchResult {
                alpha,
                f_new,
                g_new: Some(g_new),
                function_calls,
                gradient_calls,
                success: true,
            };
        }

        // Derivative is positive — need to zoom
        if dg_new >= 0.0 {
            return zoom(
                f, grad, x, d, fx, dg0, alpha, f_new, alpha_prev, f_prev,
                opts.c1, opts.c2, &mut function_calls, &mut gradient_calls,
            );
        }

        alpha_prev = alpha;
        f_prev = f_new;
        alpha = (2.0 * alpha).min(opts.alpha_max);
    }

    // Fallback
    let x_new = add_scaled(x, d, alpha);
    let f_new = f(&x_new);
    let g_new = grad(&x_new);
    function_calls += 1;
    gradient_calls += 1;
    LineSearchResult {
        alpha,
        f_new,
        g_new: Some(g_new),
        function_calls,
        gradient_calls,
        success: false,
    }
}

fn zoom(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    dg0: f64,
    mut alpha_lo: f64,
    mut f_lo: f64,
    mut alpha_hi: f64,
    mut f_hi: f64,
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

        if f_new > fx + c1 * alpha * dg0 || f_new >= f_lo {
            alpha_hi = alpha;
            f_hi = f_new;
        } else {
            let g_new = grad(&x_new);
            *gradient_calls += 1;
            let dg_new = dot(&g_new, d);

            if dg_new.abs() <= c2 * dg0.abs() {
                return LineSearchResult {
                    alpha,
                    f_new,
                    g_new: Some(g_new),
                    function_calls: *function_calls,
                    gradient_calls: *gradient_calls,
                    success: true,
                };
            }

            if dg_new * (alpha_hi - alpha_lo) >= 0.0 {
                alpha_hi = alpha_lo;
                f_hi = f_lo;
            }
            alpha_lo = alpha;
            f_lo = f_new;
        }
    }

    let x_new = add_scaled(x, d, alpha_lo);
    let f_new = f(&x_new);
    let g_new = grad(&x_new);
    *function_calls += 1;
    *gradient_calls += 1;
    LineSearchResult {
        alpha: alpha_lo,
        f_new,
        g_new: Some(g_new),
        function_calls: *function_calls,
        gradient_calls: *gradient_calls,
        success: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;
    use crate::vec_ops::negate;

    #[test]
    fn test_backtracking_sphere() {
        let tf = sphere();
        let x = vec![10.0, 10.0];
        let gx = (tf.gradient)(&x);
        let d = negate(&gx); // [-20, -20]
        let fx = (tf.f)(&x);
        let r = backtracking_line_search(&tf.f, &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!((r.alpha - 0.5).abs() < 1e-10);
        assert!(r.f_new.abs() < 1e-10);
    }

    #[test]
    fn test_backtracking_rosenbrock() {
        let tf = rosenbrock();
        let x = tf.starting_point.clone();
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = backtracking_line_search(&tf.f, &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.f_new < fx);
    }

    #[test]
    fn test_backtracking_ascending() {
        let tf = sphere();
        let x = vec![10.0, 10.0];
        let gx = (tf.gradient)(&x);
        let d = gx.clone(); // ascending direction
        let fx = (tf.f)(&x);
        let r = backtracking_line_search(&tf.f, &x, &d, fx, &gx, None);
        assert!(!r.success);
    }

    #[test]
    fn test_wolfe_sphere() {
        let tf = sphere();
        let x = vec![10.0, 10.0];
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = wolfe_line_search(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.g_new.is_some());
        assert_eq!(r.g_new.as_ref().unwrap().len(), 2);
        // Verify Wolfe conditions
        let dg0 = dot(&gx, &d);
        assert!(r.f_new <= fx + 1e-4 * r.alpha * dg0);
        let dg_new = dot(r.g_new.as_ref().unwrap(), &d);
        assert!(dg_new.abs() <= 0.9 * dg0.abs());
    }

    #[test]
    fn test_wolfe_rosenbrock() {
        let tf = rosenbrock();
        let x = tf.starting_point.clone();
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = wolfe_line_search(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.f_new < fx);
    }
}
