"""Line search algorithms for step size selection."""

from dataclasses import dataclass
from typing import Callable, List, Optional
from vec_ops import dot, add_scaled


@dataclass
class LineSearchResult:
    """Result of a line search."""
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
    max_iter: int = 20
) -> LineSearchResult:
    """Backtracking line search with Armijo condition."""
    alpha = initial_alpha
    function_calls = 0
    gradient_dir = dot(gx, d)

    for _ in range(max_iter):
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1

        # Armijo condition
        if f_new <= fx + c1 * alpha * gradient_dir:
            return LineSearchResult(
                alpha=alpha,
                f_new=f_new,
                g_new=None,
                function_calls=function_calls,
                gradient_calls=0,
                success=True
            )

        alpha *= rho

    # Failed to find acceptable step
    return LineSearchResult(
        alpha=alpha,
        f_new=f_new,
        g_new=None,
        function_calls=function_calls,
        gradient_calls=0,
        success=False
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
    max_iter: int = 25
) -> LineSearchResult:
    """Strong Wolfe line search using bracket-and-zoom."""
    function_calls = 0
    gradient_calls = 0

    derphi0 = dot(gx, d)

    # Helper to evaluate phi and its derivative
    def eval_phi(alpha: float):
        nonlocal function_calls, gradient_calls
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1
        g_new = grad(x_new)
        gradient_calls += 1
        derphi = dot(g_new, d)
        return f_new, g_new, derphi

    # Helper for zoom phase
    def zoom(alpha_lo: float, alpha_hi: float, phi_lo: float, phi_hi: float,
             derphi_lo: float, g_lo: List[float]):
        """Narrow bracket to find a Wolfe-satisfying point."""
        for _ in range(max_iter):
            # Interpolate (simple bisection)
            alpha_j = (alpha_lo + alpha_hi) / 2.0
            phi_j, g_j, derphi_j = eval_phi(alpha_j)

            # Check Armijo
            if phi_j > fx + c1 * alpha_j * derphi0 or phi_j >= phi_lo:
                alpha_hi = alpha_j
                phi_hi = phi_j
            else:
                # Check strong Wolfe curvature
                if abs(derphi_j) <= -c2 * derphi0:
                    return LineSearchResult(
                        alpha=alpha_j,
                        f_new=phi_j,
                        g_new=g_j,
                        function_calls=function_calls,
                        gradient_calls=gradient_calls,
                        success=True
                    )

                if derphi_j * (alpha_hi - alpha_lo) >= 0:
                    alpha_hi = alpha_lo
                    phi_hi = phi_lo

                alpha_lo = alpha_j
                phi_lo = phi_j
                derphi_lo = derphi_j
                g_lo = g_j

        # Zoom exhausted
        return LineSearchResult(
            alpha=alpha_lo,
            f_new=phi_lo,
            g_new=g_lo,
            function_calls=function_calls,
            gradient_calls=gradient_calls,
            success=False
        )

    # Bracket phase
    alpha_prev = 0.0
    alpha_curr = 1.0
    phi_prev = fx
    derphi_prev = derphi0
    g_prev = gx

    for i in range(max_iter):
        phi_curr, g_curr, derphi_curr = eval_phi(alpha_curr)

        # Check Armijo and non-increase
        if phi_curr > fx + c1 * alpha_curr * derphi0 or (i > 0 and phi_curr >= phi_prev):
            return zoom(alpha_prev, alpha_curr, phi_prev, phi_curr, derphi_prev, g_prev)

        # Check strong Wolfe curvature
        if abs(derphi_curr) <= -c2 * derphi0:
            return LineSearchResult(
                alpha=alpha_curr,
                f_new=phi_curr,
                g_new=g_curr,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                success=True
            )

        # Derivative positive - minimum is bracketed
        if derphi_curr >= 0:
            return zoom(alpha_curr, alpha_prev, phi_curr, phi_prev, derphi_curr, g_curr)

        # Expand bracket
        alpha_prev = alpha_curr
        phi_prev = phi_curr
        derphi_prev = derphi_curr
        g_prev = g_curr
        alpha_curr = min(alpha_curr * 2.0, alpha_max)

        if alpha_curr >= alpha_max:
            break

    # Bracket phase exhausted
    return LineSearchResult(
        alpha=alpha_curr,
        f_new=phi_prev,
        g_new=g_prev,
        function_calls=function_calls,
        gradient_calls=gradient_calls,
        success=False
    )
