"""
Nelder-Mead optimization: vec-ops + result-types + nelder-mead nodes.

Translated from the Type-O optimize reference library (TypeScript).
No external dependencies beyond stdlib.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Optional


# ===========================================================================
# vec-ops  (leaf node, no dependencies)
# ===========================================================================

def dot(a: list[float], b: list[float]) -> float:
    """Dot product of two vectors."""
    return sum(ai * bi for ai, bi in zip(a, b))


def norm(v: list[float]) -> float:
    """Euclidean (L2) norm."""
    return math.sqrt(sum(x * x for x in v))


def norm_inf(v: list[float]) -> float:
    """Infinity norm (max absolute value)."""
    if not v:
        return 0.0
    return max(abs(x) for x in v)


def scale(v: list[float], s: float) -> list[float]:
    """Scalar multiplication. Returns a new list."""
    return [x * s for x in v]


def add(a: list[float], b: list[float]) -> list[float]:
    """Element-wise addition. Returns a new list."""
    return [ai + bi for ai, bi in zip(a, b)]


def sub(a: list[float], b: list[float]) -> list[float]:
    """Element-wise subtraction. Returns a new list."""
    return [ai - bi for ai, bi in zip(a, b)]


def negate(v: list[float]) -> list[float]:
    """Element-wise negation. Returns a new list."""
    return [-x for x in v]


def clone(v: list[float]) -> list[float]:
    """Deep copy of a vector."""
    return v[:]


def zeros(n: int) -> list[float]:
    """Vector of n zeros."""
    return [0.0] * n


def add_scaled(a: list[float], b: list[float], s: float) -> list[float]:
    """Compute a + s*b without intermediate allocation. Returns a new list."""
    return [ai + s * bi for ai, bi in zip(a, b)]


# ===========================================================================
# result-types  (leaf node, no dependencies)
# ===========================================================================

@dataclass
class OptimizeOptions:
    """Configuration options for optimization."""
    grad_tol: float = 1e-8
    step_tol: float = 1e-8
    func_tol: float = 1e-12
    max_iterations: int = 1000


@dataclass
class OptimizeResult:
    """Result of an optimization run."""
    x: list[float]
    fun: float
    gradient: Optional[list[float]]
    iterations: int
    function_calls: int
    gradient_calls: int
    converged: bool
    message: str


@dataclass
class ConvergenceReason:
    """Tagged union for convergence reasons, using a string 'kind' field."""
    kind: str
    grad_norm: Optional[float] = None
    step_norm: Optional[float] = None
    func_change: Optional[float] = None
    iterations: Optional[int] = None
    message_text: Optional[str] = None


def default_options(**overrides) -> OptimizeOptions:
    """Create default options with optional overrides."""
    return OptimizeOptions(**overrides)


def check_convergence(
    grad_norm: float,
    step_norm: float,
    func_change: float,
    iteration: int,
    options: OptimizeOptions,
) -> Optional[ConvergenceReason]:
    """
    Check convergence criteria in order: gradient -> step -> function -> maxIterations.
    Returns the first matching reason, or None.
    """
    if grad_norm < options.grad_tol:
        return ConvergenceReason(kind="gradient", grad_norm=grad_norm)
    if step_norm < options.step_tol:
        return ConvergenceReason(kind="step", step_norm=step_norm)
    if func_change < options.func_tol:
        return ConvergenceReason(kind="function", func_change=func_change)
    if iteration >= options.max_iterations:
        return ConvergenceReason(kind="maxIterations", iterations=iteration)
    return None


def is_converged(reason: ConvergenceReason) -> bool:
    """True for gradient/step/function; False for maxIterations/lineSearchFailed."""
    return reason.kind in ("gradient", "step", "function")


def convergence_message(reason: ConvergenceReason) -> str:
    """Human-readable message for a convergence reason."""
    if reason.kind == "gradient":
        return f"Converged: gradient norm {reason.grad_norm:.2e} below tolerance"
    elif reason.kind == "step":
        return f"Converged: step size {reason.step_norm:.2e} below tolerance"
    elif reason.kind == "function":
        return f"Converged: function change {reason.func_change:.2e} below tolerance"
    elif reason.kind == "maxIterations":
        return f"Stopped: reached maximum iterations ({reason.iterations})"
    elif reason.kind == "lineSearchFailed":
        return f"Stopped: line search failed ({reason.message_text})"
    return ""


# ===========================================================================
# nelder-mead  (depends on: vec-ops, result-types)
# ===========================================================================

@dataclass
class NelderMeadOptions(OptimizeOptions):
    """Options specific to Nelder-Mead, extending OptimizeOptions."""
    alpha: float = 1.0
    gamma: float = 2.0
    rho: float = 0.5
    sigma: float = 0.5
    initial_simplex_scale: float = 0.05


def default_nelder_mead_options(**overrides) -> NelderMeadOptions:
    """Create default NelderMeadOptions with optional overrides."""
    return NelderMeadOptions(**overrides)


def _create_initial_simplex(x0: list[float], scale_: float) -> list[list[float]]:
    """Create initial simplex: n+1 vertices. Vertex 0 = x0, vertex i = x0 + h*e_i."""
    n = len(x0)
    simplex: list[list[float]] = [x0[:]]
    for i in range(n):
        vertex = x0[:]
        h = scale_ * max(abs(x0[i]), 1.0)
        vertex[i] += h
        simplex.append(vertex)
    return simplex


def nelder_mead(
    f: Callable[[list[float]], float],
    x0: list[float],
    **options,
) -> OptimizeResult:
    """
    Minimize a function using the Nelder-Mead simplex method.

    Derivative-free method. Returns OptimizeResult with gradient=None.
    """
    opts = default_nelder_mead_options(**options)
    n = len(x0)

    # Initialize simplex
    simplex = _create_initial_simplex(x0, opts.initial_simplex_scale)
    f_values = [f(v) for v in simplex]
    function_calls = n + 1

    iteration = 0

    while iteration < opts.max_iterations:
        # Sort vertices by function value (ascending)
        indices = sorted(range(n + 1), key=lambda i: f_values[i])
        simplex = [simplex[i] for i in indices]
        f_values = [f_values[i] for i in indices]

        f_best = f_values[0]
        f_worst = f_values[n]
        f_second_worst = f_values[n - 1]

        # Check convergence: function value spread (std dev)
        f_mean = sum(f_values) / (n + 1)
        f_std = math.sqrt(sum((fv - f_mean) ** 2 for fv in f_values) / (n + 1))

        if f_std < opts.func_tol:
            return OptimizeResult(
                x=simplex[0][:],
                fun=f_best,
                gradient=None,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=0,
                converged=True,
                message=f"Converged: simplex function spread {f_std:.2e} below tolerance",
            )

        # Check convergence: simplex diameter
        diameter = 0.0
        for i in range(1, n + 1):
            d = norm_inf(sub(simplex[i], simplex[0]))
            if d > diameter:
                diameter = d

        if diameter < opts.step_tol:
            return OptimizeResult(
                x=simplex[0][:],
                fun=f_best,
                gradient=None,
                iterations=iteration,
                function_calls=function_calls,
                gradient_calls=0,
                converged=True,
                message=f"Converged: simplex diameter {diameter:.2e} below tolerance",
            )

        iteration += 1

        # Compute centroid of all vertices except the worst
        centroid = simplex[0][:]
        for i in range(1, n):
            for j in range(n):
                centroid[j] += simplex[i][j]
        for j in range(n):
            centroid[j] /= n

        # Reflection: x_r = centroid + alpha * (centroid - worst)
        reflected = add_scaled(centroid, sub(centroid, simplex[n]), opts.alpha)
        f_reflected = f(reflected)
        function_calls += 1

        if f_reflected < f_second_worst and f_reflected >= f_best:
            # Accept reflection
            simplex[n] = reflected
            f_values[n] = f_reflected
            continue

        if f_reflected < f_best:
            # Try expansion: x_e = centroid + gamma * (reflected - centroid)
            expanded = add_scaled(centroid, sub(reflected, centroid), opts.gamma)
            f_expanded = f(expanded)
            function_calls += 1

            if f_expanded < f_reflected:
                simplex[n] = expanded
                f_values[n] = f_expanded
            else:
                simplex[n] = reflected
                f_values[n] = f_reflected
            continue

        # Contraction
        if f_reflected < f_worst:
            # Outside contraction: x_c = centroid + rho * (reflected - centroid)
            contracted = add_scaled(centroid, sub(reflected, centroid), opts.rho)
            f_contracted = f(contracted)
            function_calls += 1

            if f_contracted <= f_reflected:
                simplex[n] = contracted
                f_values[n] = f_contracted
                continue
        else:
            # Inside contraction: x_c = centroid + rho * (worst - centroid)
            contracted = add_scaled(centroid, sub(simplex[n], centroid), opts.rho)
            f_contracted = f(contracted)
            function_calls += 1

            if f_contracted < f_worst:
                simplex[n] = contracted
                f_values[n] = f_contracted
                continue

        # Shrink: move all vertices towards the best
        for i in range(1, n + 1):
            simplex[i] = add(simplex[0], scale(sub(simplex[i], simplex[0]), opts.sigma))
            f_values[i] = f(simplex[i])
            function_calls += 1

    # Max iterations reached
    return OptimizeResult(
        x=simplex[0][:],
        fun=f_values[0],
        gradient=None,
        iterations=iteration,
        function_calls=function_calls,
        gradient_calls=0,
        converged=False,
        message=f"Stopped: reached maximum iterations ({opts.max_iterations})",
    )
