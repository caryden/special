"""
Full-memory BFGS quasi-Newton optimizer.
"""

from typing import Callable, List, Optional

from .vec_ops import dot, norm_inf, sub, add_scaled, negate
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message,
)
from .line_search import wolfe_line_search
from .finite_diff import forward_diff_gradient


def identity_matrix(n: int) -> List[List[float]]:
    return [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]


def mat_vec_mul(M: List[List[float]], v: List[float]) -> List[float]:
    n = len(v)
    return [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]


def bfgs_update(H: List[List[float]], s: List[float], y: List[float], rho_val: float) -> List[List[float]]:
    """BFGS inverse Hessian update: H_{k+1} = (I - rho*s*y^T)*H*(I - rho*y*s^T) + rho*s*s^T"""
    n = len(s)
    # Compute H*y
    Hy = mat_vec_mul(H, y)
    # Compute y^T*H
    yTH = [sum(y[i] * H[i][j] for i in range(n)) for j in range(n)]
    # Compute y^T*H*y
    yTHy = sum(y[i] * Hy[i] for i in range(n))

    H_new = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            H_new[i][j] = (
                H[i][j]
                - rho_val * (s[i] * yTH[j] + Hy[i] * s[j])
                + rho_val * (rho_val * yTHy + 1.0) * s[i] * s[j]
            )
    return H_new


def bfgs(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    **kwargs,
) -> OptimizeResult:
    """Minimize using BFGS quasi-Newton method."""
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

    H = identity_matrix(n)

    for iteration in range(1, opts.max_iterations + 1):
        d = negate(mat_vec_mul(H, gx))

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
            rho_val = 1.0 / ys
            H = bfgs_update(H, sk, yk, rho_val)

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
