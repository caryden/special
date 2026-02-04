"""
Steepest descent with backtracking line search.
"""

from typing import Callable, List, Optional

from .vec_ops import dot, norm_inf, negate, sub, add_scaled
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message, ConvergenceReason,
)
from .line_search import backtracking_line_search
from .finite_diff import forward_diff_gradient


def gradient_descent(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    **kwargs,
) -> OptimizeResult:
    """Minimize using gradient descent with backtracking."""
    opts = default_options(grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
                           max_iterations=max_iterations)
    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))

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

    for iteration in range(1, opts.max_iterations + 1):
        d = negate(gx)

        ls = backtracking_line_search(f, x, d, fx, gx)
        function_calls += ls.function_calls

        if not ls.success:
            return OptimizeResult(
                x=x[:], fun=fx, gradient=gx[:],
                iterations=iteration, function_calls=function_calls,
                gradient_calls=gradient_calls, converged=False,
                message="Stopped: line search failed",
            )

        x_new = add_scaled(x, d, ls.alpha)
        f_new = ls.f_new

        gx_new = grad_fn(x_new)
        gradient_calls += 1

        step_norm = norm_inf(sub(x_new, x))
        func_change = abs(fx - f_new)
        grad_norm = norm_inf(gx_new)

        x = x_new
        fx = f_new
        gx = gx_new

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
