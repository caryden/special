"""result-types: Shared types and convergence logic for optimization algorithms."""

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
class ConvergenceReason:
    """Tagged union representing why optimization terminated."""
    kind: str  # "gradient", "step", "function", "maxIterations", "lineSearchFailed"


@dataclass
class OptimizeResult:
    """Result from an optimization algorithm."""
    x: List[float]
    fun: float
    gradient: Optional[List[float]]
    iterations: int
    function_calls: int
    gradient_calls: int
    converged: bool
    message: str


def default_options(**overrides) -> OptimizeOptions:
    """Create default options with optional overrides.

    Args:
        **overrides: Keyword arguments to override defaults

    Returns:
        OptimizeOptions with defaults merged with overrides
    """
    return OptimizeOptions(**overrides)


def check_convergence(
    grad_norm: float,
    step_norm: float,
    func_change: float,
    iteration: int,
    opts: OptimizeOptions
) -> Optional[ConvergenceReason]:
    """Check convergence criteria in priority order.

    Order: gradient → step → function → maxIterations

    Args:
        grad_norm: Gradient norm (or NaN for derivative-free)
        step_norm: Step size norm
        func_change: Absolute change in function value
        iteration: Current iteration number
        opts: Optimization options with tolerances

    Returns:
        ConvergenceReason if any criterion is met, None otherwise
    """
    # Gradient criterion (primary)
    if grad_norm < opts.grad_tol:
        return ConvergenceReason(kind="gradient")

    # Step criterion
    if step_norm < opts.step_tol:
        return ConvergenceReason(kind="step")

    # Function change criterion
    if func_change < opts.func_tol:
        return ConvergenceReason(kind="function")

    # Max iterations criterion
    if iteration >= opts.max_iterations:
        return ConvergenceReason(kind="maxIterations")

    # No criterion met
    return None


def is_converged(reason: ConvergenceReason) -> bool:
    """Check if a convergence reason indicates successful convergence.

    Args:
        reason: The convergence reason

    Returns:
        True for gradient/step/function, False for maxIterations/lineSearchFailed
    """
    return reason.kind in ("gradient", "step", "function")


def convergence_message(reason: ConvergenceReason) -> str:
    """Get human-readable message for convergence reason.

    Args:
        reason: The convergence reason

    Returns:
        Human-readable description
    """
    messages = {
        "gradient": "Converged: gradient norm below tolerance",
        "step": "Converged: step size below tolerance",
        "function": "Converged: function change below tolerance",
        "maxIterations": "Failed to converge: reached maximum iterations",
        "lineSearchFailed": "Failed to converge: line search could not find acceptable step"
    }
    return messages.get(reason.kind, f"Unknown reason: {reason.kind}")
