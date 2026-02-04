/// Hager-Zhang line search with approximate Wolfe conditions.

use crate::line_search::LineSearchResult;
use crate::vec_ops::{add_scaled, dot};

pub struct HagerZhangOptions {
    pub delta: f64,
    pub sigma: f64,
    pub epsilon: f64,
    pub theta: f64,
    pub gamma: f64,
    pub rho: f64,
    pub max_bracket_iter: usize,
    pub max_secant_iter: usize,
}

impl Default for HagerZhangOptions {
    fn default() -> Self {
        HagerZhangOptions {
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
    options: Option<&HagerZhangOptions>,
) -> LineSearchResult {
    let defaults = HagerZhangOptions::default();
    let opts = options.unwrap_or(&defaults);

    let mut function_calls = 0_usize;
    let mut gradient_calls = 0_usize;

    let phi0 = fx;
    let dphi0 = dot(gx, d);
    let eps_k = opts.epsilon * phi0.abs();

    let eval_phi = |alpha: f64, fc: &mut usize| -> f64 {
        *fc += 1;
        f(&add_scaled(x, d, alpha))
    };

    let eval_dphi = |alpha: f64, gc: &mut usize| -> (f64, Vec<f64>) {
        *gc += 1;
        let g_new = grad(&add_scaled(x, d, alpha));
        let val = dot(&g_new, d);
        (val, g_new)
    };

    let satisfies = |alpha: f64, phi_a: f64, dphi_a: f64| -> bool {
        let curvature = dphi_a >= opts.sigma * dphi0;
        if !curvature {
            return false;
        }
        if phi_a <= phi0 + opts.delta * alpha * dphi0 {
            return true;
        }
        phi_a <= phi0 + eps_k && dphi_a <= (2.0 * opts.delta - 1.0) * dphi0
    };

    // Bracket phase
    let mut c = 1.0;
    let mut phi_c = eval_phi(c, &mut function_calls);
    let (mut dphi_c, mut g_new_c) = eval_dphi(c, &mut gradient_calls);

    if satisfies(c, phi_c, dphi_c) {
        return LineSearchResult {
            alpha: c,
            f_new: phi_c,
            g_new: Some(g_new_c),
            function_calls,
            gradient_calls,
            success: true,
        };
    }

    let (mut aj, mut bj, mut phi_aj, mut phi_bj, mut dphi_aj, mut dphi_bj);
    let mut bracket_found;

    if phi_c > phi0 + eps_k || dphi_c >= 0.0 {
        aj = 0.0;
        bj = c;
        phi_aj = phi0;
        phi_bj = phi_c;
        dphi_aj = dphi0;
        dphi_bj = dphi_c;
        bracket_found = true;
    } else {
        aj = 0.0;
        bj = c;
        phi_aj = phi0;
        phi_bj = phi_c;
        dphi_aj = dphi0;
        dphi_bj = dphi_c;
        bracket_found = false;

        let mut c_prev = 0.0;
        let mut phi_prev = phi0;
        let mut dphi_prev = dphi0;

        for _ in 0..opts.max_bracket_iter {
            c_prev = c;
            phi_prev = phi_c;
            dphi_prev = dphi_c;

            c *= opts.rho;
            phi_c = eval_phi(c, &mut function_calls);
            let result = eval_dphi(c, &mut gradient_calls);
            dphi_c = result.0;
            g_new_c = result.1;

            if satisfies(c, phi_c, dphi_c) {
                return LineSearchResult {
                    alpha: c,
                    f_new: phi_c,
                    g_new: Some(g_new_c),
                    function_calls,
                    gradient_calls,
                    success: true,
                };
            }

            if phi_c > phi0 + eps_k || dphi_c >= 0.0 {
                aj = c_prev;
                bj = c;
                phi_aj = phi_prev;
                phi_bj = phi_c;
                dphi_aj = dphi_prev;
                dphi_bj = dphi_c;
                bracket_found = true;
                break;
            }
        }

        if !bracket_found {
            return LineSearchResult {
                alpha: c,
                f_new: phi_c,
                g_new: Some(g_new_c),
                function_calls,
                gradient_calls,
                success: false,
            };
        }
    }

    // Secant/bisection phase
    let mut last_width = bj - aj;

    for _ in 0..opts.max_secant_iter {
        let width = bj - aj;

        if width < 1e-14 {
            let mid = (aj + bj) / 2.0;
            let phi_mid = eval_phi(mid, &mut function_calls);
            let (_, g_mid) = eval_dphi(mid, &mut gradient_calls);
            return LineSearchResult {
                alpha: mid,
                f_new: phi_mid,
                g_new: Some(g_mid),
                function_calls,
                gradient_calls,
                success: true,
            };
        }

        // Secant step
        let denom = dphi_bj - dphi_aj;
        let mut cj;
        if denom.abs() > 1e-30 {
            cj = aj - dphi_aj * (bj - aj) / denom;
            let margin = 1e-14 * width;
            cj = cj.max(aj + margin).min(bj - margin);
        } else {
            cj = aj + opts.theta * (bj - aj);
        }

        let phi_cj = eval_phi(cj, &mut function_calls);
        let (dphi_cj, g_cj) = eval_dphi(cj, &mut gradient_calls);

        if satisfies(cj, phi_cj, dphi_cj) {
            return LineSearchResult {
                alpha: cj,
                f_new: phi_cj,
                g_new: Some(g_cj),
                function_calls,
                gradient_calls,
                success: true,
            };
        }

        if phi_cj > phi0 + eps_k || dphi_cj >= 0.0 {
            bj = cj;
            phi_bj = phi_cj;
            dphi_bj = dphi_cj;
        } else {
            aj = cj;
            phi_aj = phi_cj;
            dphi_aj = dphi_cj;
        }

        // Bisection fallback
        let new_width = bj - aj;
        if new_width > opts.gamma * last_width {
            let mid = aj + opts.theta * (bj - aj);
            let phi_mid = eval_phi(mid, &mut function_calls);
            let (dphi_mid, g_mid) = eval_dphi(mid, &mut gradient_calls);

            if satisfies(mid, phi_mid, dphi_mid) {
                return LineSearchResult {
                    alpha: mid,
                    f_new: phi_mid,
                    g_new: Some(g_mid),
                    function_calls,
                    gradient_calls,
                    success: true,
                };
            }

            if phi_mid > phi0 + eps_k || dphi_mid >= 0.0 {
                bj = mid;
                phi_bj = phi_mid;
                dphi_bj = dphi_mid;
            } else {
                aj = mid;
                phi_aj = phi_mid;
                dphi_aj = dphi_mid;
            }
        }

        last_width = bj - aj;
    }

    // Exhausted
    let best_phi = eval_phi(aj, &mut function_calls);
    let (_, best_g) = eval_dphi(aj, &mut gradient_calls);
    LineSearchResult {
        alpha: aj,
        f_new: best_phi,
        g_new: Some(best_g),
        function_calls,
        gradient_calls,
        success: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;
    use crate::vec_ops::negate;

    #[test]
    fn test_sphere_exact_step() {
        let tf = sphere();
        let x = vec![0.5, 0.5];
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = hager_zhang_line_search(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!((r.alpha - 1.0).abs() < 1e-6 || r.f_new < 1e-10);
    }

    #[test]
    fn test_sphere_steepest() {
        let tf = sphere();
        let x = vec![5.0, 5.0];
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = hager_zhang_line_search(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.f_new < 1.0);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let x = tf.starting_point.clone();
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = hager_zhang_line_search(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.f_new <= fx);
    }

    #[test]
    fn test_bracket_expansion() {
        let f = |x: &[f64]| x[0] * x[0];
        let g = |x: &[f64]| vec![2.0 * x[0]];
        let x = vec![100.0];
        let gx = g(&x);
        let d = negate(&gx);
        let fx = f(&x);
        let r = hager_zhang_line_search(&f, &g, &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.alpha > 0.0);
    }

    #[test]
    fn test_failure_linear() {
        let f = |x: &[f64]| -x[0];
        let g = |x: &[f64]| vec![-1.0];
        let x = vec![0.0];
        let gx = g(&x);
        let d = negate(&gx); // [1.0]
        let fx = f(&x);
        let opts = HagerZhangOptions {
            max_bracket_iter: 2,
            ..Default::default()
        };
        let r = hager_zhang_line_search(&f, &g, &x, &d, fx, &gx, Some(&opts));
        assert!(!r.success);
    }

    #[test]
    fn test_failure_strict_secant() {
        let tf = rosenbrock();
        let x = tf.starting_point.clone();
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let opts = HagerZhangOptions {
            delta: 0.99,
            sigma: 0.99,
            max_secant_iter: 1,
            ..Default::default()
        };
        let r = hager_zhang_line_search(&tf.f, &(tf.gradient), &x, &d, fx, &gx, Some(&opts));
        assert!(!r.success);
    }
}
