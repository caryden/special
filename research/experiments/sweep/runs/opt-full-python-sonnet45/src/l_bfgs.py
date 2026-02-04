"""
Limited-memory BFGS with two-loop recursion.
"""

from typing import Callable, List, Optional

from .vec_ops import dot, norm_inf, sub, add_scaled, negate, scale, add
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message,
)
from .line_search import wolfe_line_search
from .finite_diff import forward_diff_gradient


def lbfgs(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    memory: int = 10,
    **kwargs,
) -> OptimizeResult:
    """Minimize using L-BFGS with two-loop recursion."""
    opts = default_options(grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
                           max_iterations=max_iterations)
    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))

    n = len(x0)
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

    s_history: List[List[float]] = []
    y_history: List[List[float]] = []
    rho_history: List[float] = []
    gamma = 1.0

    for iteration in range(1, opts.max_iterations + 1):
        # Compute direction via two-loop recursion
        if not s_history:
            d = negate(gx)
        else:
            m = len(s_history)
            q = gx[:]
            alphas = [0.0] * m

            for i in range(m - 1, -1, -1):
                alphas[i] = rho_history[i] * dot(s_history[i], q)
                q = add_scaled(q, y_history[i], -alphas[i])

            r = scale(q, gamma)

            for i in range(m):
                beta = rho_history[i] * dot(y_history[i], r)
                r = add_scaled(r, s_history[i], alphas[i] - beta)

            d = negate(r)

        ls = wolfe_line_search(f, grad_fn, x, d, fx, gx)
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

        sk = sub(x_new, x)
        yk = sub(g_new, gx)
        ys = dot(yk, sk)

        if ys > 1e-10:
            if len(s_history) >= memory:
                s_history.pop(0)
                y_history.pop(0)
                rho_history.pop(0)
            s_history.append(sk)
            y_history.append(yk)
            rho_history.append(1.0 / ys)
            gamma = ys / dot(yk, yk)

        step_norm = norm_inf(sk)
        func_change = abs(fx - f_new)
        grad_norm = norm_inf(g_new)

        x = x_new
        fx = f_new
        gx = g_new

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
