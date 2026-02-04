"""Tests for result-types."""

import pytest
from result_types import (
    default_options,
    check_convergence,
    is_converged,
    convergence_message,
)


def test_default_options():
    opts = default_options()
    assert opts["grad_tol"] == 1e-8
    assert opts["step_tol"] == 1e-8
    assert opts["func_tol"] == 1e-12
    assert opts["max_iterations"] == 1000


def test_default_options_with_overrides():
    opts = default_options({"grad_tol": 1e-4})
    assert opts["grad_tol"] == 1e-4
    assert opts["step_tol"] == 1e-8
    assert opts["func_tol"] == 1e-12
    assert opts["max_iterations"] == 1000


def test_check_convergence_gradient():
    opts = default_options()
    reason = check_convergence(1e-9, 0.1, 0.1, 5, opts)
    assert reason is not None
    assert reason["kind"] == "gradient"


def test_check_convergence_step():
    opts = default_options()
    reason = check_convergence(0.1, 1e-9, 0.1, 5, opts)
    assert reason is not None
    assert reason["kind"] == "step"


def test_check_convergence_function():
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 1e-13, 5, opts)
    assert reason is not None
    assert reason["kind"] == "function"


def test_check_convergence_max_iterations():
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 0.1, 1000, opts)
    assert reason is not None
    assert reason["kind"] == "maxIterations"


def test_check_convergence_none():
    opts = default_options()
    reason = check_convergence(0.1, 0.1, 0.1, 5, opts)
    assert reason is None


def test_is_converged():
    assert is_converged({"kind": "gradient"}) is True
    assert is_converged({"kind": "step"}) is True
    assert is_converged({"kind": "function"}) is True
    assert is_converged({"kind": "maxIterations"}) is False
    assert is_converged({"kind": "lineSearchFailed"}) is False


def test_convergence_message():
    assert "gradient" in convergence_message({"kind": "gradient"}).lower()
    assert "step" in convergence_message({"kind": "step"}).lower()
    assert "function" in convergence_message({"kind": "function"}).lower()
    assert "maximum iterations" in convergence_message({"kind": "maxIterations"}).lower()
    assert "line search" in convergence_message({"kind": "lineSearchFailed"}).lower()


def test_convergence_priority():
    """When multiple criteria are met, gradient has priority."""
    opts = default_options()
    # All criteria met
    reason = check_convergence(1e-9, 1e-9, 1e-13, 1000, opts)
    assert reason is not None
    assert reason["kind"] == "gradient"

    # Step and function met
    reason = check_convergence(0.1, 1e-9, 1e-13, 1000, opts)
    assert reason is not None
    assert reason["kind"] == "step"

    # Function and maxIterations met
    reason = check_convergence(0.1, 0.1, 1e-13, 1000, opts)
    assert reason is not None
    assert reason["kind"] == "function"
