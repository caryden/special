"""
Line search algorithms: backtracking (Armijo) and Strong Wolfe.

Provenance: Nocedal & Wright, Numerical Optimization, Algorithms 3.1, 3.5, 3.6
"""

from dataclasses import dataclass
from typing import Callable, Optional

from vec_ops import dot, add_scaled


@dataclass
class LineSearchResult:
    alpha: float
    f_new: float
    g_new: Optional[list[float]]
    function_calls: int
    gradient_calls: int
    success: bool


def backtracking_line_search(
    f: Callable[[list[float]], float],
    x: list[float],
    d: list[float],
    fx: float,
    gx: list[float],
    initial_alpha: float = 1.0,
    c1: float = 1e-4,
    rho: float = 0.5,
    max_iter: int = 20,
) -> LineSearchResult:
    """
    Backtracking line search with Armijo (sufficient decrease) condition.
    Finds alpha such that: f(x + alpha*d) <= f(x) + c1*alpha*g'*d
    """
    dg = dot(gx, d)
    alpha = initial_alpha
    function_calls = 0

    for _ in range(max_iter):
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        if f_new <= fx + c1 * alpha * dg:
            return LineSearchResult(
                alpha=alpha,
                f_new=f_new,
                g_new=None,
                function_calls=function_calls,
                gradient_calls=0,
                success=True,
            )

        alpha *= rho

    # Failed to find a step satisfying Armijo condition
    x_final = add_scaled(x, d, alpha)
    return LineSearchResult(
        alpha=alpha,
        f_new=f(x_final),
        g_new=None,
        function_calls=function_calls + 1,
        gradient_calls=0,
        success=False,
    )


def wolfe_line_search(
    f: Callable[[list[float]], float],
    grad: Callable[[list[float]], list[float]],
    x: list[float],
    d: list[float],
    fx: float,
    gx: list[float],
    c1: float = 1e-4,
    c2: float = 0.9,
    alpha_max: float = 1e6,
    max_iter: int = 25,
) -> LineSearchResult:
    """
    Strong Wolfe line search (bracket-and-zoom).
    Finds alpha satisfying both Armijo and curvature conditions.
    """
    dg0 = dot(gx, d)
    function_calls = 0
    gradient_calls = 0

    alpha_prev = 0.0
    f_prev = fx
    alpha = 1.0

    for i in range(max_iter):
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        # Check Armijo condition or if function increased from previous
        if f_new > fx + c1 * alpha * dg0 or (i > 0 and f_new >= f_prev):
            return _zoom(
                f, grad, x, d, fx, dg0, c1, c2,
                alpha_prev, alpha, f_prev, f_new,
                function_calls, gradient_calls,
            )

        g_new = grad(x_new)
        gradient_calls += 1
        dg_new = dot(g_new, d)

        # Check curvature condition
        if abs(dg_new) <= c2 * abs(dg0):
            return LineSearchResult(
                alpha=alpha,
                f_new=f_new,
                g_new=g_new,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                success=True,
            )

        # If directional derivative is positive, we've bracketed
        if dg_new >= 0:
            return _zoom(
                f, grad, x, d, fx, dg0, c1, c2,
                alpha, alpha_prev, f_new, f_prev,
                function_calls, gradient_calls,
            )

        alpha_prev = alpha
        f_prev = f_new
        alpha = min(2 * alpha, alpha_max)

    # Failed -- return best we have
    x_final = add_scaled(x, d, alpha)
    return LineSearchResult(
        alpha=alpha,
        f_new=f(x_final),
        g_new=grad(x_final),
        function_calls=function_calls + 1,
        gradient_calls=gradient_calls + 1,
        success=False,
    )


def _zoom(
    f: Callable[[list[float]], float],
    grad: Callable[[list[float]], list[float]],
    x: list[float],
    d: list[float],
    fx: float,
    dg0: float,
    c1: float,
    c2: float,
    alpha_lo: float,
    alpha_hi: float,
    f_lo: float,
    f_hi: float,
    function_calls: int,
    gradient_calls: int,
) -> LineSearchResult:
    """
    Zoom phase of the Wolfe line search.
    Narrows the bracket [alpha_lo, alpha_hi] to find a point satisfying both conditions.
    """
    max_zoom_iter = 20

    for _ in range(max_zoom_iter):
        alpha = (alpha_lo + alpha_hi) / 2
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        if f_new > fx + c1 * alpha * dg0 or f_new >= f_lo:
            alpha_hi = alpha
            f_hi = f_new
        else:
            g_new = grad(x_new)
            gradient_calls += 1
            dg_new = dot(g_new, d)

            if abs(dg_new) <= c2 * abs(dg0):
                return LineSearchResult(
                    alpha=alpha,
                    f_new=f_new,
                    g_new=g_new,
                    function_calls=function_calls,
                    gradient_calls=gradient_calls,
                    success=True,
                )

            if dg_new * (alpha_hi - alpha_lo) >= 0:
                alpha_hi = alpha_lo
                f_hi = f_lo

            alpha_lo = alpha
            f_lo = f_new

        # Bracket too small
        if abs(alpha_hi - alpha_lo) < 1e-14:
            break

    # Return best we found (alpha_lo is usually the better end)
    x_final = add_scaled(x, d, alpha_lo)
    return LineSearchResult(
        alpha=alpha_lo,
        f_new=f(x_final),
        g_new=grad(x_final),
        function_calls=function_calls + 1,
        gradient_calls=gradient_calls + 1,
        success=False,
    )
