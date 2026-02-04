"""
Hager-Zhang line search with approximate Wolfe conditions.
"""

from typing import Callable, List, Optional

from .vec_ops import dot, add_scaled
from .line_search import LineSearchResult


def hager_zhang_line_search(
    f: Callable[[List[float]], float],
    grad: Callable[[List[float]], List[float]],
    x: List[float],
    d: List[float],
    fx: float,
    gx: List[float],
    delta: float = 0.1,
    sigma: float = 0.9,
    epsilon: float = 1e-6,
    theta: float = 0.5,
    gamma: float = 0.66,
    rho: float = 5.0,
    max_bracket_iter: int = 50,
    max_secant_iter: int = 50,
) -> LineSearchResult:
    """Hager-Zhang line search satisfying approximate Wolfe conditions."""
    function_calls = 0
    gradient_calls = 0

    phi0 = fx
    dphi0 = dot(gx, d)
    eps_k = epsilon * abs(phi0)

    def eval_phi(alpha: float) -> float:
        nonlocal function_calls
        function_calls += 1
        return f(add_scaled(x, d, alpha))

    def eval_dphi(alpha: float):
        nonlocal gradient_calls
        gradient_calls += 1
        g_new = grad(add_scaled(x, d, alpha))
        return dot(g_new, d), g_new

    def satisfies_conditions(alpha: float, phi_a: float, dphi_a: float) -> bool:
        curvature = dphi_a >= sigma * dphi0
        if not curvature:
            return False
        # Standard Wolfe
        if phi_a <= phi0 + delta * alpha * dphi0:
            return True
        # Approximate Wolfe
        return phi_a <= phi0 + eps_k and dphi_a <= (2 * delta - 1) * dphi0

    # --- Bracket phase ---
    c = 1.0
    phi_c = eval_phi(c)
    dphi_c, g_new_c = eval_dphi(c)

    if satisfies_conditions(c, phi_c, dphi_c):
        return LineSearchResult(
            alpha=c, f_new=phi_c, g_new=g_new_c,
            function_calls=function_calls, gradient_calls=gradient_calls,
            success=True,
        )

    if phi_c > phi0 + eps_k or dphi_c >= 0:
        aj, bj = 0.0, c
        phi_aj, phi_bj = phi0, phi_c
        dphi_aj, dphi_bj = dphi0, dphi_c
        bracket_found = True
    else:
        aj, bj = 0.0, c
        phi_aj, phi_bj = phi0, phi_c
        dphi_aj, dphi_bj = dphi0, dphi_c
        bracket_found = False

        c_prev = 0.0
        phi_prev = phi0
        dphi_prev = dphi0

        for _ in range(max_bracket_iter):
            c_prev = c
            phi_prev = phi_c
            dphi_prev = dphi_c

            c = rho * c
            phi_c = eval_phi(c)
            dphi_c, g_new_c = eval_dphi(c)

            if satisfies_conditions(c, phi_c, dphi_c):
                return LineSearchResult(
                    alpha=c, f_new=phi_c, g_new=g_new_c,
                    function_calls=function_calls, gradient_calls=gradient_calls,
                    success=True,
                )

            if phi_c > phi0 + eps_k or dphi_c >= 0:
                aj, bj = c_prev, c
                phi_aj, phi_bj = phi_prev, phi_c
                dphi_aj, dphi_bj = dphi_prev, dphi_c
                bracket_found = True
                break

        if not bracket_found:
            return LineSearchResult(
                alpha=c, f_new=phi_c, g_new=g_new_c,
                function_calls=function_calls, gradient_calls=gradient_calls,
                success=False,
            )

    # --- Secant/Bisection phase ---
    last_width = bj - aj

    for _ in range(max_secant_iter):
        width = bj - aj

        if width < 1e-14:
            mid = (aj + bj) / 2.0
            phi_mid = eval_phi(mid)
            dphi_mid, g_new_mid = eval_dphi(mid)
            return LineSearchResult(
                alpha=mid, f_new=phi_mid, g_new=g_new_mid,
                function_calls=function_calls, gradient_calls=gradient_calls,
                success=True,
            )

        # Secant step
        denom = dphi_bj - dphi_aj
        if abs(denom) > 1e-30:
            cj = aj - dphi_aj * (bj - aj) / denom
            margin = 1e-14 * width
            cj = max(aj + margin, min(cj, bj - margin))
        else:
            cj = aj + theta * (bj - aj)

        phi_cj = eval_phi(cj)
        dphi_cj, g_new_cj = eval_dphi(cj)

        if satisfies_conditions(cj, phi_cj, dphi_cj):
            return LineSearchResult(
                alpha=cj, f_new=phi_cj, g_new=g_new_cj,
                function_calls=function_calls, gradient_calls=gradient_calls,
                success=True,
            )

        # Update bracket
        if phi_cj > phi0 + eps_k or dphi_cj >= 0:
            bj = cj
            phi_bj = phi_cj
            dphi_bj = dphi_cj
        else:
            aj = cj
            phi_aj = phi_cj
            dphi_aj = dphi_cj

        # Bisection fallback
        new_width = bj - aj
        if new_width > gamma * last_width:
            mid = aj + theta * (bj - aj)
            phi_mid = eval_phi(mid)
            dphi_mid, g_new_mid = eval_dphi(mid)

            if satisfies_conditions(mid, phi_mid, dphi_mid):
                return LineSearchResult(
                    alpha=mid, f_new=phi_mid, g_new=g_new_mid,
                    function_calls=function_calls, gradient_calls=gradient_calls,
                    success=True,
                )

            if phi_mid > phi0 + eps_k or dphi_mid >= 0:
                bj = mid
                phi_bj = phi_mid
                dphi_bj = dphi_mid
            else:
                aj = mid
                phi_aj = phi_mid
                dphi_aj = dphi_mid

        last_width = bj - aj

    # Exhausted
    best_phi = eval_phi(aj)
    _, best_g = eval_dphi(aj)
    return LineSearchResult(
        alpha=aj, f_new=best_phi, g_new=best_g,
        function_calls=function_calls, gradient_calls=gradient_calls,
        success=False,
    )
