"""
Nonlinear conjugate gradient with Hager-Zhang beta and line search.
"""

import math
from typing import Callable, List, Optional

from .vec_ops import dot, norm, norm_inf, sub, add_scaled, negate
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message,
)
from .hager_zhang import hager_zhang_line_search
from .finite_diff import forward_diff_gradient


def conjugate_gradient(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    eta: float = 0.4,
    restart_interval: Optional[int] = None,
    **kwargs,
) -> OptimizeResult:
    """Minimize using nonlinear conjugate gradient (Hager-Zhang)."""
    opts = default_options(grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
                           max_iterations=max_iterations)
    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))

    n = len(x0)
    ri = restart_interval if restart_interval is not None else n

    x = x0[:]
    fx = f(x)
    gx = grad_fn(x)
    function_calls = 1
    gradient_calls = 1

    # Check initial convergence
    grad_norm = norm_inf(gx)
    reason = check_convergence(grad_norm, float('inf'), float('inf'), 0, opts)
    if reason and is_converged(reason):
        return OptimizeResult(
            x=x[:], fun=fx, gradient=gx[:],
            iterations=0, function_calls=function_calls,
            gradient_calls=gradient_calls, converged=True,
            message=convergence_message(reason),
        )

    d = negate(gx)

    for iteration in range(1, opts.max_iterations + 1):
        ls = hager_zhang_line_search(f, grad_fn, x, d, fx, gx)
        function_calls += ls.function_calls
        gradient_calls += ls.gradient_calls

        if not ls.success:
            return OptimizeResult(
                x=x[:], fun=fx, gradient=gx[:],
                iterations=iteration, function_calls=function_calls,
                gradient_calls=gradient_calls, converged=False,
                message="Stopped: line search failed",
            )

        x_new = add_scaled(x, d, ls.alpha)
        f_new = ls.f_new
        g_new = ls.g_new if ls.g_new is not None else grad_fn(x_new)
        if ls.g_new is None:
            gradient_calls += 1

        # HZ beta
        yk = sub(g_new, gx)
        d_dot_y = dot(d, yk)

        if abs(d_dot_y) < 1e-30:
            beta = 0.0
        else:
            beta_hz = (dot(yk, g_new) - 2.0 * dot(yk, yk) * dot(d, g_new) / d_dot_y) / d_dot_y
            d_norm = norm(d)
            g_norm = norm(gx)
            eta_k = -1.0 / (d_norm * min(eta, g_norm))
            beta = max(beta_hz, eta_k)

        # Periodic restart
        if iteration % ri == 0:
            beta = 0.0

        # Update direction
        d_new = [-g_new[i] + beta * d[i] for i in range(n)]

        # Descent safety
        if dot(d_new, g_new) >= 0:
            d_new = negate(g_new)

        step_norm = norm_inf(sub(x_new, x))
        func_change = abs(fx - f_new)
        grad_norm = norm_inf(g_new)

        x = x_new
        fx = f_new
        gx = g_new
        d = d_new

        reason = check_convergence(grad_norm, step_norm, func_change, iteration, opts)
        if reason:
            return OptimizeResult(
                x=x[:], fun=fx, gradient=gx[:],
                iterations=iteration, function_calls=function_calls,
                gradient_calls=gradient_calls,
                converged=is_converged(reason),
                message=convergence_message(reason),
            )

    return OptimizeResult(
        x=x[:], fun=fx, gradient=gx[:],
        iterations=opts.max_iterations, function_calls=function_calls,
        gradient_calls=gradient_calls, converged=False,
        message=f"Stopped: reached maximum iterations ({opts.max_iterations})",
    )
