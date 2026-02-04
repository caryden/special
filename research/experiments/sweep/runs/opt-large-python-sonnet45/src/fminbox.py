"""Box-constrained optimization via logarithmic barrier method."""

import math
from dataclasses import dataclass
from typing import Callable, List, Optional

from vec_ops import norm_inf, clone
from result_types import OptimizeOptions, OptimizeResult, default_options
from bfgs import bfgs
from l_bfgs import lbfgs


@dataclass
class FminboxOptions(OptimizeOptions):
    """Options for box-constrained optimization."""
    lower: Optional[List[float]] = None
    upper: Optional[List[float]] = None
    method: str = "l-bfgs"
    mu0: Optional[float] = None
    mu_factor: float = 0.001
    outer_iterations: int = 20
    outer_grad_tol: float = 1e-8
    memory: int = 10  # For L-BFGS inner solver


def barrier_value(x: List[float], lower: List[float], upper: List[float]) -> float:
    """Compute logarithmic barrier value."""
    value = 0.0
    for i in range(len(x)):
        if math.isfinite(lower[i]):
            dx_lower = x[i] - lower[i]
            if dx_lower <= 0:
                return math.inf
            value -= math.log(dx_lower)

        if math.isfinite(upper[i]):
            dx_upper = upper[i] - x[i]
            if dx_upper <= 0:
                return math.inf
            value -= math.log(dx_upper)

    return value


def barrier_gradient(x: List[float], lower: List[float], upper: List[float]) -> List[float]:
    """Compute logarithmic barrier gradient."""
    grad = [0.0] * len(x)
    for i in range(len(x)):
        if math.isfinite(lower[i]):
            grad[i] -= 1.0 / (x[i] - lower[i])

        if math.isfinite(upper[i]):
            grad[i] += 1.0 / (upper[i] - x[i])

    return grad


def projected_gradient_norm(
    x: List[float],
    g: List[float],
    lower: List[float],
    upper: List[float]
) -> float:
    """Compute infinity norm of projected gradient."""
    proj_grad = []
    for i in range(len(x)):
        # Project: x - clamp(x - g, lower, upper)
        x_minus_g = x[i] - g[i]
        clamped = max(lower[i], min(upper[i], x_minus_g))
        proj_grad.append(x[i] - clamped)

    return norm_inf(proj_grad)


def fminbox(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Callable[[List[float]], List[float]],
    options: Optional[FminboxOptions] = None
) -> OptimizeResult:
    """Box-constrained optimization using logarithmic barrier method."""
    if options is None:
        options = FminboxOptions()

    n = len(x0)

    # Default bounds
    lower = options.lower if options.lower is not None else [-math.inf] * n
    upper = options.upper if options.upper is not None else [math.inf] * n

    # Validate bounds
    for i in range(n):
        if lower[i] >= upper[i]:
            return OptimizeResult(
                x=x0,
                fun=math.inf,
                gradient=None,
                iterations=0,
                function_calls=0,
                gradient_calls=0,
                converged=False,
                message="Invalid bounds: lower >= upper"
            )

    # Nudge x0 to strict interior
    x = clone(x0)
    for i in range(n):
        if x[i] <= lower[i]:
            if math.isfinite(upper[i]):
                x[i] = 0.99 * lower[i] + 0.01 * upper[i]
            else:
                x[i] = lower[i] + 1.0
        elif x[i] >= upper[i]:
            if math.isfinite(lower[i]):
                x[i] = 0.01 * lower[i] + 0.99 * upper[i]
            else:
                x[i] = upper[i] - 1.0
        elif x[i] == lower[i]:
            if math.isfinite(upper[i]):
                x[i] = 0.99 * lower[i] + 0.01 * upper[i]
            else:
                x[i] = lower[i] + 1.0
        elif x[i] == upper[i]:
            if math.isfinite(lower[i]):
                x[i] = 0.01 * lower[i] + 0.99 * upper[i]
            else:
                x[i] = upper[i] - 1.0

    # Initialize mu
    g_obj = grad(x)
    g_bar = barrier_gradient(x, lower, upper)

    if options.mu0 is not None:
        mu = options.mu0
    else:
        # Auto-initialize from gradient ratio
        g_obj_l1 = sum(abs(g) for g in g_obj)
        g_bar_l1 = sum(abs(g) for g in g_bar)
        if g_bar_l1 > 1e-30:
            mu = options.mu_factor * g_obj_l1 / g_bar_l1
        else:
            mu = 1.0

    # Inner optimizer dispatch
    solvers = {
        "bfgs": bfgs,
        "l-bfgs": lbfgs,
    }

    if options.method not in solvers:
        return OptimizeResult(
            x=x0,
            fun=math.inf,
            gradient=None,
            iterations=0,
            function_calls=0,
            gradient_calls=0,
            converged=False,
            message=f"Unknown method: {options.method}"
        )

    inner_solver = solvers[options.method]

    total_function_calls = 0
    total_gradient_calls = 0

    for outer_iter in range(options.outer_iterations):
        # Create barrier-augmented objective
        def f_aug(x_inner):
            return f(x_inner) + mu * barrier_value(x_inner, lower, upper)

        def grad_aug(x_inner):
            g_obj = grad(x_inner)
            g_bar = barrier_gradient(x_inner, lower, upper)
            return [g_obj[i] + mu * g_bar[i] for i in range(n)]

        # Solve inner problem
        inner_result = inner_solver(f_aug, x, grad_aug, options)
        total_function_calls += inner_result.function_calls
        total_gradient_calls += inner_result.gradient_calls

        # Clamp to strict interior (numerical safety)
        x = inner_result.x
        for i in range(n):
            if math.isfinite(lower[i]) and math.isfinite(upper[i]):
                x[i] = max(lower[i] + 1e-15, min(upper[i] - 1e-15, x[i]))
            elif math.isfinite(lower[i]):
                x[i] = max(lower[i] + 1e-15, x[i])
            elif math.isfinite(upper[i]):
                x[i] = min(upper[i] - 1e-15, x[i])

        # Check projected gradient norm of original objective
        g_obj = grad(x)
        proj_grad_norm = projected_gradient_norm(x, g_obj, lower, upper)

        if proj_grad_norm < options.outer_grad_tol:
            fx = f(x)
            return OptimizeResult(
                x=x,
                fun=fx,
                gradient=g_obj,
                iterations=outer_iter + 1,
                function_calls=total_function_calls,
                gradient_calls=total_gradient_calls,
                converged=True,
                message="Converged: projected gradient norm below tolerance"
            )

        # Reduce mu
        mu *= options.mu_factor

    # Outer iterations exhausted
    fx = f(x)
    g_obj = grad(x)
    return OptimizeResult(
        x=x,
        fun=fx,
        gradient=g_obj,
        iterations=options.outer_iterations,
        function_calls=total_function_calls,
        gradient_calls=total_gradient_calls,
        converged=False,
        message="Maximum outer iterations reached"
    )
