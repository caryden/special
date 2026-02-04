"""
Shared types and convergence logic used by all optimization algorithms.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class OptimizeOptions:
    grad_tol: float = 1e-8
    step_tol: float = 1e-8
    func_tol: float = 1e-12
    max_iterations: int = 1000


@dataclass
class OptimizeResult:
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
    kind: str  # "gradient", "step", "function", "maxIterations", "lineSearchFailed"


def default_options(**overrides) -> OptimizeOptions:
    """Create OptimizeOptions with defaults, merging any keyword overrides."""
    return OptimizeOptions(**overrides)


def check_convergence(
    grad_norm: float,
    step_norm: float,
    func_change: float,
    iteration: int,
    opts: OptimizeOptions,
) -> Optional[ConvergenceReason]:
    """
    Check convergence criteria in order: gradient -> step -> function -> maxIterations.
    Returns ConvergenceReason or None.
    """
    if grad_norm < opts.grad_tol:
        return ConvergenceReason(kind="gradient")
    if step_norm < opts.step_tol:
        return ConvergenceReason(kind="step")
    if func_change < opts.func_tol:
        return ConvergenceReason(kind="function")
    if iteration >= opts.max_iterations:
        return ConvergenceReason(kind="maxIterations")
    return None


def is_converged(reason: ConvergenceReason) -> bool:
    """True for gradient/step/function; false for maxIterations/lineSearchFailed."""
    return reason.kind in ("gradient", "step", "function")


def convergence_message(reason: ConvergenceReason) -> str:
    """Human-readable convergence message."""
    messages = {
        "gradient": "Converged: gradient norm below tolerance",
        "step": "Converged: step size below tolerance",
        "function": "Converged: function change below tolerance",
        "maxIterations": "Stopped: reached maximum iterations",
        "lineSearchFailed": "Stopped: line search failed to find acceptable step",
    }
    return messages.get(reason.kind, f"Unknown reason: {reason.kind}")
