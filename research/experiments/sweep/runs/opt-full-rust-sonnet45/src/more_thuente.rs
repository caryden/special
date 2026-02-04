/// More-Thuente line search with cubic interpolation and strong Wolfe conditions.

use crate::line_search::LineSearchResult;
use crate::vec_ops::{add_scaled, dot};

pub struct MoreThuenteOptions {
    pub f_tol: f64,
    pub gtol: f64,
    pub x_tol: f64,
    pub alpha_min: f64,
    pub alpha_max: f64,
    pub max_fev: usize,
}

impl Default for MoreThuenteOptions {
    fn default() -> Self {
        MoreThuenteOptions {
            f_tol: 1e-4,
            gtol: 0.9,
            x_tol: 1e-8,
            alpha_min: 1e-16,
            alpha_max: 65536.0,
            max_fev: 100,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CstepResult {
    pub stx_val: f64,
    pub stx_f: f64,
    pub stx_dg: f64,
    pub sty_val: f64,
    pub sty_f: f64,
    pub sty_dg: f64,
    pub alpha: f64,
    pub bracketed: bool,
    pub info: u8,
}

pub fn cstep(
    stx: f64, fstx: f64, dgx: f64,
    sty: f64, fsty: f64, dgy: f64,
    alpha: f64, fp: f64, dg: f64,
    mut bracketed: bool, stmin: f64, stmax: f64,
) -> CstepResult {
    let mut info: u8 = 0;
    let bound: bool;

    let sgnd = dg * (dgx / dgx.abs());
    let mut alphaf: f64;

    if fp > fstx {
        // Case 1: Higher function value
        info = 1;
        bound = true;
        let theta = 3.0 * (fstx - fp) / (alpha - stx) + dgx + dg;
        let s = theta.abs().max(dgx.abs()).max(dg.abs());
        let gamma = if alpha < stx { -1.0 } else { 1.0 }
            * s * ((theta / s).powi(2) - (dgx / s) * (dg / s)).sqrt();
        let p = gamma - dgx + theta;
        let q = gamma - dgx + gamma + dg;
        let r = p / q;
        let alphac = stx + r * (alpha - stx);
        let alphaq = stx + (dgx / ((fstx - fp) / (alpha - stx) + dgx)) / 2.0 * (alpha - stx);
        alphaf = if (alphac - stx).abs() < (alphaq - stx).abs() {
            alphac
        } else {
            (alphac + alphaq) / 2.0
        };
        bracketed = true;
    } else if sgnd < 0.0 {
        // Case 2: Lower value, opposite-sign derivatives
        info = 2;
        bound = false;
        let theta = 3.0 * (fstx - fp) / (alpha - stx) + dgx + dg;
        let s = theta.abs().max(dgx.abs()).max(dg.abs());
        let gamma = if alpha > stx { -1.0 } else { 1.0 }
            * s * ((theta / s).powi(2) - (dgx / s) * (dg / s)).sqrt();
        let p = gamma - dg + theta;
        let q = gamma - dg + gamma + dgx;
        let r = p / q;
        let alphac = alpha + r * (stx - alpha);
        let alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha);
        alphaf = if (alphac - alpha).abs() > (alphaq - alpha).abs() {
            alphac
        } else {
            alphaq
        };
        bracketed = true;
    } else if dg.abs() < dgx.abs() {
        // Case 3: Lower value, same-sign, decreasing derivative magnitude
        info = 3;
        bound = true;
        let theta = 3.0 * (fstx - fp) / (alpha - stx) + dgx + dg;
        let s = theta.abs().max(dgx.abs()).max(dg.abs());
        let gamma_arg = ((theta / s).powi(2) - (dgx / s) * (dg / s)).max(0.0);
        let gamma = if alpha > stx { -1.0 } else { 1.0 } * s * gamma_arg.sqrt();
        let p = gamma - dg + theta;
        let q = gamma + dgx - dg + gamma;
        let r = p / q;

        let alphac = if r < 0.0 && gamma != 0.0 {
            alpha + r * (stx - alpha)
        } else if alpha > stx {
            stmax
        } else {
            stmin
        };
        let alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha);

        alphaf = if bracketed {
            if (alpha - alphac).abs() < (alpha - alphaq).abs() {
                alphac
            } else {
                alphaq
            }
        } else {
            if (alpha - alphac).abs() > (alpha - alphaq).abs() {
                alphac
            } else {
                alphaq
            }
        };
    } else {
        // Case 4: Lower value, same-sign, non-decreasing derivative magnitude
        info = 4;
        bound = false;
        if bracketed {
            let theta = 3.0 * (fp - fsty) / (sty - alpha) + dgy + dg;
            let s = theta.abs().max(dgy.abs()).max(dg.abs());
            let gamma = if alpha > sty { -1.0 } else { 1.0 }
                * s * ((theta / s).powi(2) - (dgy / s) * (dg / s)).sqrt();
            let p = gamma - dg + theta;
            let q = gamma - dg + gamma + dgy;
            let r = p / q;
            alphaf = alpha + r * (sty - alpha);
        } else if alpha > stx {
            alphaf = stmax;
        } else {
            alphaf = stmin;
        }
    }

    // Update the interval of uncertainty
    let mut new_stx = stx;
    let mut new_fstx = fstx;
    let mut new_dgx = dgx;
    let mut new_sty = sty;
    let mut new_fsty = fsty;
    let mut new_dgy = dgy;

    if fp > fstx {
        new_sty = alpha;
        new_fsty = fp;
        new_dgy = dg;
    } else {
        if sgnd < 0.0 {
            new_sty = stx;
            new_fsty = fstx;
            new_dgy = dgx;
        }
        new_stx = alpha;
        new_fstx = fp;
        new_dgx = dg;
    }

    // Safeguard
    alphaf = alphaf.min(stmax).max(stmin);

    if bracketed && bound {
        if new_sty > new_stx {
            alphaf = alphaf.min(new_stx + (2.0 / 3.0) * (new_sty - new_stx));
        } else {
            alphaf = alphaf.max(new_stx + (2.0 / 3.0) * (new_sty - new_stx));
        }
    }

    CstepResult {
        stx_val: new_stx,
        stx_f: new_fstx,
        stx_dg: new_dgx,
        sty_val: new_sty,
        sty_f: new_fsty,
        sty_dg: new_dgy,
        alpha: alphaf,
        bracketed,
        info,
    }
}

pub fn more_thuente(
    f: &dyn Fn(&[f64]) -> f64,
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    d: &[f64],
    fx: f64,
    gx: &[f64],
    options: Option<&MoreThuenteOptions>,
) -> LineSearchResult {
    let defaults = MoreThuenteOptions::default();
    let opts = options.unwrap_or(&defaults);

    let dphi0 = dot(gx, d);
    let mut function_calls = 0_usize;
    let mut gradient_calls = 0_usize;

    let eval = |alpha: f64, fc: &mut usize, gc: &mut usize| -> (f64, f64, Vec<f64>) {
        let x_new = add_scaled(x, d, alpha);
        let phi = f(&x_new);
        let g = grad(&x_new);
        *fc += 1;
        *gc += 1;
        let dphi = dot(&g, d);
        (phi, dphi, g)
    };

    let mut bracketed = false;
    let mut stage1 = true;
    let dgtest = opts.f_tol * dphi0;

    let mut stx = 0.0_f64;
    let mut fstx = fx;
    let mut dgx_s = dphi0;
    let mut sty = 0.0_f64;
    let mut fsty = fx;
    let mut dgy_s = dphi0;

    let mut width = opts.alpha_max - opts.alpha_min;
    let mut width1 = 2.0 * width;

    let mut alpha = opts.alpha_min.max(1.0_f64.min(opts.alpha_max));
    let (mut f_alpha, mut dg_alpha, mut g_alpha) =
        eval(alpha, &mut function_calls, &mut gradient_calls);

    // Handle non-finite initial evaluation
    let mut iter_finite = 0;
    while (!f_alpha.is_finite() || !dg_alpha.is_finite()) && iter_finite < 50 {
        iter_finite += 1;
        alpha /= 2.0;
        let result = eval(alpha, &mut function_calls, &mut gradient_calls);
        f_alpha = result.0;
        dg_alpha = result.1;
        g_alpha = result.2;
        stx = 0.875 * alpha;
    }

    let mut info_cstep: u8 = 1;
    let mut info: u8 = 0;

    loop {
        let (stmin, stmax) = if bracketed {
            (stx.min(sty), stx.max(sty))
        } else {
            (stx, alpha + 4.0 * (alpha - stx))
        };
        let stmin = stmin.max(opts.alpha_min);
        let stmax = stmax.min(opts.alpha_max);

        alpha = alpha.max(opts.alpha_min).min(opts.alpha_max);

        // Unusual termination
        if (bracketed && (alpha <= stmin || alpha >= stmax))
            || function_calls >= opts.max_fev - 1
            || info_cstep == 0
            || (bracketed && stmax - stmin <= opts.x_tol * stmax)
        {
            alpha = stx;
        }

        let result = eval(alpha, &mut function_calls, &mut gradient_calls);
        f_alpha = result.0;
        dg_alpha = result.1;
        g_alpha = result.2;

        let ftest1 = fx + alpha * dgtest;

        // Test convergence
        if (bracketed && (alpha <= stmin || alpha >= stmax)) || info_cstep == 0 {
            info = 6;
        }
        if alpha == opts.alpha_max && f_alpha <= ftest1 && dg_alpha <= dgtest {
            info = 5;
        }
        if alpha == opts.alpha_min && (f_alpha > ftest1 || dg_alpha >= dgtest) {
            info = 4;
        }
        if function_calls >= opts.max_fev {
            info = 3;
        }
        if bracketed && stmax - stmin <= opts.x_tol * stmax {
            info = 2;
        }
        if f_alpha <= ftest1 && dg_alpha.abs() <= -opts.gtol * dphi0 {
            info = 1;
        }

        if info != 0 {
            break;
        }

        // Stage transition
        if stage1 && f_alpha <= ftest1 && dg_alpha >= opts.f_tol.min(opts.gtol) * dphi0 {
            stage1 = false;
        }

        // Update interval
        let cs_result;
        if stage1 && f_alpha <= fstx && f_alpha > ftest1 {
            let fm = f_alpha - alpha * dgtest;
            let fxm = fstx - stx * dgtest;
            let fym = fsty - sty * dgtest;
            let dgm = dg_alpha - dgtest;
            let dgxm = dgx_s - dgtest;
            let dgym = dgy_s - dgtest;

            cs_result = cstep(stx, fxm, dgxm, sty, fym, dgym, alpha, fm, dgm, bracketed, stmin, stmax);

            fstx = cs_result.stx_f + cs_result.stx_val * dgtest;
            fsty = cs_result.sty_f + cs_result.sty_val * dgtest;
            dgx_s = cs_result.stx_dg + dgtest;
            dgy_s = cs_result.sty_dg + dgtest;
            stx = cs_result.stx_val;
            sty = cs_result.sty_val;
        } else {
            cs_result = cstep(stx, fstx, dgx_s, sty, fsty, dgy_s, alpha, f_alpha, dg_alpha, bracketed, stmin, stmax);
            stx = cs_result.stx_val;
            fstx = cs_result.stx_f;
            dgx_s = cs_result.stx_dg;
            sty = cs_result.sty_val;
            fsty = cs_result.sty_f;
            dgy_s = cs_result.sty_dg;
        }

        alpha = cs_result.alpha;
        bracketed = cs_result.bracketed;
        info_cstep = cs_result.info;

        // Force sufficient decrease in interval width
        if bracketed {
            if (sty - stx).abs() >= (2.0 / 3.0) * width1 {
                alpha = stx + (sty - stx) / 2.0;
            }
            width1 = width;
            width = (sty - stx).abs();
        }
    }

    LineSearchResult {
        alpha,
        f_new: f_alpha,
        g_new: Some(g_alpha),
        function_calls,
        gradient_calls,
        success: info == 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;
    use crate::vec_ops::negate;

    #[test]
    fn test_sphere() {
        let tf = sphere();
        let x = vec![5.0, 5.0];
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = more_thuente(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.f_new < 50.0);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let x = tf.starting_point.clone();
        let gx = (tf.gradient)(&x);
        let d = negate(&gx);
        let fx = (tf.f)(&x);
        let r = more_thuente(&tf.f, &(tf.gradient), &x, &d, fx, &gx, None);
        assert!(r.success);
        assert!(r.f_new < fx);
    }

    #[test]
    fn test_max_fev() {
        let f = |x: &[f64]| -x[0];
        let g = |x: &[f64]| vec![-1.0];
        let x = vec![0.0];
        let gx = g(&x);
        let d = negate(&gx);
        let fx = f(&x);
        let opts = MoreThuenteOptions {
            max_fev: 3,
            ..Default::default()
        };
        let r = more_thuente(&f, &g, &x, &d, fx, &gx, Some(&opts));
        assert!(!r.success);
    }

    #[test]
    fn test_cstep_case3() {
        let r = cstep(5.0, 10.0, -10.0, 0.0, 0.0, 0.0, 2.0, 8.0, -5.0, false, 0.0, 100.0);
        assert_eq!(r.info, 3);
    }

    #[test]
    fn test_cstep_case4_bracketed() {
        let r = cstep(1.0, 2.0, -1.0, 5.0, 5.0, 1.0, 3.0, 1.0, -2.0, true, 0.0, 10.0);
        assert_eq!(r.info, 4);
    }
}
