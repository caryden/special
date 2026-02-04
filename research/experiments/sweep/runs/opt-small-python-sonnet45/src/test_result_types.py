"""Tests for result-types module."""

import pytest
from result_types import (
    OptimizeOptions,
    ConvergenceReason,
    OptimizeResult,
    default_options,
    check_convergence,
    is_converged,
    convergence_message
)


def test_default_options_no_overrides():
    """Test default options with no overrides."""
    opts = default_options()
    assert opts.grad_tol == 1e-8
    assert opts.step_tol == 1e-8
    assert opts.func_tol == 1e-12
    assert opts.max_iterations == 1000


def test_default_options_with_overrides():
    """Test default options with partial overrides."""
    opts = default_options(grad_tol=1e-4)
    assert opts.grad_tol == 1e-4
    assert opts.step_tol == 1e-8
    assert opts.func_tol == 1e-12
    assert opts.max_iterations == 1000


def test_check_convergence_gradient():
    """Test gradient convergence criterion."""
    opts = default_options()
    reason = check_convergence(1e-9, 0.1, 0.1, 5, opts)
    assert reason is not None
    assert reason.kind == "gradient"


def test_check_convergence_step():
    """Test step convergence criterion."""
    opts = default_options()
    reason = check_convergence(0.1, 1e-9, 0.1, 5, opts)
    assert reason is not None
    assert reason.kind == "step"


def test_check_convergence_function():
    """Test function change convergence criterion."""
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 1e-13, 5, opts)
    assert reason is not None
    assert reason.kind == "function"


def test_check_convergence_max_iterations():
    """Test max iterations criterion."""
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 0.1, 1000, opts)
    assert reason is not None
    assert reason.kind == "maxIterations"


def test_check_convergence_none():
    """Test no convergence when no criterion is met."""
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 0.1, 5, opts)
    assert reason is None


def test_check_convergence_priority():
    """Test convergence check priority order.

    When multiple criteria are met, gradient takes precedence.
    """
    opts = default_options()
    # Both gradient and step criteria met
    reason = check_convergence(1e-9, 1e-9, 0.1, 5, opts)
    assert reason is not None
    assert reason.kind == "gradient"

    # Both step and function criteria met
    reason = check_convergence(0.1, 1e-9, 1e-13, 5, opts)
    assert reason is not None
    assert reason.kind == "step"


def test_is_converged_true_cases():
    """Test is_converged returns True for successful convergence."""
    assert is_converged(ConvergenceReason(kind="gradient")) is True
    assert is_converged(ConvergenceReason(kind="step")) is True
    assert is_converged(ConvergenceReason(kind="function")) is True


def test_is_converged_false_cases():
    """Test is_converged returns False for failed convergence."""
    assert is_converged(ConvergenceReason(kind="maxIterations")) is False
    assert is_converged(ConvergenceReason(kind="lineSearchFailed")) is False


def test_convergence_message():
    """Test human-readable convergence messages."""
    msg = convergence_message(ConvergenceReason(kind="gradient"))
    assert "gradient norm below tolerance" in msg

    msg = convergence_message(ConvergenceReason(kind="step"))
    assert "step size below tolerance" in msg

    msg = convergence_message(ConvergenceReason(kind="function"))
    assert "function change below tolerance" in msg

    msg = convergence_message(ConvergenceReason(kind="maxIterations"))
    assert "maximum iterations" in msg

    msg = convergence_message(ConvergenceReason(kind="lineSearchFailed"))
    assert "line search" in msg
