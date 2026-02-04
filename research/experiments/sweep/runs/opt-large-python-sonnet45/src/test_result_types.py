"""Tests for result_types module."""

from result_types import (
    OptimizeOptions, ConvergenceReason, default_options,
    check_convergence, is_converged, convergence_message
)


def test_default_options():
    opts = default_options()
    assert opts.grad_tol == 1e-8
    assert opts.step_tol == 1e-8
    assert opts.func_tol == 1e-12
    assert opts.max_iterations == 1000


def test_default_options_with_overrides():
    opts = default_options(grad_tol=1e-4)
    assert opts.grad_tol == 1e-4
    assert opts.step_tol == 1e-8


def test_check_convergence_gradient():
    opts = default_options()
    reason = check_convergence(1e-9, 0.1, 0.1, 5, opts)
    assert reason is not None
    assert reason.kind == "gradient"


def test_check_convergence_step():
    opts = default_options()
    reason = check_convergence(0.1, 1e-9, 0.1, 5, opts)
    assert reason is not None
    assert reason.kind == "step"


def test_check_convergence_function():
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 1e-13, 5, opts)
    assert reason is not None
    assert reason.kind == "function"


def test_check_convergence_max_iterations():
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 0.1, 1000, opts)
    assert reason is not None
    assert reason.kind == "maxIterations"


def test_check_convergence_none():
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 0.1, 5, opts)
    assert reason is None


def test_is_converged():
    assert is_converged(ConvergenceReason(kind="gradient")) is True
    assert is_converged(ConvergenceReason(kind="step")) is True
    assert is_converged(ConvergenceReason(kind="function")) is True
    assert is_converged(ConvergenceReason(kind="maxIterations")) is False
    assert is_converged(ConvergenceReason(kind="lineSearchFailed")) is False


def test_convergence_message():
    msg = convergence_message(ConvergenceReason(kind="gradient"))
    assert "gradient" in msg.lower()


def test_priority():
    """When multiple criteria are met, gradient takes priority."""
    opts = default_options()
    # All three criteria met
    reason = check_convergence(1e-9, 1e-9, 1e-13, 5, opts)
    assert reason.kind == "gradient"
