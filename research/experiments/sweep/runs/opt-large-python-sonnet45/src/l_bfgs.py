"""Limited-memory BFGS optimizer."""

from collections import deque
from typing import Callable, List, Optional
from dataclasses import dataclass

from vec_ops import dot, norm, sub, add_scaled, negate, clone
from result_types import OptimizeOptions, OptimizeResult, default_options, check_convergence, is_converged, convergence_message
from line_search import wolfe_line_search
from finite_diff import forward_diff_gradient


@dataclass
class LBFGSOptions(OptimizeOptions):
    """Options for L-BFGS, extending base optimization options."""
    memory: int = 10


def lbfgs(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    options: Optional[LBFGSOptions] = None
) -> OptimizeResult:
    """Minimize a function using L-BFGS."""
    if options is None:
        options = LBFGSOptions()

    grad_fn = grad if grad is not None else lambda x: forward_diff_gradient(f, x)

    x = clone(x0)
    fx = f(x)
    gx = grad_fn(x)

    function_calls = 1
    gradient_calls = 1

    # History storage (circular buffers via deque)
    memory = options.memory
    s_history = deque(maxlen=memory)
    y_history = deque(maxlen=memory)
    rho_history = deque(maxlen=memory)

    gamma = 1.0

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
        # Compute search direction via two-loop recursion
        if len(s_history) == 0:
            # First iteration: steepest descent
            d = negate(gx)
        else:
            # Two-loop recursion
            q = clone(gx)
            alphas = []

            # First loop (backward through history)
            for s_k, y_k, rho_k in zip(reversed(s_history), reversed(y_history), reversed(rho_history)):
                alpha_i = rho_k * dot(s_k, q)
                alphas.append(alpha_i)
                q = add_scaled(q, y_k, -alpha_i)

            # Apply initial Hessian approximation
            r = [gamma * q_i for q_i in q]

            # Second loop (forward through history)
            alphas.reverse()
            for idx, (s_k, y_k, rho_k) in enumerate(zip(s_history, y_history, rho_history)):
                beta = rho_k * dot(y_k, r)
                r = add_scaled(r, s_k, alphas[idx] - beta)

            d = negate(r)

        # Line search
        ls_result = wolfe_line_search(f, grad_fn, x, d, fx, gx)
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

        # Compute s and y
        s_k = sub(x_new, x)
        y_k = sub(gx_new, gx)

        # Curvature check
        ys = dot(y_k, s_k)
        if ys > 1e-10:
            # Update history
            s_history.append(s_k)
            y_history.append(y_k)
            rho_k = 1.0 / ys
            rho_history.append(rho_k)

            # Update gamma (initial Hessian scaling)
            yy = dot(y_k, y_k)
            gamma = ys / yy

        # Move to new point
        x = x_new
        fx_old = fx
        fx = fx_new
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
