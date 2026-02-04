// hager-zhang — Hager-Zhang line search with approximate Wolfe conditions

use crate::line_search::LineSearchResult;
use crate::vec_ops::{add_scaled, dot};

#[derive(Debug, Clone)]
pub struct HagerZhangOptions {
    pub delta: f64,           // Sufficient decrease (Wolfe c1)
    pub sigma: f64,           // Curvature condition (Wolfe c2)
    pub epsilon: f64,         // Approximate Wolfe tolerance
    pub theta: f64,           // Bisection ratio
    pub gamma: f64,           // Bracket shrink factor
    pub rho: f64,             // Expansion factor
    pub max_bracket_iter: usize,
    pub max_secant_iter: usize,
}

impl Default for HagerZhangOptions {
    fn default() -> Self {
        Self {
            delta: 0.1,
            sigma: 0.9,
            epsilon: 1e-6,
            theta: 0.5,
            gamma: 0.66,
            rho: 5.0,
            max_bracket_iter: 50,
            max_secant_iter: 50,
        }
    }
}

pub fn hager_zhang_line_search(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    options: Option<HagerZhangOptions>,
) -> LineSearchResult {
    let opts = options.unwrap_or_default();
    let mut function_calls = 0;
    let mut gradient_calls = 0;

    let phi0 = fx;
    let dphi0 = dot(gx, d);
    let eps_k = opts.epsilon * phi0.abs();

    // Helper closures
    let mut eval_phi = |alpha: f64| -> f64 {
        function_calls += 1;
        let x_new = add_scaled(x, d, alpha);
        f(&x_new)
    };

    let mut eval_dphi = |alpha: f64| -> f64 {
        gradient_calls += 1;
        let x_new = add_scaled(x, d, alpha);
        let g = grad(&x_new);
        dot(&g, d)
    };

    // Check if alpha satisfies approximate Wolfe conditions
    let satisfies_wolfe = |phi_alpha: f64, dphi_alpha: f64| -> bool {
        // Standard Wolfe
        if phi_alpha <= phi0 + opts.delta * dphi0 && dphi_alpha >= opts.sigma * dphi0 {
            return true;
        }
        // Approximate Wolfe
        if phi_alpha <= phi0 + eps_k
            && dphi_alpha >= opts.sigma * dphi0
            && dphi_alpha <= (2.0 * opts.delta - 1.0) * dphi0
        {
            return true;
        }
        false
    };

    // Phase 1: Bracket
    let mut c = 1.0;
    let mut a = 0.0;
    let mut b = f64::INFINITY;

    for _ in 0..opts.max_bracket_iter {
        let phi_c = eval_phi(c);
        let dphi_c = eval_dphi(c);

        if satisfies_wolfe(phi_c, dphi_c) {
            let g_new = grad(&add_scaled(x, d, c));
            return LineSearchResult {
                alpha: c,
                f_new: phi_c,
                g_new: Some(g_new),
                function_calls,
                gradient_calls: gradient_calls + 1,
                success: true,
            };
        }

        if phi_c > phi0 + eps_k || dphi_c >= 0.0 {
            // Bracket found
            b = c;
            break;
        }

        // Expand
        a = c;
        c *= opts.rho;
    }

    if b.is_infinite() {
        // Bracket expansion failed
        return LineSearchResult {
            alpha: 0.0,
            f_new: fx,
            g_new: None,
            function_calls,
            gradient_calls,
            success: false,
        };
    }

    // Phase 2: Secant/Bisect
    let mut dphi_a = eval_dphi(a);
    let mut dphi_b = eval_dphi(b);
    let mut prev_width = b - a;

    for _ in 0..opts.max_secant_iter {
        // Secant interpolation
        let denom = dphi_b - dphi_a;
        let c = if denom.abs() > 1e-30 {
            a - dphi_a * (b - a) / denom
        } else {
            // Denominator too small, use bisection
            a + opts.theta * (b - a)
        };

        // Ensure c is strictly interior
        let margin = 1e-10 * (b - a);
        let c = c.max(a + margin).min(b - margin);

        let phi_c = eval_phi(c);
        let dphi_c = eval_dphi(c);

        if satisfies_wolfe(phi_c, dphi_c) {
            let g_new = grad(&add_scaled(x, d, c));
            return LineSearchResult {
                alpha: c,
                f_new: phi_c,
                g_new: Some(g_new),
                function_calls,
                gradient_calls: gradient_calls + 1,
                success: true,
            };
        }

        // Update bracket
        if phi_c > phi0 + eps_k || dphi_c >= 0.0 {
            b = c;
            dphi_b = dphi_c;
        } else {
            a = c;
            dphi_a = dphi_c;
        }

        // Check if bracket didn't shrink enough
        let width = b - a;
        if width > opts.gamma * prev_width {
            // Force bisection
            let c_bisect = a + opts.theta * (b - a);
            let phi_bisect = eval_phi(c_bisect);
            let dphi_bisect = eval_dphi(c_bisect);

            if satisfies_wolfe(phi_bisect, dphi_bisect) {
                let g_new = grad(&add_scaled(x, d, c_bisect));
                return LineSearchResult {
                    alpha: c_bisect,
                    f_new: phi_bisect,
                    g_new: Some(g_new),
                    function_calls,
                    gradient_calls: gradient_calls + 1,
                    success: true,
                };
            }

            if phi_bisect > phi0 + eps_k || dphi_bisect >= 0.0 {
                b = c_bisect;
                dphi_b = dphi_bisect;
            } else {
                a = c_bisect;
                dphi_a = dphi_bisect;
            }
        }

        prev_width = width;

        if width < 1e-10 {
            break;
        }
    }

    // Secant phase exhausted
    LineSearchResult {
        alpha: a,
        f_new: eval_phi(a),
        g_new: None,
        function_calls,
        gradient_calls,
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
    fn test_sphere_exact_minimum() {
        let x = vec![0.5, 0.5];
        let fx = sphere(&x);
        let gx = sphere_grad(&x);
        let d = vec![-0.5, -0.5];

        let result = hager_zhang_line_search(&sphere, &sphere_grad, &x, &d, fx, &gx, None);

        assert!(result.success);
        assert!((result.alpha - 1.0).abs() < 1e-5);
        assert!(result.f_new < 1e-10);
    }

    #[test]
    fn test_sphere_steepest_descent() {
        let x = vec![5.0, 5.0];
        let fx = sphere(&x);
        let gx = sphere_grad(&x);
        let d = gx.iter().map(|g| -g).collect::<Vec<_>>();

        let result = hager_zhang_line_search(&sphere, &sphere_grad, &x, &d, fx, &gx, None);

        assert!(result.success);
        assert!(result.alpha > 0.1 && result.alpha < 2.0);
        assert!(result.f_new < fx);
    }

    #[test]
    fn test_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let fx = rosenbrock(&x);
        let gx = rosenbrock_grad(&x);
        let d = gx.iter().map(|g| -g).collect::<Vec<_>>();

        let result =
            hager_zhang_line_search(&rosenbrock, &rosenbrock_grad, &x, &d, fx, &gx, None);

        assert!(result.success);
        assert!(result.f_new < fx);
    }

    #[test]
    fn test_failure_linear() {
        let f = |x: &[f64]| -x[0];
        let grad = |_: &[f64]| vec![-1.0];
        let x = vec![0.0];
        let fx = f(&x);
        let gx = grad(&x);
        let d = vec![1.0];

        let opts = HagerZhangOptions {
            max_bracket_iter: 2,
            ..Default::default()
        };

        let result = hager_zhang_line_search(&f, &grad, &x, &d, fx, &gx, Some(opts));

        assert!(!result.success);
    }

    #[test]
    fn test_failure_strict_conditions() {
        let x = vec![-1.2, 1.0];
        let fx = rosenbrock(&x);
        let gx = rosenbrock_grad(&x);
        let d = gx.iter().map(|g| -g).collect::<Vec<_>>();

        let opts = HagerZhangOptions {
            delta: 0.99,
            sigma: 0.99,
            max_secant_iter: 1,
            ..Default::default()
        };

        let result =
            hager_zhang_line_search(&rosenbrock, &rosenbrock_grad, &x, &d, fx, &gx, Some(opts));

        assert!(!result.success);
    }
}
