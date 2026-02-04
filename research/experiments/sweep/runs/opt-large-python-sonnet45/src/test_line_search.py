"""Tests for line_search module."""

import pytest
from line_search import backtracking_line_search, wolfe_line_search
from test_functions import sphere_f, sphere_grad, rosenbrock_f, rosenbrock_grad
from vec_ops import negate, dot


def test_backtracking_sphere():
    """Test backtracking on sphere from [10, 10]."""
    x = [10.0, 10.0]
    fx = sphere_f(x)
    gx = sphere_grad(x)
    d = negate(gx)

    result = backtracking_line_search(sphere_f, x, d, fx, gx)
    assert result.success is True
    assert result.f_new < fx


def test_backtracking_rosenbrock():
    """Test backtracking on Rosenbrock."""
    x = [-1.2, 1.0]
    fx = rosenbrock_f(x)
    gx = rosenbrock_grad(x)
    d = negate(gx)

    result = backtracking_line_search(rosenbrock_f, x, d, fx, gx)
    assert result.success is True
    assert result.f_new < fx


def test_backtracking_ascending():
    """Test backtracking with ascending direction (should fail)."""
    x = [10.0, 10.0]
    fx = sphere_f(x)
    gx = sphere_grad(x)
    d = gx  # Ascending direction

    result = backtracking_line_search(sphere_f, x, d, fx, gx, max_iter=5)
    assert result.success is False


def test_wolfe_sphere():
    """Test Wolfe on sphere from [10, 10]."""
    x = [10.0, 10.0]
    fx = sphere_f(x)
    gx = sphere_grad(x)
    d = negate(gx)

    result = wolfe_line_search(sphere_f, sphere_grad, x, d, fx, gx)
    assert result.success is True
    assert result.f_new < fx
    assert result.g_new is not None
    assert len(result.g_new) == 2

    # Verify Wolfe conditions
    c1 = 1e-4
    c2 = 0.9
    dphi0 = dot(gx, d)
    dphi_alpha = dot(result.g_new, d)

    # Armijo
    assert result.f_new <= fx + c1 * result.alpha * dphi0 + 1e-10

    # Curvature
    assert abs(dphi_alpha) <= -c2 * dphi0 + 1e-10


def test_wolfe_rosenbrock():
    """Test Wolfe on Rosenbrock."""
    x = [-1.2, 1.0]
    fx = rosenbrock_f(x)
    gx = rosenbrock_grad(x)
    d = negate(gx)

    result = wolfe_line_search(rosenbrock_f, rosenbrock_grad, x, d, fx, gx)
    assert result.success is True
    assert result.f_new < fx
