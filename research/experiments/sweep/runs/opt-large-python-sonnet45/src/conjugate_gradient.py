"""Nonlinear conjugate gradient optimizer using Hager-Zhang."""

from dataclasses import dataclass
from typing import Callable, List, Optional

from vec_ops import dot, norm, sub, add_scaled, negate, clone
from result_types import OptimizeOptions, OptimizeResult, default_options, check_convergence, is_converged, convergence_message
from hager_zhang import hager_zhang_line_search, HagerZhangOptions
from finite_diff import forward_diff_gradient


@dataclass
class ConjugateGradientOptions(OptimizeOptions):
    """Options for conjugate gradient, extending base optimization options."""
    eta: float = 0.4
    restart_interval: Optional[int] = None


def conjugate_gradient(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    options: Optional[ConjugateGradientOptions] = None
) -> OptimizeResult:
    """Minimize a function using nonlinear conjugate gradient with Hager-Zhang."""
    if options is None:
        options = ConjugateGradientOptions()

    grad_fn = grad if grad is not None else lambda x: forward_diff_gradient(f, x)

    n = len(x0)
    restart_interval = options.restart_interval if options.restart_interval is not None else n

    x = clone(x0)
    fx = f(x)
    gx = grad_fn(x)

    function_calls = 1
    gradient_calls = 1

    # Initial direction: steepest descent
    d = negate(gx)

    # Check initial convergence (gradient only, no step/func criteria at iteration 0)
    grad_norm = norm(gx)
    if grad_norm < options.grad_tol:
        return OptimizeResult(
            x=x,
            fun=fx,
            gradient=gx,
            iterations=0,
            function_calls=function_calls,
            gradient_calls=gradient_calls,
            converged=True,
            message="Converged: gradient norm below tolerance"
        )

    for iteration in range(1, options.max_iterations + 1):
        # Hager-Zhang line search
        hz_opts = HagerZhangOptions()
        ls_result = hager_zhang_line_search(f, grad_fn, x, d, fx, gx, hz_opts)
        function_calls += ls_result.function_calls
        gradient_calls += ls_result.gradient_calls

        if not ls_result.success:
            return OptimizeResult(
                x=x,
                fun=fx,
                gradient=gx,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                converged=False,
                message="Line search failed to find acceptable step"
            )

        # Update position
        x_new = add_scaled(x, d, ls_result.alpha)
        fx_new = ls_result.f_new
        gx_new = ls_result.g_new

        # Compute gradient change
        y_k = sub(gx_new, gx)

        # Move to new point
        s_k = sub(x_new, x)
        x = x_new
        fx_old = fx
        fx = fx_new
        g_old = gx
        gx = gx_new

        # Check convergence
        grad_norm = norm(gx)
        step_norm = norm(s_k)
        func_change = abs(fx - fx_old)

        reason = check_convergence(grad_norm, step_norm, func_change, iteration, options)
        if reason is not None:
            return OptimizeResult(
                x=x,
                fun=fx,
                gradient=gx,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                converged=is_converged(reason),
                message=convergence_message(reason)
            )

        # Compute HZ beta
        d_dot_y = dot(d, y_k)

        # Restart if denominator is near zero or periodic restart
        if abs(d_dot_y) < 1e-30 or iteration % restart_interval == 0:
            beta = 0.0
        else:
            y_dot_gx = dot(y_k, gx)
            y_dot_y = dot(y_k, y_k)
            d_dot_gx = dot(d, gx)

            beta_hz = (y_dot_gx - 2.0 * y_dot_y * d_dot_gx / d_dot_y) / d_dot_y

            # Eta guarantee
            d_norm = norm(d)
            g_old_norm = norm(g_old)
            eta_k = -1.0 / (d_norm * min(options.eta, g_old_norm))
            beta = max(beta_hz, eta_k)

        # Update direction
        d = [(-gx[i] + beta * d[i]) for i in range(n)]

        # Descent safety: restart if not descending
        if dot(d, gx) >= 0:
            d = negate(gx)

    # Should not reach here
    return OptimizeResult(
        x=x,
        fun=fx,
        gradient=gx,
        iterations=options.max_iterations,
        function_calls=function_calls,
        gradient_calls=gradient_calls,
        converged=False,
        message="Maximum iterations reached"
    )
