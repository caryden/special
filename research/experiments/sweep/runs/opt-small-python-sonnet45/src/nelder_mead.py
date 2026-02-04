"""nelder-mead: Derivative-free simplex optimizer.

Maintains n+1 vertices in n dimensions. At each step, replaces the worst vertex
via reflection, expansion, contraction, or shrinkage.
"""

import math
from typing import Callable, List, Optional
from result_types import (
    OptimizeOptions, OptimizeResult, default_options, convergence_message
)
from vec_ops import add, sub, scale, add_scaled, norm


def nelder_mead(
    f: Callable[[List[float]], float],
    x0: List[float],
    options: Optional[OptimizeOptions] = None
) -> OptimizeResult:
    """Minimize a function using the Nelder-Mead simplex algorithm.

    Args:
        f: Objective function to minimize
        x0: Initial point
        options: Optimization options (uses defaults if None)

    Returns:
        OptimizeResult with gradient=None and gradient_calls=0
    """
    if options is None:
        options = default_options()

    # Algorithm parameters
    alpha = 1.0   # Reflection coefficient
    gamma = 2.0   # Expansion coefficient
    rho = 0.5     # Contraction coefficient
    sigma = 0.5   # Shrink coefficient
    initial_simplex_scale = 0.05

    n = len(x0)
    function_calls = 0

    # Create initial simplex: vertex 0 = x0, vertex i = x0 + h*e_i
    simplex: List[List[float]] = [x0.copy()]
    for i in range(n):
        h = initial_simplex_scale * max(abs(x0[i]), 1.0)
        vertex = x0.copy()
        vertex[i] += h
        simplex.append(vertex)

    # Evaluate function at all vertices
    f_values = [f(v) for v in simplex]
    function_calls += n + 1

    iteration = 0

    while iteration < options.max_iterations:
        # Sort vertices by function value (ascending)
        indices = sorted(range(n + 1), key=lambda i: f_values[i])
        simplex = [simplex[i] for i in indices]
        f_values = [f_values[i] for i in indices]

        best = simplex[0]
        f_best = f_values[0]
        worst = simplex[n]
        f_worst = f_values[n]
        second_worst = simplex[n - 1]
        f_second_worst = f_values[n - 1]

        # Check convergence: function value spread (std dev)
        mean_f = sum(f_values) / (n + 1)
        std_f = math.sqrt(sum((fv - mean_f) ** 2 for fv in f_values) / (n + 1))

        if std_f < options.func_tol:
            return OptimizeResult(
                x=best,
                fun=f_best,
                gradient=None,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=0,
                converged=True,
                message=convergence_message(type('ConvergenceReason', (), {'kind': 'function'})())
            )

        # Check convergence: simplex diameter
        diameter = 0.0
        for i in range(n + 1):
            for j in range(i + 1, n + 1):
                dist = norm(sub(simplex[i], simplex[j]))
                diameter = max(diameter, dist)

        if diameter < options.step_tol:
            return OptimizeResult(
                x=best,
                fun=f_best,
                gradient=None,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=0,
                converged=True,
                message=convergence_message(type('ConvergenceReason', (), {'kind': 'step'})())
            )

        # Compute centroid of all vertices except worst
        centroid = [0.0] * n
        for i in range(n):
            centroid = add(centroid, simplex[i])
        centroid = scale(centroid, 1.0 / n)

        # Reflect worst through centroid
        reflected = add_scaled(centroid, sub(worst, centroid), -alpha)
        f_reflected = f(reflected)
        function_calls += 1

        # Accept reflection if between best and second-worst
        if f_best <= f_reflected < f_second_worst:
            simplex[n] = reflected
            f_values[n] = f_reflected
            iteration += 1
            continue

        # If reflection is best, try expansion
        if f_reflected < f_best:
            expanded = add_scaled(centroid, sub(reflected, centroid), gamma)
            f_expanded = f(expanded)
            function_calls += 1

            if f_expanded < f_reflected:
                simplex[n] = expanded
                f_values[n] = f_expanded
            else:
                simplex[n] = reflected
                f_values[n] = f_reflected
            iteration += 1
            continue

        # If reflection is worst, try contraction
        if f_reflected < f_worst:
            # Outside contraction
            contracted = add_scaled(centroid, sub(reflected, centroid), rho)
            f_contracted = f(contracted)
            function_calls += 1

            if f_contracted < f_reflected:
                simplex[n] = contracted
                f_values[n] = f_contracted
                iteration += 1
                continue
        else:
            # Inside contraction
            contracted = add_scaled(centroid, sub(worst, centroid), rho)
            f_contracted = f(contracted)
            function_calls += 1

            if f_contracted < f_worst:
                simplex[n] = contracted
                f_values[n] = f_contracted
                iteration += 1
                continue

        # Contraction failed, shrink all vertices toward best
        for i in range(1, n + 1):
            simplex[i] = add_scaled(best, sub(simplex[i], best), sigma)
            f_values[i] = f(simplex[i])
            function_calls += 1

        iteration += 1

    # Max iterations reached
    indices = sorted(range(n + 1), key=lambda i: f_values[i])
    best = simplex[indices[0]]
    f_best = f_values[indices[0]]

    return OptimizeResult(
        x=best,
        fun=f_best,
        gradient=None,
        iterations=iteration,
        function_calls=function_calls,
        gradient_calls=0,
        converged=False,
        message=convergence_message(type('ConvergenceReason', (), {'kind': 'maxIterations'})())
    )
