"""Hager-Zhang line search with approximate Wolfe conditions."""

from dataclasses import dataclass
from typing import Callable, List
from vec_ops import dot, add_scaled


@dataclass
class HagerZhangOptions:
    """Options for Hager-Zhang line search."""
    delta: float = 0.1
    sigma: float = 0.9
    epsilon: float = 1e-6
    theta: float = 0.5
    gamma: float = 0.66
    rho: float = 5.0
    max_bracket_iter: int = 50
    max_secant_iter: int = 50


@dataclass
class LineSearchResult:
    """Result of a line search."""
    alpha: float
    f_new: float
    g_new: List[float]
    function_calls: int
    gradient_calls: int
    success: bool


def hager_zhang_line_search(
    f: Callable[[List[float]], float],
    grad: Callable[[List[float]], List[float]],
    x: List[float],
    d: List[float],
    fx: float,
    gx: List[float],
    options: HagerZhangOptions = None
) -> LineSearchResult:
    """Hager-Zhang line search with approximate Wolfe conditions."""
    if options is None:
        options = HagerZhangOptions()

    function_calls = 0
    gradient_calls = 0

    phi0 = fx
    dphi0 = dot(gx, d)

    eps_k = options.epsilon * abs(phi0)

    # Helper functions
    def eval_phi(alpha: float):
        nonlocal function_calls, gradient_calls
        x_new = add_scaled(x, d, alpha)
        f_new = f(x_new)
        function_calls += 1
        g_new = grad(x_new)
        gradient_calls += 1
        dphi = dot(g_new, d)
        return f_new, g_new, dphi

    def satisfies_conditions(alpha, phi_alpha, dphi_alpha):
        """Check if approximate Wolfe conditions are satisfied."""
        # Curvature condition
        if dphi_alpha >= options.sigma * dphi0:
            # Standard Wolfe (sufficient decrease)
            if phi_alpha <= phi0 + options.delta * alpha * dphi0:
                return True
            # Approximate Wolfe
            if phi_alpha <= phi0 + eps_k and options.sigma * dphi0 <= dphi_alpha <= (2 * options.delta - 1) * dphi0:
                return True
        return False

    # Phase 1: Bracket
    c = 1.0
    phi_c, g_c, dphi_c = eval_phi(c)

    if satisfies_conditions(c, phi_c, dphi_c):
        return LineSearchResult(
            alpha=c,
            f_new=phi_c,
            g_new=g_c,
            function_calls=function_calls,
            gradient_calls=gradient_calls,
            success=True
        )

    # Bracket expansion
    a = 0.0
    b = c
    phi_a = phi0
    dphi_a = dphi0
    phi_b = phi_c
    dphi_b = dphi_c
    g_a = gx
    g_b = g_c

    if phi_c > phi0 + eps_k or dphi_c >= 0:
        # Bracket found
        pass
    else:
        # Expand bracket
        for _ in range(options.max_bracket_iter):
            c_prev = c
            phi_prev = phi_c
            dphi_prev = dphi_c
            g_prev = g_c

            c *= options.rho
            phi_c, g_c, dphi_c = eval_phi(c)

            if satisfies_conditions(c, phi_c, dphi_c):
                return LineSearchResult(
                    alpha=c,
                    f_new=phi_c,
                    g_new=g_c,
                    function_calls=function_calls,
                    gradient_calls=gradient_calls,
                    success=True
                )

            if phi_c > phi0 + eps_k or dphi_c >= 0:
                a = c_prev
                b = c
                phi_a = phi_prev
                dphi_a = dphi_prev
                phi_b = phi_c
                dphi_b = dphi_c
                g_a = g_prev
                g_b = g_c
                break
        else:
            # Bracket expansion exhausted
            return LineSearchResult(
                alpha=c,
                f_new=phi_c,
                g_new=g_c,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                success=False
            )

    # Phase 2: Secant/Bisect
    prev_width = abs(b - a)

    for _ in range(options.max_secant_iter):
        # Secant interpolation
        denom = dphi_b - dphi_a
        if abs(denom) > 1e-30:
            c = a - dphi_a * (b - a) / denom
            # Clamp to interior
            width = abs(b - a)
            margin = 1e-14 * width
            c = max(min(a, b) + margin, min(c, max(a, b) - margin))
        else:
            # Theta-bisection
            c = a + options.theta * (b - a)

        phi_c, g_c, dphi_c = eval_phi(c)

        if satisfies_conditions(c, phi_c, dphi_c):
            return LineSearchResult(
                alpha=c,
                f_new=phi_c,
                g_new=g_c,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                success=True
            )

        # Update bracket
        if phi_c > phi0 + eps_k or dphi_c >= 0:
            b = c
            phi_b = phi_c
            dphi_b = dphi_c
            g_b = g_c
        else:
            a = c
            phi_a = phi_c
            dphi_a = dphi_c
            g_a = g_c

        # Check if bracket shrank enough
        new_width = abs(b - a)
        if new_width > options.gamma * prev_width:
            # Bisection step
            c = (a + b) / 2.0
            phi_c, g_c, dphi_c = eval_phi(c)

            if satisfies_conditions(c, phi_c, dphi_c):
                return LineSearchResult(
                    alpha=c,
                    f_new=phi_c,
                    g_new=g_c,
                    function_calls=function_calls,
                    gradient_calls=gradient_calls,
                    success=True
                )

            if phi_c > phi0 + eps_k or dphi_c >= 0:
                b = c
                phi_b = phi_c
                dphi_b = dphi_c
                g_b = g_c
            else:
                a = c
                phi_a = phi_c
                dphi_a = dphi_c
                g_a = g_c

        prev_width = new_width

    # Secant/bisect exhausted
    return LineSearchResult(
        alpha=a,
        f_new=phi_a,
        g_new=g_a,
        function_calls=function_calls,
        gradient_calls=gradient_calls,
        success=False
    )
