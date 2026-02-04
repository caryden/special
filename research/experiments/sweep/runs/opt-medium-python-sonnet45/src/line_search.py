"""
line-search — Line search algorithms for optimization.

Implements backtracking (Armijo) and strong Wolfe line searches.
"""

from typing import Callable, Optional, TypedDict
from dataclasses import dataclass
import vec_ops


class BacktrackingOptions(TypedDict, total=False):
    """Options for backtracking line search."""
    initial_alpha: float
    c1: float
    rho: float
    max_iter: int


class WolfeOptions(TypedDict, total=False):
    """Options for Wolfe line search."""
    c1: float
    c2: float
    alpha_max: float
    max_iter: int


@dataclass
class LineSearchResult:
    """Result of a line search."""
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
    options: Optional[BacktrackingOptions] = None,
) -> LineSearchResult:
    """
    Backtracking line search using Armijo condition.

    Finds alpha satisfying: f(x + alpha*d) <= f(x) + c1*alpha*dot(gx, d)
    """
    opts = options or {}
    alpha = opts.get("initial_alpha", 1.0)
    c1 = opts.get("c1", 1e-4)
    rho = opts.get("rho", 0.5)
    max_iter = opts.get("max_iter", 20)

    directional_deriv = vec_ops.dot(gx, d)

    # If not a descent direction, fail immediately
    if directional_deriv >= 0:
        x_new = vec_ops.add_scaled(x, d, alpha)
        f_new = f(x_new)
        return LineSearchResult(
            alpha=alpha,
            f_new=f_new,
            g_new=None,
            function_calls=1,
            gradient_calls=0,
            success=False,
        )

    function_calls = 0
    for _ in range(max_iter):
        x_new = vec_ops.add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        # Check Armijo condition
        if f_new <= fx + c1 * alpha * directional_deriv:
            return LineSearchResult(
                alpha=alpha,
                f_new=f_new,
                g_new=None,
                function_calls=function_calls,
                gradient_calls=0,
                success=True,
            )

        alpha *= rho

    # Failed to find acceptable step
    return LineSearchResult(
        alpha=alpha,
        f_new=f_new,
        g_new=None,
        function_calls=function_calls,
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
    options: Optional[WolfeOptions] = None,
) -> LineSearchResult:
    """
    Strong Wolfe line search.

    Finds alpha satisfying both:
    1. Armijo: f(x + alpha*d) <= f(x) + c1*alpha*dot(gx, d)
    2. Curvature: |dot(grad(x + alpha*d), d)| <= c2*|dot(gx, d)|
    """
    opts = options or {}
    c1 = opts.get("c1", 1e-4)
    c2 = opts.get("c2", 0.9)
    alpha_max = opts.get("alpha_max", 1e6)
    max_iter = opts.get("max_iter", 25)

    directional_deriv = vec_ops.dot(gx, d)

    function_calls = 0
    gradient_calls = 0

    alpha_prev = 0.0
    f_prev = fx
    g_prev = gx

    alpha = 1.0

    for i in range(max_iter):
        x_new = vec_ops.add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        # Check Armijo condition
        if f_new > fx + c1 * alpha * directional_deriv or (i > 0 and f_new >= f_prev):
            # Bracket found, zoom in
            result = _zoom(
                f, grad, x, d, fx, gx, directional_deriv,
                alpha_prev, f_prev, g_prev,
                alpha, f_new,
                c1, c2
            )
            return LineSearchResult(
                alpha=result[0],
                f_new=result[1],
                g_new=result[2],
                function_calls=function_calls + result[3],
                gradient_calls=gradient_calls + result[4],
                success=True,
            )

        # Evaluate gradient
        g_new = grad(x_new)
        gradient_calls += 1

        directional_deriv_new = vec_ops.dot(g_new, d)

        # Check curvature condition
        if abs(directional_deriv_new) <= c2 * abs(directional_deriv):
            # Both Wolfe conditions satisfied
            return LineSearchResult(
                alpha=alpha,
                f_new=f_new,
                g_new=g_new,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                success=True,
            )

        # Check if we're in the wrong direction
        if directional_deriv_new >= 0:
            # Bracket found, zoom in
            result = _zoom(
                f, grad, x, d, fx, gx, directional_deriv,
                alpha, f_new, g_new,
                alpha_prev, f_prev,
                c1, c2
            )
            return LineSearchResult(
                alpha=result[0],
                f_new=result[1],
                g_new=result[2],
                function_calls=function_calls + result[3],
                gradient_calls=gradient_calls + result[4],
                success=True,
            )

        # Expand the search
        alpha_prev = alpha
        f_prev = f_new
        g_prev = g_new

        alpha = min(2 * alpha, alpha_max)

        if alpha >= alpha_max:
            # Reached maximum step size
            return LineSearchResult(
                alpha=alpha,
                f_new=f_new,
                g_new=g_new,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                success=False,
            )

    # Max iterations reached
    return LineSearchResult(
        alpha=alpha,
        f_new=f_new,
        g_new=g_new,
        function_calls=function_calls,
        gradient_calls=gradient_calls,
        success=False,
    )


def _zoom(
    f: Callable[[list[float]], float],
    grad: Callable[[list[float]], list[float]],
    x: list[float],
    d: list[float],
    fx: float,
    gx: list[float],
    directional_deriv: float,
    alpha_lo: float,
    f_lo: float,
    g_lo: Optional[list[float]],
    alpha_hi: float,
    f_hi: float,
    c1: float,
    c2: float,
) -> tuple[float, float, list[float], int, int]:
    """
    Zoom phase of Strong Wolfe line search.

    Returns (alpha, f_new, g_new, function_calls, gradient_calls).
    """
    function_calls = 0
    gradient_calls = 0

    max_zoom_iter = 20

    for _ in range(max_zoom_iter):
        # Bisection
        alpha = (alpha_lo + alpha_hi) / 2.0

        x_new = vec_ops.add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        # Check Armijo condition
        if f_new > fx + c1 * alpha * directional_deriv or f_new >= f_lo:
            alpha_hi = alpha
            f_hi = f_new
        else:
            g_new = grad(x_new)
            gradient_calls += 1

            directional_deriv_new = vec_ops.dot(g_new, d)

            # Check curvature condition
            if abs(directional_deriv_new) <= c2 * abs(directional_deriv):
                return (alpha, f_new, g_new, function_calls, gradient_calls)

            if directional_deriv_new * (alpha_hi - alpha_lo) >= 0:
                alpha_hi = alpha_lo
                f_hi = f_lo

            alpha_lo = alpha
            f_lo = f_new
            g_lo = g_new

    # Return best found
    if g_lo is None:
        g_lo = grad(vec_ops.add_scaled(x, d, alpha_lo))
        gradient_calls += 1

    return (alpha_lo, f_lo, g_lo, function_calls, gradient_calls)
