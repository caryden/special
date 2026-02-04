"""
Box-constrained optimization via logarithmic barrier method.
"""

import math
from typing import Callable, List, Optional

from .vec_ops import norm_inf
from .result_types import OptimizeResult, default_options
from .bfgs import bfgs
from .l_bfgs import lbfgs
from .conjugate_gradient import conjugate_gradient
from .gradient_descent import gradient_descent


def barrier_value(x: List[float], lower: List[float], upper: List[float]) -> float:
    """Log-barrier value: sum(-log(x_i - l_i) - log(u_i - x_i))."""
    val = 0.0
    for i in range(len(x)):
        if math.isfinite(lower[i]):
            dxl = x[i] - lower[i]
            if dxl <= 0:
                return float('inf')
            val -= math.log(dxl)
        if math.isfinite(upper[i]):
            dxu = upper[i] - x[i]
            if dxu <= 0:
                return float('inf')
            val -= math.log(dxu)
    return val


def barrier_gradient(x: List[float], lower: List[float], upper: List[float]) -> List[float]:
    """Barrier gradient: -1/(x_i - l_i) + 1/(u_i - x_i)."""
    g = [0.0] * len(x)
    for i in range(len(x)):
        if math.isfinite(lower[i]):
            g[i] += -1.0 / (x[i] - lower[i])
        if math.isfinite(upper[i]):
            g[i] += 1.0 / (upper[i] - x[i])
    return g


def projected_gradient_norm(
    x: List[float], g: List[float], lower: List[float], upper: List[float]
) -> float:
    """Projected gradient infinity norm for box constraints."""
    max_val = 0.0
    for i in range(len(x)):
        projected = x[i] - max(lower[i], min(upper[i], x[i] - g[i]))
        max_val = max(max_val, abs(projected))
    return max_val


def fminbox(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Callable[[List[float]], List[float]],
    lower: Optional[List[float]] = None,
    upper: Optional[List[float]] = None,
    method: str = "l-bfgs",
    mu0: Optional[float] = None,
    mu_factor: float = 0.01,
    outer_iterations: int = 50,
    outer_grad_tol: float = 1e-8,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    **kwargs,
) -> OptimizeResult:
    """Minimize with box constraints via log-barrier."""
    n = len(x0)
    if lower is None:
        lower = [float('-inf')] * n
    if upper is None:
        upper = [float('inf')] * n

    # Validate bounds
    for i in range(n):
        if lower[i] >= upper[i]:
            return OptimizeResult(
                x=x0[:], fun=f(x0), gradient=grad(x0),
                iterations=0, function_calls=1, gradient_calls=1,
                converged=False, message="Invalid bounds: lower >= upper",
            )

    # Nudge x to strict interior
    x = x0[:]
    for i in range(n):
        if x[i] <= lower[i] or x[i] >= upper[i]:
            if x[i] <= lower[i]:
                if math.isfinite(lower[i]) and math.isfinite(upper[i]):
                    x[i] = 0.99 * lower[i] + 0.01 * upper[i]
                elif math.isfinite(lower[i]):
                    x[i] = lower[i] + 1.0
                else:
                    x[i] = 0.0
            else:
                if math.isfinite(lower[i]) and math.isfinite(upper[i]):
                    x[i] = 0.01 * lower[i] + 0.99 * upper[i]
                elif math.isfinite(upper[i]):
                    x[i] = upper[i] - 1.0
                else:
                    x[i] = 0.0

    function_calls = 0
    gradient_calls = 0

    fx = f(x)
    gx = grad(x)
    function_calls += 1
    gradient_calls += 1

    # Compute initial mu
    if mu0 is not None:
        mu = mu0
    else:
        obj_grad_l1 = sum(abs(gi) for gi in gx)
        bg = barrier_gradient(x, lower, upper)
        bar_grad_l1 = sum(abs(gi) for gi in bg)
        mu = mu_factor * obj_grad_l1 / bar_grad_l1 if bar_grad_l1 > 0 else 1e-4

    # Check initial convergence
    pgn = projected_gradient_norm(x, gx, lower, upper)
    if pgn <= outer_grad_tol:
        return OptimizeResult(
            x=x[:], fun=fx, gradient=gx[:],
            iterations=0, function_calls=function_calls,
            gradient_calls=gradient_calls, converged=True,
            message="Converged: projected gradient norm below tolerance",
        )

    solvers = {
        "bfgs": bfgs,
        "l-bfgs": lbfgs,
        "conjugate-gradient": conjugate_gradient,
        "gradient-descent": gradient_descent,
    }
    solver = solvers.get(method, lbfgs)

    outer_iter = 0
    for outer_iter in range(1, outer_iterations + 1):
        current_mu = mu

        def barrier_f(xp):
            bv = barrier_value(xp, lower, upper)
            if not math.isfinite(bv):
                return float('inf')
            return f(xp) + current_mu * bv

        def barrier_grad_fn(xp):
            g_obj = grad(xp)
            g_bar = barrier_gradient(xp, lower, upper)
            return [g_obj[i] + current_mu * g_bar[i] for i in range(n)]

        inner = solver(
            barrier_f, x, barrier_grad_fn,
            grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
            max_iterations=max_iterations,
        )

        x = inner.x
        for i in range(n):
            if math.isfinite(lower[i]):
                x[i] = max(lower[i] + 1e-15, x[i])
            if math.isfinite(upper[i]):
                x[i] = min(upper[i] - 1e-15, x[i])

        fx = f(x)
        gx = grad(x)
        function_calls += inner.function_calls + 1
        gradient_calls += inner.gradient_calls + 1

        pgn = projected_gradient_norm(x, gx, lower, upper)
        if pgn <= outer_grad_tol:
            return OptimizeResult(
                x=x[:], fun=fx, gradient=gx[:],
                iterations=outer_iter, function_calls=function_calls,
                gradient_calls=gradient_calls, converged=True,
                message="Converged: projected gradient norm below tolerance",
            )

        mu *= mu_factor

    return OptimizeResult(
        x=x[:], fun=fx, gradient=gx[:],
        iterations=outer_iter, function_calls=function_calls,
        gradient_calls=gradient_calls, converged=False,
        message=f"Stopped: reached maximum outer iterations ({outer_iterations})",
    )
