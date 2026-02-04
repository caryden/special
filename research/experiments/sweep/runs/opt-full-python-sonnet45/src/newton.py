"""
Newton's method with Cholesky solve and modified Newton regularization.
"""

import math
from typing import Callable, List, Optional

from .vec_ops import dot, norm_inf, sub, add_scaled, negate
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message,
)
from .line_search import wolfe_line_search
from .finite_diff import forward_diff_gradient
from .finite_hessian import finite_diff_hessian


def cholesky_solve(A: List[List[float]], b: List[float]) -> Optional[List[float]]:
    """Solve A*x = b via Cholesky. Returns None if not positive definite."""
    n = len(b)
    if n == 0:
        return []
    L = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                diag = A[i][i] - s
                if diag <= 0:
                    return None
                L[i][j] = math.sqrt(diag)
            else:
                L[i][j] = (A[i][j] - s) / L[j][j]

    # Forward substitution: Ly = b
    y = [0.0] * n
    for i in range(n):
        s = sum(L[i][j] * y[j] for j in range(i))
        y[i] = (b[i] - s) / L[i][i]

    # Back substitution: L^T x = y
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = sum(L[j][i] * x[j] for j in range(i + 1, n))
        x[i] = (y[i] - s) / L[i][i]

    return x


def newton(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    hess: Optional[Callable[[List[float]], List[List[float]]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    initial_tau: float = 1e-8,
    tau_factor: float = 10.0,
    max_regularize: int = 20,
    **kwargs,
) -> OptimizeResult:
    """Minimize using Newton's method with line search."""
    opts = default_options(grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
                           max_iterations=max_iterations)
    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))
    hess_fn = hess if hess is not None else (lambda x: finite_diff_hessian(f, x))

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

    for iteration in range(1, opts.max_iterations + 1):
        H = hess_fn(x)
        neg_g = [-gi for gi in gx]

        # Try Cholesky with regularization
        d = cholesky_solve(H, neg_g)
        if d is None:
            tau = initial_tau
            for _ in range(max_regularize):
                H_reg = [row[:] for row in H]
                for i in range(n):
                    H_reg[i][i] += tau
                d = cholesky_solve(H_reg, neg_g)
                if d is not None:
                    break
                tau *= tau_factor
            if d is None:
                return OptimizeResult(
                    x=x[:], fun=fx, gradient=gx[:],
                    iterations=iteration, function_calls=function_calls,
                    gradient_calls=gradient_calls, converged=False,
                    message="Stopped: regularization failed",
                )

        # Descent check
        if dot(d, gx) >= 0:
            d = negate(gx)

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

        step_norm = norm_inf(sub(x_new, x))
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
