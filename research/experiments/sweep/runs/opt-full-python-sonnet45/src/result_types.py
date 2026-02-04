"""
Shared types and convergence logic used by all optimization algorithms.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class OptimizeOptions:
    grad_tol: float = 1e-8
    step_tol: float = 1e-8
    func_tol: float = 1e-12
    max_iterations: int = 1000


@dataclass
class OptimizeResult:
    x: List[float] = field(default_factory=list)
    fun: float = 0.0
    gradient: Optional[List[float]] = None
    iterations: int = 0
    function_calls: int = 0
    gradient_calls: int = 0
    converged: bool = False
    message: str = ""


@dataclass
class ConvergenceReason:
    kind: str  # "gradient", "step", "function", "maxIterations", "lineSearchFailed"


def default_options(**overrides) -> OptimizeOptions:
    """Create defaults with optional overrides."""
    opts = OptimizeOptions()
    for k, v in overrides.items():
        if hasattr(opts, k) and v is not None:
            setattr(opts, k, v)
    return opts


def check_convergence(
    grad_norm: float,
    step_norm: float,
    func_change: float,
    iteration: int,
    opts: OptimizeOptions,
) -> Optional[ConvergenceReason]:
    """Check criteria in order: gradient -> step -> function -> maxIterations."""
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
    """Human-readable message."""
    messages = {
        "gradient": "Converged: gradient norm below tolerance",
        "step": "Converged: step size below tolerance",
        "function": "Converged: function change below tolerance",
        "maxIterations": "Stopped: reached maximum iterations",
        "lineSearchFailed": "Stopped: line search failed",
    }
    return messages.get(reason.kind, f"Unknown convergence reason: {reason.kind}")
