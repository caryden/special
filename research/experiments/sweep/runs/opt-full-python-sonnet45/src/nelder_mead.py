"""
Nelder-Mead derivative-free simplex optimizer.
"""

import math
from typing import Callable, List, Optional

from .vec_ops import add, scale, sub, zeros
from .result_types import OptimizeResult, default_options


def nelder_mead(
    f: Callable[[List[float]], float],
    x0: List[float],
    max_iterations: int = 1000,
    func_tol: float = 1e-12,
    step_tol: float = 1e-8,
    alpha: float = 1.0,
    gamma: float = 2.0,
    rho: float = 0.5,
    sigma: float = 0.5,
    initial_simplex_scale: float = 0.05,
    **kwargs,
) -> OptimizeResult:
    """Minimize using Nelder-Mead simplex method."""
    n = len(x0)
    function_calls = 0

    # Create initial simplex
    simplex = [x0[:]]
    for i in range(n):
        h = initial_simplex_scale * max(abs(x0[i]), 1.0)
        vertex = x0[:]
        vertex[i] += h
        simplex.append(vertex)

    # Evaluate function at all vertices
    f_values = []
    for v in simplex:
        f_values.append(f(v))
        function_calls += 1

    for iteration in range(1, max_iterations + 1):
        # Sort by function value
        indices = sorted(range(n + 1), key=lambda i: f_values[i])
        simplex = [simplex[i] for i in indices]
        f_values = [f_values[i] for i in indices]

        # Convergence: function value spread
        mean_f = sum(f_values) / (n + 1)
        std_f = math.sqrt(sum((fv - mean_f) ** 2 for fv in f_values) / (n + 1))
        if std_f < func_tol:
            return OptimizeResult(
                x=simplex[0][:], fun=f_values[0], gradient=None,
                iterations=iteration, function_calls=function_calls,
                gradient_calls=0, converged=True,
                message="Converged: function value spread below tolerance",
            )

        # Convergence: simplex diameter
        max_dist = 0.0
        for i in range(1, n + 1):
            dist = math.sqrt(sum((simplex[i][j] - simplex[0][j]) ** 2 for j in range(n)))
            max_dist = max(max_dist, dist)
        if max_dist < step_tol:
            return OptimizeResult(
                x=simplex[0][:], fun=f_values[0], gradient=None,
                iterations=iteration, function_calls=function_calls,
                gradient_calls=0, converged=True,
                message="Converged: simplex diameter below tolerance",
            )

        # Centroid of all except worst
        centroid = zeros(n)
        for i in range(n):
            for j in range(n):
                centroid[j] += simplex[i][j]
        centroid = scale(centroid, 1.0 / n)

        # Reflect
        worst = simplex[n]
        reflected = add(centroid, scale(sub(centroid, worst), alpha))
        f_reflected = f(reflected)
        function_calls += 1

        if f_values[0] <= f_reflected < f_values[n - 1]:
            simplex[n] = reflected
            f_values[n] = f_reflected
            continue

        # Expand
        if f_reflected < f_values[0]:
            expanded = add(centroid, scale(sub(reflected, centroid), gamma))
            f_expanded = f(expanded)
            function_calls += 1
            if f_expanded < f_reflected:
                simplex[n] = expanded
                f_values[n] = f_expanded
            else:
                simplex[n] = reflected
                f_values[n] = f_reflected
            continue

        # Contract
        if f_reflected < f_values[n]:
            # Outside contraction
            contracted = add(centroid, scale(sub(reflected, centroid), rho))
            f_contracted = f(contracted)
            function_calls += 1
            if f_contracted <= f_reflected:
                simplex[n] = contracted
                f_values[n] = f_contracted
                continue
        else:
            # Inside contraction
            contracted = add(centroid, scale(sub(worst, centroid), rho))
            f_contracted = f(contracted)
            function_calls += 1
            if f_contracted < f_values[n]:
                simplex[n] = contracted
                f_values[n] = f_contracted
                continue

        # Shrink
        for i in range(1, n + 1):
            simplex[i] = add(simplex[0], scale(sub(simplex[i], simplex[0]), sigma))
            f_values[i] = f(simplex[i])
            function_calls += 1

    # Sort one last time
    indices = sorted(range(n + 1), key=lambda i: f_values[i])
    simplex = [simplex[i] for i in indices]
    f_values = [f_values[i] for i in indices]

    return OptimizeResult(
        x=simplex[0][:], fun=f_values[0], gradient=None,
        iterations=max_iterations, function_calls=function_calls,
        gradient_calls=0, converged=False,
        message=f"Stopped: reached maximum iterations ({max_iterations})",
    )
