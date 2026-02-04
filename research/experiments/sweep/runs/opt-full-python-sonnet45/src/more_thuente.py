"""
More-Thuente line search with cubic interpolation and strong Wolfe conditions.
"""

import math
from dataclasses import dataclass
from typing import Callable, List, Optional

from .vec_ops import dot, add_scaled
from .line_search import LineSearchResult


@dataclass
class CstepResult:
    stx_val: float
    stx_f: float
    stx_dg: float
    sty_val: float
    sty_f: float
    sty_dg: float
    alpha: float
    bracketed: bool
    info: int


def cstep(
    stx: float, fstx: float, dgx: float,
    sty: float, fsty: float, dgy: float,
    alpha: float, f_val: float, dg: float,
    bracketed: bool, stmin: float, stmax: float,
) -> CstepResult:
    """Update interval of uncertainty and compute next trial step."""
    info = 0
    sgnd = dg * (dgx / abs(dgx)) if abs(dgx) > 0 else 0.0

    # Case 1: Higher function value
    if f_val > fstx:
        info = 1
        bound = True
        theta_val = 3.0 * (fstx - f_val) / (alpha - stx) + dgx + dg
        s = max(abs(theta_val), abs(dgx), abs(dg))
        sign = -1.0 if alpha < stx else 1.0
        gamma_val = sign * s * math.sqrt((theta_val / s) ** 2 - (dgx / s) * (dg / s))
        p = gamma_val - dgx + theta_val
        q = gamma_val - dgx + gamma_val + dg
        r = p / q
        alphac = stx + r * (alpha - stx)
        alphaq = stx + (dgx / ((fstx - f_val) / (alpha - stx) + dgx)) / 2.0 * (alpha - stx)
        if abs(alphac - stx) < abs(alphaq - stx):
            alphaf = alphac
        else:
            alphaf = (alphac + alphaq) / 2.0
        bracketed = True

    # Case 2: Lower value, opposite-sign derivatives
    elif sgnd < 0:
        info = 2
        bound = False
        theta_val = 3.0 * (fstx - f_val) / (alpha - stx) + dgx + dg
        s = max(abs(theta_val), abs(dgx), abs(dg))
        sign = -1.0 if alpha > stx else 1.0
        gamma_val = sign * s * math.sqrt((theta_val / s) ** 2 - (dgx / s) * (dg / s))
        p = gamma_val - dg + theta_val
        q = gamma_val - dg + gamma_val + dgx
        r = p / q
        alphac = alpha + r * (stx - alpha)
        alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha)
        if abs(alphac - alpha) > abs(alphaq - alpha):
            alphaf = alphac
        else:
            alphaf = alphaq
        bracketed = True

    # Case 3: Lower value, same-sign, decreasing derivative magnitude
    elif abs(dg) < abs(dgx):
        info = 3
        bound = True
        theta_val = 3.0 * (fstx - f_val) / (alpha - stx) + dgx + dg
        s = max(abs(theta_val), abs(dgx), abs(dg))
        gamma_arg = max(0.0, (theta_val / s) ** 2 - (dgx / s) * (dg / s))
        sign = -1.0 if alpha > stx else 1.0
        gamma_val = sign * s * math.sqrt(gamma_arg)
        p = gamma_val - dg + theta_val
        q = gamma_val + dgx - dg + gamma_val
        r = p / q

        if r < 0 and gamma_val != 0:
            alphac = alpha + r * (stx - alpha)
        elif alpha > stx:
            alphac = stmax
        else:
            alphac = stmin

        alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha)

        if bracketed:
            alphaf = alphac if abs(alpha - alphac) < abs(alpha - alphaq) else alphaq
        else:
            alphaf = alphac if abs(alpha - alphac) > abs(alpha - alphaq) else alphaq

    # Case 4: Lower value, same-sign, non-decreasing derivative magnitude
    else:
        info = 4
        bound = False
        if bracketed:
            theta_val = 3.0 * (f_val - fsty) / (sty - alpha) + dgy + dg
            s = max(abs(theta_val), abs(dgy), abs(dg))
            sign = -1.0 if alpha > sty else 1.0
            gamma_val = sign * s * math.sqrt((theta_val / s) ** 2 - (dgy / s) * (dg / s))
            p = gamma_val - dg + theta_val
            q = gamma_val - dg + gamma_val + dgy
            r = p / q
            alphaf = alpha + r * (sty - alpha)
        elif alpha > stx:
            alphaf = stmax
        else:
            alphaf = stmin

    # Update interval
    new_stx, new_fstx, new_dgx = stx, fstx, dgx
    new_sty, new_fsty, new_dgy = sty, fsty, dgy

    if f_val > fstx:
        new_sty = alpha
        new_fsty = f_val
        new_dgy = dg
    else:
        if sgnd < 0:
            new_sty = stx
            new_fsty = fstx
            new_dgy = dgx
        new_stx = alpha
        new_fstx = f_val
        new_dgx = dg

    # Safeguard
    alphaf = min(stmax, alphaf)
    alphaf = max(stmin, alphaf)

    if bracketed and bound:
        if new_sty > new_stx:
            alphaf = min(new_stx + (2.0 / 3.0) * (new_sty - new_stx), alphaf)
        else:
            alphaf = max(new_stx + (2.0 / 3.0) * (new_sty - new_stx), alphaf)

    return CstepResult(
        stx_val=new_stx, stx_f=new_fstx, stx_dg=new_dgx,
        sty_val=new_sty, sty_f=new_fsty, sty_dg=new_dgy,
        alpha=alphaf, bracketed=bracketed, info=info,
    )


def more_thuente(
    f: Callable[[List[float]], float],
    grad: Callable[[List[float]], List[float]],
    x: List[float],
    d: List[float],
    fx: float,
    gx: List[float],
    f_tol: float = 1e-4,
    gtol: float = 0.9,
    x_tol: float = 1e-8,
    alpha_min: float = 1e-16,
    alpha_max: float = 65536.0,
    max_fev: int = 100,
) -> LineSearchResult:
    """More-Thuente line search satisfying strong Wolfe conditions."""
    dphi0 = dot(gx, d)
    function_calls = 0
    gradient_calls = 0

    def eval_phi_dphi(alpha_val):
        nonlocal function_calls, gradient_calls
        x_new = add_scaled(x, d, alpha_val)
        phi = f(x_new)
        g = grad(x_new)
        function_calls += 1
        gradient_calls += 1
        return phi, dot(g, d), g

    bracketed = False
    stage1 = True
    dgtest = f_tol * dphi0

    stx = 0.0; fstx = fx; dgx_val = dphi0
    sty = 0.0; fsty = fx; dgy_val = dphi0

    width = alpha_max - alpha_min
    width1 = 2.0 * width

    alpha = max(alpha_min, min(1.0, alpha_max))
    f_alpha, dg_alpha, g_alpha = eval_phi_dphi(alpha)

    # Handle non-finite initial evaluation
    iter_finite = 0
    while (not math.isfinite(f_alpha) or not math.isfinite(dg_alpha)) and iter_finite < 50:
        iter_finite += 1
        alpha = alpha / 2.0
        f_alpha, dg_alpha, g_alpha = eval_phi_dphi(alpha)
        stx = (7.0 / 8.0) * alpha

    info_cstep = 1
    info = 0

    for _ in range(1000):  # infinite loop with break
        if bracketed:
            stmin_val = min(stx, sty)
            stmax_val = max(stx, sty)
        else:
            stmin_val = stx
            stmax_val = alpha + 4.0 * (alpha - stx)

        stmin_val = max(alpha_min, stmin_val)
        stmax_val = min(alpha_max, stmax_val)

        alpha = max(alpha, alpha_min)
        alpha = min(alpha, alpha_max)

        # Unusual termination
        if ((bracketed and (alpha <= stmin_val or alpha >= stmax_val)) or
                function_calls >= max_fev - 1 or info_cstep == 0 or
                (bracketed and stmax_val - stmin_val <= x_tol * stmax_val)):
            alpha = stx

        f_alpha, dg_alpha, g_alpha = eval_phi_dphi(alpha)
        ftest1 = fx + alpha * dgtest

        # Test termination conditions
        if (bracketed and (alpha <= stmin_val or alpha >= stmax_val)) or info_cstep == 0:
            info = 6
        if alpha == alpha_max and f_alpha <= ftest1 and dg_alpha <= dgtest:
            info = 5
        if alpha == alpha_min and (f_alpha > ftest1 or dg_alpha >= dgtest):
            info = 4
        if function_calls >= max_fev:
            info = 3
        if bracketed and stmax_val - stmin_val <= x_tol * stmax_val:
            info = 2
        if f_alpha <= ftest1 and abs(dg_alpha) <= -gtol * dphi0:
            info = 1

        if info != 0:
            break

        # Stage transition
        if stage1 and f_alpha <= ftest1 and dg_alpha >= min(f_tol, gtol) * dphi0:
            stage1 = False

        # Update interval
        if stage1 and f_alpha <= fstx and f_alpha > ftest1:
            # Modified function values
            fm = f_alpha - alpha * dgtest
            fxm = fstx - stx * dgtest
            fym = fsty - sty * dgtest
            dgm = dg_alpha - dgtest
            dgxm = dgx_val - dgtest
            dgym = dgy_val - dgtest

            result = cstep(stx, fxm, dgxm, sty, fym, dgym, alpha, fm, dgm, bracketed, stmin_val, stmax_val)

            fstx = result.stx_f + result.stx_val * dgtest
            fsty = result.sty_f + result.sty_val * dgtest
            dgx_val = result.stx_dg + dgtest
            dgy_val = result.sty_dg + dgtest
            stx = result.stx_val
            sty = result.sty_val
        else:
            result = cstep(stx, fstx, dgx_val, sty, fsty, dgy_val, alpha, f_alpha, dg_alpha, bracketed, stmin_val, stmax_val)
            stx = result.stx_val
            fstx = result.stx_f
            dgx_val = result.stx_dg
            sty = result.sty_val
            fsty = result.sty_f
            dgy_val = result.sty_dg

        alpha = result.alpha
        bracketed = result.bracketed
        info_cstep = result.info

        if bracketed:
            if abs(sty - stx) >= (2.0 / 3.0) * width1:
                alpha = stx + (sty - stx) / 2.0
            width1 = width
            width = abs(sty - stx)

    return LineSearchResult(
        alpha=alpha, f_new=f_alpha, g_new=g_alpha,
        function_calls=function_calls, gradient_calls=gradient_calls,
        success=(info == 1),
    )
