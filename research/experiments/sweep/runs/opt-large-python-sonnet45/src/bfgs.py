"""Full-memory BFGS quasi-Newton optimizer."""

from typing import Callable, List, Optional

from vec_ops import dot, norm, sub, add_scaled, negate, clone
from result_types import OptimizeOptions, OptimizeResult, default_options, check_convergence, is_converged, convergence_message
from line_search import wolfe_line_search
from finite_diff import forward_diff_gradient


def identity_matrix(n: int) -> List[List[float]]:
    """Create an n×n identity matrix."""
    return [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]


def mat_vec_mul(M: List[List[float]], v: List[float]) -> List[float]:
    """Matrix-vector product."""
    n = len(v)
    return [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]


def bfgs_update(H: List[List[float]], s: List[float], y: List[float], rho: float) -> List[List[float]]:
    """Apply BFGS inverse Hessian update."""
    n = len(s)
    I = identity_matrix(n)

    # Compute (I - rho * s * y^T)
    A = [[I[i][j] - rho * s[i] * y[j] for j in range(n)] for i in range(n)]

    # Compute (I - rho * y * s^T)
    B = [[I[i][j] - rho * y[i] * s[j] for j in range(n)] for i in range(n)]

    # Compute A * H * B
    HB = [[sum(H[i][k] * B[k][j] for k in range(n)) for j in range(n)] for i in range(n)]
    AHB = [[sum(A[i][k] * HB[k][j] for k in range(n)) for j in range(n)] for i in range(n)]

    # Add rho * s * s^T
    H_new = [[AHB[i][j] + rho * s[i] * s[j] for j in range(n)] for i in range(n)]

    return H_new


def bfgs(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    options: Optional[OptimizeOptions] = None
) -> OptimizeResult:
    """Minimize a function using BFGS."""
    if options is None:
        options = default_options()

    grad_fn = grad if grad is not None else lambda x: forward_diff_gradient(f, x)

    x = clone(x0)
    fx = f(x)
    gx = grad_fn(x)

    function_calls = 1
    gradient_calls = 1

    n = len(x)
    H = identity_matrix(n)

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
        # Compute search direction: d = -H * g
        d = negate(mat_vec_mul(H, gx))

        # Strong Wolfe line search
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

        # Compute step and gradient change
        s_k = sub(x_new, x)
        y_k = sub(gx_new, gx)

        # Curvature check
        ys = dot(y_k, s_k)
        if ys > 1e-10:
            # BFGS update
            rho = 1.0 / ys
            H = bfgs_update(H, s_k, y_k, rho)

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
