"""Shared types and convergence logic for optimization algorithms."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class OptimizeOptions:
    """Options for optimization algorithms."""
    grad_tol: float = 1e-8
    step_tol: float = 1e-8
    func_tol: float = 1e-12
    max_iterations: int = 1000


@dataclass
class OptimizeResult:
    """Result of an optimization run."""
    x: List[float]
    fun: float
    gradient: Optional[List[float]]
    iterations: int
    function_calls: int
    gradient_calls: int
    converged: bool
    message: str


@dataclass
class ConvergenceReason:
    """Tagged union for convergence reasons."""
    kind: str  # "gradient", "step", "function", "maxIterations", "lineSearchFailed"


def default_options(**overrides) -> OptimizeOptions:
    """Create default options with optional overrides."""
    defaults = {
        'grad_tol': 1e-8,
        'step_tol': 1e-8,
        'func_tol': 1e-12,
        'max_iterations': 1000
    }
    defaults.update(overrides)
    return OptimizeOptions(**defaults)


def check_convergence(
    grad_norm: float,
    step_norm: float,
    func_change: float,
    iteration: int,
    opts: OptimizeOptions
) -> Optional[ConvergenceReason]:
    """Check convergence criteria in priority order."""
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
    """Check if a convergence reason indicates true convergence."""
    return reason.kind in ("gradient", "step", "function")


def convergence_message(reason: ConvergenceReason) -> str:
    """Human-readable message for a convergence reason."""
    messages = {
        "gradient": "Converged: gradient norm below tolerance",
        "step": "Converged: step size below tolerance",
        "function": "Converged: function change below tolerance",
        "maxIterations": "Maximum iterations reached",
        "lineSearchFailed": "Line search failed to find acceptable step"
    }
    return messages.get(reason.kind, f"Unknown convergence reason: {reason.kind}")
