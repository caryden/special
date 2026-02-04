"""Tests for line-search."""

import pytest
import math
from line_search import backtracking_line_search, wolfe_line_search
import vec_ops


# Test functions
def sphere(x):
    """f(x) = sum(x_i^2)"""
    return sum(xi**2 for xi in x)


def sphere_grad(x):
    """Gradient of sphere."""
    return [2 * xi for xi in x]


def rosenbrock(x):
    """Rosenbrock function."""
    return (1 - x[0])**2 + 100 * (x[1] - x[0]**2)**2


def rosenbrock_grad(x):
    """Gradient of Rosenbrock."""
    return [
        -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0]**2),
        200 * (x[1] - x[0]**2)
    ]


def test_backtracking_sphere():
    """Test backtracking on sphere from [10, 10]."""
    x = [10.0, 10.0]
    fx = sphere(x)
    gx = sphere_grad(x)
    d = vec_ops.negate(gx)  # Descent direction

    result = backtracking_line_search(sphere, x, d, fx, gx)

    assert result.success is True
    assert result.alpha == 0.5
    assert result.f_new == pytest.approx(0.0, abs=1e-10)


def test_backtracking_rosenbrock():
    """Test backtracking on Rosenbrock from [-1.2, 1]."""
    x = [-1.2, 1.0]
    fx = rosenbrock(x)
    gx = rosenbrock_grad(x)
    d = vec_ops.negate(gx)

    result = backtracking_line_search(rosenbrock, x, d, fx, gx)

    assert result.success is True
    assert result.f_new < fx


def test_backtracking_ascending():
    """Test backtracking with ascending direction (should fail)."""
    x = [10.0, 10.0]
    fx = sphere(x)
    gx = sphere_grad(x)
    d = gx  # Ascending direction

    result = backtracking_line_search(sphere, x, d, fx, gx)

    assert result.success is False


def test_wolfe_sphere():
    """Test Wolfe line search on sphere from [10, 10]."""
    x = [10.0, 10.0]
    fx = sphere(x)
    gx = sphere_grad(x)
    d = vec_ops.negate(gx)

    result = wolfe_line_search(sphere, sphere_grad, x, d, fx, gx)

    assert result.success is True

    # Verify Armijo condition
    c1 = 1e-4
    directional_deriv = vec_ops.dot(gx, d)
    assert result.f_new <= fx + c1 * result.alpha * directional_deriv

    # Verify curvature condition
    c2 = 0.9
    assert result.g_new is not None
    directional_deriv_new = vec_ops.dot(result.g_new, d)
    assert abs(directional_deriv_new) <= c2 * abs(directional_deriv)


def test_wolfe_rosenbrock():
    """Test Wolfe line search on Rosenbrock from [-1.2, 1]."""
    x = [-1.2, 1.0]
    fx = rosenbrock(x)
    gx = rosenbrock_grad(x)
    d = vec_ops.negate(gx)

    result = wolfe_line_search(rosenbrock, rosenbrock_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new < fx


def test_wolfe_returns_gradient():
    """Test that Wolfe line search returns gradient."""
    x = [10.0, 10.0]
    fx = sphere(x)
    gx = sphere_grad(x)
    d = vec_ops.negate(gx)

    result = wolfe_line_search(sphere, sphere_grad, x, d, fx, gx)

    assert result.g_new is not None
    assert len(result.g_new) == 2


def test_wolfe_conditions_verified():
    """Verify both Wolfe conditions are satisfied."""
    x = [10.0, 10.0]
    fx = sphere(x)
    gx = sphere_grad(x)
    d = vec_ops.negate(gx)

    c1 = 1e-4
    c2 = 0.9

    result = wolfe_line_search(
        sphere, sphere_grad, x, d, fx, gx,
        {"c1": c1, "c2": c2}
    )

    assert result.success is True

    # Armijo condition
    directional_deriv = vec_ops.dot(gx, d)
    assert result.f_new <= fx + c1 * result.alpha * directional_deriv

    # Curvature condition
    assert result.g_new is not None
    directional_deriv_new = vec_ops.dot(result.g_new, d)
    assert abs(directional_deriv_new) <= c2 * abs(directional_deriv)
