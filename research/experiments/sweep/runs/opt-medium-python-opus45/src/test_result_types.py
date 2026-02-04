"""Tests for result_types module."""

import pytest
from result_types import (
    OptimizeOptions,
    ConvergenceReason,
    default_options,
    check_convergence,
    is_converged,
    convergence_message,
)


class TestDefaultOptions:
    def test_defaults(self):
        opts = default_options()
        assert opts.grad_tol == 1e-8
        assert opts.step_tol == 1e-8
        assert opts.func_tol == 1e-12
        assert opts.max_iterations == 1000

    def test_override(self):
        opts = default_options(grad_tol=1e-4)
        assert opts.grad_tol == 1e-4
        assert opts.step_tol == 1e-8
        assert opts.func_tol == 1e-12
        assert opts.max_iterations == 1000


class TestCheckConvergence:
    def test_gradient_convergence(self):
        opts = default_options()
        reason = check_convergence(1e-9, 0.1, 0.1, 5, opts)
        assert reason is not None
        assert reason.kind == "gradient"

    def test_step_convergence(self):
        opts = default_options()
        reason = check_convergence(0.1, 1e-9, 0.1, 5, opts)
        assert reason is not None
        assert reason.kind == "step"

    def test_function_convergence(self):
        opts = default_options()
        reason = check_convergence(0.1, 0.1, 1e-13, 5, opts)
        assert reason is not None
        assert reason.kind == "function"

    def test_max_iterations(self):
        opts = default_options()
        reason = check_convergence(0.1, 0.1, 0.1, 1000, opts)
        assert reason is not None
        assert reason.kind == "maxIterations"

    def test_no_convergence(self):
        opts = default_options()
        reason = check_convergence(0.1, 0.1, 0.1, 5, opts)
        assert reason is None

    def test_priority_gradient_first(self):
        """When multiple criteria met, gradient wins (checked first)."""
        opts = default_options()
        reason = check_convergence(1e-9, 1e-9, 1e-13, 1000, opts)
        assert reason is not None
        assert reason.kind == "gradient"


class TestIsConverged:
    def test_gradient(self):
        assert is_converged(ConvergenceReason(kind="gradient")) is True

    def test_step(self):
        assert is_converged(ConvergenceReason(kind="step")) is True

    def test_function(self):
        assert is_converged(ConvergenceReason(kind="function")) is True

    def test_max_iterations(self):
        assert is_converged(ConvergenceReason(kind="maxIterations")) is False

    def test_line_search_failed(self):
        assert is_converged(ConvergenceReason(kind="lineSearchFailed")) is False


class TestConvergenceMessage:
    def test_gradient(self):
        msg = convergence_message(ConvergenceReason(kind="gradient"))
        assert "gradient" in msg.lower()

    def test_max_iterations(self):
        msg = convergence_message(ConvergenceReason(kind="maxIterations"))
        assert "maximum iterations" in msg.lower() or "max" in msg.lower()
