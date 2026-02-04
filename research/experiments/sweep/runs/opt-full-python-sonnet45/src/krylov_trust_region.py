"""
Krylov Trust Region with Steihaug-Toint truncated CG.
"""

import math
from typing import Callable, List, Optional

from .vec_ops import dot, norm_inf
from .result_types import (
    OptimizeResult, default_options, check_convergence,
    is_converged, convergence_message,
)
from .finite_diff import forward_diff_gradient
from .finite_hessian import hessian_vector_product


def _norm2(v: List[float]) -> float:
    return sum(vi * vi for vi in v)


def _boundary_tau(z: List[float], d: List[float], radius: float) -> float:
    a = dot(d, d)
    b = 2.0 * dot(z, d)
    c = dot(z, z) - radius * radius
    disc = b * b - 4.0 * a * c
    return (-b + math.sqrt(max(0.0, disc))) / (2.0 * a)


def steihaug_cg(
    grad_fn: Callable[[List[float]], List[float]],
    x: List[float],
    gx: List[float],
    radius: float,
    cg_tol: float,
):
    """Steihaug-Toint truncated CG subproblem solver."""
    n = len(x)
    z = [0.0] * n
    r = gx[:]
    d = [-ri for ri in r]

    rho0 = dot(r, r)
    rho_prev = rho0
    grad_calls = 0
    on_boundary = False

    for _ in range(n):
        Hd = hessian_vector_product(grad_fn, x, d, gx)
        grad_calls += 1
        dHd = dot(d, Hd)

        if abs(dHd) < 1e-15:
            break

        alpha_val = rho_prev / dHd

        # Check negative curvature or exceeding radius
        z_trial = [z[j] + alpha_val * d[j] for j in range(n)]
        if dHd < 0 or _norm2(z_trial) >= radius * radius:
            tau = _boundary_tau(z, d, radius)
            z = [z[j] + tau * d[j] for j in range(n)]
            on_boundary = True
            break

        z = z_trial

        for j in range(n):
            r[j] += alpha_val * Hd[j]
        rho_next = dot(r, r)

        if rho_next / rho0 < cg_tol * cg_tol:
            break

        beta = rho_next / rho_prev
        d = [-r[j] + beta * d[j] for j in range(n)]
        rho_prev = rho_next

    # Compute model decrease
    Hz = hessian_vector_product(grad_fn, x, z, gx)
    grad_calls += 1
    m_decrease = dot(gx, z) + 0.5 * dot(z, Hz)

    return z, m_decrease, grad_calls - 1, on_boundary, grad_calls


def krylov_trust_region(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    initial_radius: float = 1.0,
    max_radius: float = 100.0,
    eta: float = 0.1,
    rho_lower: float = 0.25,
    rho_upper: float = 0.75,
    cg_tol: float = 0.01,
    **kwargs,
) -> OptimizeResult:
    """Minimize using Krylov Trust Region (Steihaug-Toint)."""
    opts = default_options(grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
                           max_iterations=max_iterations)
    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))

    n = len(x0)
    x = x0[:]
    fx = f(x)
    gx = grad_fn(x)
    function_calls = 1
    gradient_calls = 1
    radius = initial_radius

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
        s, m_decrease, cg_iters, on_boundary, gcalls = steihaug_cg(grad_fn, x, gx, radius, cg_tol)
        gradient_calls += gcalls

        x_new = [x[i] + s[i] for i in range(n)]
        f_new = f(x_new)
        function_calls += 1

        actual = fx - f_new
        predicted = -m_decrease

        rho = actual / predicted if predicted > 0 else 0.0

        s_norm = math.sqrt(_norm2(s))
        interior = s_norm < 0.9 * radius

        if rho < rho_lower:
            radius *= 0.25
        elif rho > rho_upper and not interior:
            radius = min(2.0 * radius, max_radius)

        if rho > eta:
            f_prev = fx
            x = x_new
            fx = f_new
            gx = grad_fn(x)
            gradient_calls += 1

            grad_norm = norm_inf(gx)
            func_change = abs(f_prev - fx)
            reason = check_convergence(grad_norm, s_norm, func_change, iteration, opts)
            if reason:
                return OptimizeResult(
                    x=x[:], fun=fx, gradient=gx[:],
                    iterations=iteration, function_calls=function_calls,
                    gradient_calls=gradient_calls,
                    converged=is_converged(reason),
                    message=convergence_message(reason),
                )
        else:
            if radius < 1e-15:
                return OptimizeResult(
                    x=x[:], fun=fx, gradient=gx[:],
                    iterations=iteration, function_calls=function_calls,
                    gradient_calls=gradient_calls, converged=False,
                    message="Trust region radius too small",
                )

    return OptimizeResult(
        x=x[:], fun=fx, gradient=gx[:],
        iterations=opts.max_iterations, function_calls=function_calls,
        gradient_calls=gradient_calls, converged=False,
        message=f"Stopped: reached maximum iterations ({opts.max_iterations})",
    )
