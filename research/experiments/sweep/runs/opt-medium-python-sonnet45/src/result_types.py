"""
result-types — Shared types and convergence logic for optimization algorithms.
"""

from typing import Optional, Literal, TypedDict, Union
from dataclasses import dataclass


class OptimizeOptions(TypedDict, total=False):
    """Configuration options for optimization algorithms."""
    grad_tol: float
    step_tol: float
    func_tol: float
    max_iterations: int


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


class ConvergenceReason(TypedDict):
    """Tagged union for convergence reasons."""
    kind: Literal["gradient", "step", "function", "maxIterations", "lineSearchFailed"]


def default_options(overrides: Optional[OptimizeOptions] = None) -> OptimizeOptions:
    """Create default optimization options with optional overrides."""
    opts: OptimizeOptions = {
        "grad_tol": 1e-8,
        "step_tol": 1e-8,
        "func_tol": 1e-12,
        "max_iterations": 1000,
    }
    if overrides:
        opts.update(overrides)
    return opts


def check_convergence(
    grad_norm: float,
    step_norm: float,
    func_change: float,
    iteration: int,
    opts: OptimizeOptions,
) -> Optional[ConvergenceReason]:
    """
    Check convergence criteria in order: gradient → step → function → maxIterations.

    Returns the first criterion met, or None if no criterion is met.
    """
    # Gradient criterion
    if grad_norm < opts["grad_tol"]:
        return {"kind": "gradient"}

    # Step criterion
    if step_norm < opts["step_tol"]:
        return {"kind": "step"}

    # Function change criterion
    if func_change < opts["func_tol"]:
        return {"kind": "function"}

    # Max iterations criterion
    if iteration >= opts["max_iterations"]:
        return {"kind": "maxIterations"}

    return None


def is_converged(reason: ConvergenceReason) -> bool:
    """Check if a convergence reason indicates true convergence."""
    return reason["kind"] in ("gradient", "step", "function")


def convergence_message(reason: ConvergenceReason) -> str:
    """Get human-readable message for a convergence reason."""
    kind = reason["kind"]
    if kind == "gradient":
        return "Converged: gradient norm below tolerance"
    elif kind == "step":
        return "Converged: step size below tolerance"
    elif kind == "function":
        return "Converged: function change below tolerance"
    elif kind == "maxIterations":
        return "Stopped: maximum iterations reached"
    elif kind == "lineSearchFailed":
        return "Stopped: line search failed"
    else:
        return f"Unknown convergence reason: {kind}"
