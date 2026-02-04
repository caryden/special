"""
Line search algorithms: backtracking (Armijo) and Strong Wolfe.
"""

from dataclasses import dataclass
from typing import Callable, List, Optional

from .vec_ops import dot, add_scaled


@dataclass
class LineSearchResult:
    alpha: float
    f_new: float
    g_new: Optional[List[float]]
    function_calls: int
    gradient_calls: int
    success: bool


def backtracking_line_search(
    f: Callable[[List[float]], float],
    x: List[float],
    d: List[float],
    fx: float,
    gx: List[float],
    initial_alpha: float = 1.0,
    c1: float = 1e-4,
    rho: float = 0.5,
    max_iter: int = 20,
) -> LineSearchResult:
    """Backtracking line search satisfying the Armijo condition."""
    dg = dot(gx, d)
    alpha = initial_alpha
    function_calls = 0

    for _ in range(max_iter):
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        if f_new <= fx + c1 * alpha * dg:
            return LineSearchResult(
                alpha=alpha, f_new=f_new, g_new=None,
                function_calls=function_calls, gradient_calls=0, success=True,
            )
        alpha *= rho

    return LineSearchResult(
        alpha=alpha, f_new=f(add_scaled(x, d, alpha)), g_new=None,
        function_calls=function_calls + 1, gradient_calls=0, success=False,
    )


def wolfe_line_search(
    f: Callable[[List[float]], float],
    grad: Callable[[List[float]], List[float]],
    x: List[float],
    d: List[float],
    fx: float,
    gx: List[float],
    c1: float = 1e-4,
    c2: float = 0.9,
    alpha_max: float = 1e6,
    max_iter: int = 25,
) -> LineSearchResult:
    """Strong Wolfe line search using bracket-and-zoom."""
    dg0 = dot(gx, d)
    function_calls = 0
    gradient_calls = 0

    def phi(alpha: float) -> float:
        nonlocal function_calls
        function_calls += 1
        return f(add_scaled(x, d, alpha))

    def dphi(alpha: float):
        nonlocal gradient_calls
        gradient_calls += 1
        g = grad(add_scaled(x, d, alpha))
        return dot(g, d), g

    def zoom(alpha_lo, alpha_hi, phi_lo, phi_hi, dphi_lo):
        for _ in range(20):
            # Bisection
            alpha_j = (alpha_lo + alpha_hi) / 2.0
            phi_j = phi(alpha_j)

            if phi_j > fx + c1 * alpha_j * dg0 or phi_j >= phi_lo:
                alpha_hi = alpha_j
                phi_hi = phi_j
            else:
                dphi_j, g_j = dphi(alpha_j)
                if abs(dphi_j) <= c2 * abs(dg0):
                    return alpha_j, phi_j, g_j, True
                if dphi_j * (alpha_hi - alpha_lo) >= 0:
                    alpha_hi = alpha_lo
                    phi_hi = phi_lo
                alpha_lo = alpha_j
                phi_lo = phi_j
                dphi_lo = dphi_j

        # Return best found
        dphi_lo_val, g_lo = dphi(alpha_lo)
        return alpha_lo, phi(alpha_lo), g_lo, False

    alpha_prev = 0.0
    phi_prev = fx
    alpha_i = 1.0

    for i in range(1, max_iter + 1):
        phi_i = phi(alpha_i)

        if phi_i > fx + c1 * alpha_i * dg0 or (i > 1 and phi_i >= phi_prev):
            alpha_z, phi_z, g_z, success = zoom(alpha_prev, alpha_i, phi_prev, phi_i, dg0)
            return LineSearchResult(
                alpha=alpha_z, f_new=phi_z, g_new=g_z,
                function_calls=function_calls, gradient_calls=gradient_calls,
                success=success,
            )

        dphi_i, g_i = dphi(alpha_i)

        if abs(dphi_i) <= c2 * abs(dg0):
            return LineSearchResult(
                alpha=alpha_i, f_new=phi_i, g_new=g_i,
                function_calls=function_calls, gradient_calls=gradient_calls,
                success=True,
            )

        if dphi_i >= 0:
            alpha_z, phi_z, g_z, success = zoom(alpha_i, alpha_prev, phi_i, phi_prev, dphi_i)
            return LineSearchResult(
                alpha=alpha_z, f_new=phi_z, g_new=g_z,
                function_calls=function_calls, gradient_calls=gradient_calls,
                success=success,
            )

        alpha_prev = alpha_i
        phi_prev = phi_i
        alpha_i = min(2 * alpha_i, alpha_max)

    # Failed
    g_final = grad(add_scaled(x, d, alpha_i))
    gradient_calls += 1
    return LineSearchResult(
        alpha=alpha_i, f_new=phi(alpha_i), g_new=g_final,
        function_calls=function_calls, gradient_calls=gradient_calls,
        success=False,
    )
