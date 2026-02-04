"""Tests for result_types."""

from .result_types import (
    default_options, check_convergence, is_converged,
    convergence_message, ConvergenceReason, OptimizeOptions,
)


def test_default_options():
    opts = default_options()
    assert opts.grad_tol == 1e-8
    assert opts.step_tol == 1e-8
    assert opts.func_tol == 1e-12
    assert opts.max_iterations == 1000

def test_default_options_override():
    opts = default_options(grad_tol=1e-4)
    assert opts.grad_tol == 1e-4
    assert opts.step_tol == 1e-8

def test_check_convergence_gradient():
    opts = default_options()
    r = check_convergence(1e-9, 0.1, 0.1, 5, opts)
    assert r is not None
    assert r.kind == "gradient"

def test_check_convergence_step():
    opts = default_options()
    r = check_convergence(0.1, 1e-9, 0.1, 5, opts)
    assert r is not None
    assert r.kind == "step"

def test_check_convergence_function():
    opts = default_options()
    r = check_convergence(0.1, 0.1, 1e-13, 5, opts)
    assert r is not None
    assert r.kind == "function"

def test_check_convergence_max_iterations():
    opts = default_options()
    r = check_convergence(0.1, 0.1, 0.1, 1000, opts)
    assert r is not None
    assert r.kind == "maxIterations"

def test_check_convergence_none():
    opts = default_options()
    r = check_convergence(0.1, 0.1, 0.1, 5, opts)
    assert r is None

def test_is_converged_gradient():
    assert is_converged(ConvergenceReason("gradient")) is True

def test_is_converged_max_iterations():
    assert is_converged(ConvergenceReason("maxIterations")) is False

def test_is_converged_line_search_failed():
    assert is_converged(ConvergenceReason("lineSearchFailed")) is False

def test_convergence_priority():
    opts = default_options()
    r = check_convergence(1e-9, 1e-9, 1e-13, 5, opts)
    assert r.kind == "gradient"
