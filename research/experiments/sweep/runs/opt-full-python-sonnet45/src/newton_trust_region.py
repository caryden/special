"""
Newton's method with dogleg trust region.
"""

import math
from typing import Callable, List, Optional

from .vec_ops import dot, norm_inf, sub
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message,
)
from .finite_diff import forward_diff_gradient
from .finite_hessian import finite_diff_hessian
from .newton import cholesky_solve


def _mat_vec_mul(M: List[List[float]], v: List[float]) -> List[float]:
    n = len(v)
    return [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]


def _vec_norm(v: List[float]) -> float:
    return math.sqrt(sum(vi * vi for vi in v))


def dogleg_step(g: List[float], H: List[List[float]], delta: float) -> List[float]:
    """Solve trust region subproblem via dogleg method."""
    n = len(g)

    # Newton step: pN = -H^{-1} g
    neg_g = [-gi for gi in g]
    pN = cholesky_solve(H, neg_g)

    if pN is not None and _vec_norm(pN) <= delta:
        return pN

    # Cauchy point
    Hg = _mat_vec_mul(H, g)
    gHg = dot(g, Hg)
    g_norm_sq = dot(g, g)

    if gHg <= 0:
        g_norm = math.sqrt(g_norm_sq)
        s = delta / g_norm
        return [-s * gi for gi in g]

    alpha_c = g_norm_sq / gHg
    pC = [-alpha_c * gi for gi in g]
    pC_norm = _vec_norm(pC)

    if pC_norm >= delta:
        s = delta / pC_norm
        return [s * pi for pi in pC]

    if pN is None:
        return pC

    # Dogleg interpolation
    diff = [pN[i] - pC[i] for i in range(n)]
    a = dot(diff, diff)
    b = 2.0 * dot(pC, diff)
    c = dot(pC, pC) - delta * delta
    disc = b * b - 4.0 * a * c

    if disc < 0 or a <= 0:
        return pC

    tau = (-b + math.sqrt(disc)) / (2.0 * a)
    tau = max(0.0, min(1.0, tau))
    return [pC[i] + tau * diff[i] for i in range(n)]


def newton_trust_region(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    hess: Optional[Callable[[List[float]], List[List[float]]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    initial_delta: float = 1.0,
    max_delta: float = 100.0,
    eta: float = 0.1,
    **kwargs,
) -> OptimizeResult:
    """Minimize using Newton's method with trust region."""
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
    delta = initial_delta

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
        p = dogleg_step(gx, H, delta)

        x_trial = [x[i] + p[i] for i in range(n)]
        f_trial = f(x_trial)
        function_calls += 1

        # Predicted reduction
        Hp = _mat_vec_mul(H, p)
        predicted = -(dot(gx, p) + 0.5 * dot(p, Hp))
        actual = fx - f_trial
        rho = actual / predicted if predicted > 0 else 0.0

        # Update radius
        p_norm = _vec_norm(p)
        if rho < 0.25:
            delta = 0.25 * p_norm
        elif rho > 0.75 and p_norm >= 0.99 * delta:
            delta = min(2.0 * delta, max_delta)

        if rho > eta:
            g_new = grad_fn(x_trial)
            gradient_calls += 1

            sk = sub(x_trial, x)
            step_norm = norm_inf(sk)
            func_change = abs(actual)
            grad_norm = norm_inf(g_new)

            x = x_trial
            fx = f_trial
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
        else:
            if delta < 1e-15:
                return OptimizeResult(
                    x=x[:], fun=fx, gradient=gx[:],
                    iterations=iteration, function_calls=function_calls,
                    gradient_calls=gradient_calls, converged=False,
                    message="Stopped: trust region radius below minimum",
                )

    return OptimizeResult(
        x=x[:], fun=fx, gradient=gx[:],
        iterations=opts.max_iterations, function_calls=function_calls,
        gradient_calls=gradient_calls, converged=False,
        message=f"Stopped: reached maximum iterations ({opts.max_iterations})",
    )
