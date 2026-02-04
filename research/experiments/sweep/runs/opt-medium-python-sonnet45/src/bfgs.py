"""
bfgs — BFGS quasi-Newton optimizer.

Full-memory BFGS with inverse Hessian approximation.
"""

from typing import Callable, Optional
import vec_ops
from result_types import OptimizeOptions, OptimizeResult, default_options, check_convergence, convergence_message
from line_search import wolfe_line_search
from finite_diff import forward_diff_gradient


def identity_matrix(n: int) -> list[list[float]]:
    """Create n×n identity matrix as list of row lists."""
    matrix = []
    for i in range(n):
        row = [0.0] * n
        row[i] = 1.0
        matrix.append(row)
    return matrix


def mat_vec_mul(M: list[list[float]], v: list[float]) -> list[float]:
    """Matrix-vector multiplication (M is list of row lists)."""
    return [vec_ops.dot(row, v) for row in M]


def bfgs_update(
    H: list[list[float]],
    s: list[float],
    y: list[float],
    rho: float
) -> list[list[float]]:
    """
    Apply BFGS inverse Hessian update formula.

    H_{k+1} = (I - rho*s*y^T) * H * (I - rho*y*s^T) + rho*s*s^T
    where rho = 1/(y^T*s)

    Using efficient expanded form:
    H_ij - rho*(s_i*Hy_j + Hy_i*s_j) + rho*(1 + rho*y^T*H*y)*s_i*s_j
    """
    n = len(s)
    Hy = mat_vec_mul(H, y)
    yHy = vec_ops.dot(y, Hy)

    H_new = []
    for i in range(n):
        row = []
        for j in range(n):
            row.append(
                H[i][j] -
                rho * (s[i] * Hy[j] + Hy[i] * s[j]) +
                rho * (1 + rho * yHy) * s[i] * s[j]
            )
        H_new.append(row)

    return H_new


def bfgs(
    f: Callable[[list[float]], float],
    x0: list[float],
    grad: Optional[Callable[[list[float]], list[float]]] = None,
    options: Optional[OptimizeOptions] = None
) -> OptimizeResult:
    """
    Minimize a function using BFGS quasi-Newton method.

    Args:
        f: Objective function
        x0: Initial point
        grad: Gradient function (optional, uses finite differences if not provided)
        options: Optimization options

    Returns:
        OptimizeResult with solution and diagnostics
    """
    opts = default_options(options)

    # Use finite differences if no gradient provided
    grad_fn = grad if grad is not None else lambda x: forward_diff_gradient(f, x)

    n = len(x0)
    x = vec_ops.clone(x0)
    H = identity_matrix(n)

    function_calls = 0
    gradient_calls = 0

    # Initial evaluation
    fx = f(x)
    function_calls += 1

    gx = grad_fn(x)
    gradient_calls += 1

    # Check if already at minimum (use infinity norm)
    grad_norm = vec_ops.norm_inf(gx)
    initial_reason = check_convergence(grad_norm, float('inf'), float('inf'), 0, opts)
    if initial_reason and initial_reason["kind"] in ("gradient", "step", "function"):
        return OptimizeResult(
            x=x,
            fun=fx,
            gradient=gx,
            iterations=0,
            function_calls=function_calls,
            gradient_calls=gradient_calls,
            converged=True,
            message=convergence_message(initial_reason)
        )

    for iteration in range(1, opts["max_iterations"] + 1):
        # Compute search direction: d = -H * g
        d = vec_ops.negate(mat_vec_mul(H, gx))

        # Perform Strong Wolfe line search
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
                message="Stopped: line search failed"
            )

        # Update position
        x_new = vec_ops.add_scaled(x, d, ls_result.alpha)
        fx_new = ls_result.f_new
        gx_new = ls_result.g_new if ls_result.g_new is not None else grad_fn(x_new)

        if ls_result.g_new is None:
            gradient_calls += 1

        # Compute step and gradient change
        s = vec_ops.sub(x_new, x)
        y = vec_ops.sub(gx_new, gx)

        # Use infinity norm for convergence checks
        step_norm = vec_ops.norm_inf(s)
        grad_norm = vec_ops.norm_inf(gx_new)
        func_change = abs(fx_new - fx)

        # Update state
        x = x_new
        fx = fx_new
        gx = gx_new

        # Check convergence
        reason = check_convergence(grad_norm, step_norm, func_change, iteration, opts)
        if reason is not None:
            return OptimizeResult(
                x=x,
                fun=fx,
                gradient=gx,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=gradient_calls,
                converged=(reason["kind"] in ("gradient", "step", "function")),
                message=convergence_message(reason)
            )

        # Curvature condition check - skip BFGS update if not satisfied
        ys = vec_ops.dot(y, s)
        if ys <= 1e-10:
            continue

        # Update inverse Hessian approximation
        rho = 1.0 / ys
        H = bfgs_update(H, s, y, rho)

    # Max iterations reached - this shouldn't normally be reached
    return OptimizeResult(
        x=x,
        fun=fx,
        gradient=gx,
        iterations=opts["max_iterations"],
        function_calls=function_calls,
        gradient_calls=gradient_calls,
        converged=False,
        message="Stopped: maximum iterations reached"
    )
