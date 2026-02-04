"""
BFGS (Broyden-Fletcher-Goldfarb-Shanno) quasi-Newton optimization.

Maintains an approximation to the inverse Hessian matrix, updated at each
step using gradient information.

Provenance: Nocedal & Wright, Numerical Optimization, Chapter 6 (Eq. 6.17)
"""

from typing import Callable, Optional

from vec_ops import dot, sub, negate, norm_inf, add_scaled
from result_types import (
    OptimizeResult,
    OptimizeOptions,
    default_options,
    check_convergence,
    is_converged,
    convergence_message,
)
from line_search import wolfe_line_search
from finite_diff import forward_diff_gradient


def identity_matrix(n: int) -> list[list[float]]:
    """Create an n x n identity matrix as list of row lists."""
    return [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]


def mat_vec_mul(m: list[list[float]], v: list[float]) -> list[float]:
    """Matrix-vector multiply: result = M * v."""
    n = len(v)
    return [sum(m[i][j] * v[j] for j in range(n)) for i in range(n)]


def bfgs_update(
    h: list[list[float]],
    s: list[float],
    y: list[float],
    rho: float,
) -> list[list[float]]:
    """
    BFGS inverse Hessian update.
    H_{k+1} = (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
    """
    n = len(s)
    hy = mat_vec_mul(h, y)
    y_hy = dot(y, hy)

    h_new = []
    for i in range(n):
        row = [0.0] * n
        for j in range(n):
            row[j] = (
                h[i][j]
                - rho * (s[i] * hy[j] + hy[i] * s[j])
                + rho * (1.0 + rho * y_hy) * s[i] * s[j]
            )
        h_new.append(row)

    return h_new


def bfgs(
    f: Callable[[list[float]], float],
    x0: list[float],
    grad: Optional[Callable[[list[float]], list[float]]] = None,
    options: Optional[dict] = None,
) -> OptimizeResult:
    """
    Minimize a function using the BFGS quasi-Newton method.
    If no gradient function is provided, forward finite differences are used.
    """
    opts = default_options(**(options or {}))
    n = len(x0)

    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))

    x = x0[:]
    fx = f(x)
    gx = grad_fn(x)
    function_calls = 1
    gradient_calls = 1

    # Initialize inverse Hessian approximation as identity
    h = identity_matrix(n)

    # Check if already at a minimum
    grad_norm = norm_inf(gx)
    initial_check = check_convergence(grad_norm, float("inf"), float("inf"), 0, opts)
    if initial_check and is_converged(initial_check):
        return OptimizeResult(
            x=x,
            fun=fx,
            gradient=gx[:],
            iterations=0,
            function_calls=function_calls,
            gradient_calls=gradient_calls,
            converged=True,
            message=convergence_message(initial_check),
        )

    for iteration in range(1, opts.max_iterations + 1):
        # Search direction: d = -H * g
        d = negate(mat_vec_mul(h, gx))

        # Line search (Strong Wolfe)
        ls = wolfe_line_search(f, grad_fn, x, d, fx, gx)
        function_calls += ls.function_calls
        gradient_calls += ls.gradient_calls

        if not ls.success:
            return OptimizeResult(
                x=x,
                fun=fx,
                gradient=gx[:],
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                converged=False,
                message="Stopped: line search failed to find acceptable step",
            )

        # Step and gradient difference
        x_new = add_scaled(x, d, ls.alpha)
        f_new = ls.f_new
        g_new = ls.g_new if ls.g_new is not None else grad_fn(x_new)
        if ls.g_new is None:
            gradient_calls += 1

        sk = sub(x_new, x)
        yk = sub(g_new, gx)

        step_norm = norm_inf(sk)
        func_change = abs(f_new - fx)
        grad_norm = norm_inf(g_new)

        # Update state
        x = x_new
        fx = f_new
        gx = g_new

        # Check convergence
        reason = check_convergence(grad_norm, step_norm, func_change, iteration, opts)
        if reason:
            return OptimizeResult(
                x=x[:],
                fun=fx,
                gradient=gx[:],
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                converged=is_converged(reason),
                message=convergence_message(reason),
            )

        # BFGS inverse Hessian update
        ys = dot(yk, sk)

        # Curvature guard: skip update if yk . sk <= 1e-10
        if ys <= 1e-10:
            continue

        rho = 1.0 / ys
        h = bfgs_update(h, sk, yk, rho)

    return OptimizeResult(
        x=x[:],
        fun=fx,
        gradient=gx[:],
        iterations=opts.max_iterations,
        function_calls=function_calls,
        gradient_calls=gradient_calls,
        converged=False,
        message=f"Stopped: reached maximum iterations ({opts.max_iterations})",
    )
