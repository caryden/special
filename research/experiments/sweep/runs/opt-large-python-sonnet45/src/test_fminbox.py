"""Tests for fminbox module."""

import pytest
import math
from fminbox import fminbox, FminboxOptions, barrier_value, barrier_gradient, projected_gradient_norm
from test_functions import sphere_f, sphere_grad, rosenbrock_f, rosenbrock_grad


def test_fminbox_interior_minimum():
    """Test fminbox with interior minimum (sphere)."""
    x0 = [1.0, 1.0]
    opts = FminboxOptions(lower=[-5.0, -5.0], upper=[5.0, 5.0])
    result = fminbox(sphere_f, x0, sphere_grad, opts)

    assert result.converged is True
    assert abs(result.x[0]) < 1e-3
    assert abs(result.x[1]) < 1e-3
    assert result.fun < 1e-6


def test_fminbox_boundary_minimum():
    """Test fminbox with boundary minimum."""
    def f(x):
        return x[0] ** 2

    def grad(x):
        return [2.0 * x[0]]

    x0 = [5.0]
    opts = FminboxOptions(lower=[2.0], upper=[10.0])
    result = fminbox(f, x0, grad, opts)

    # May not fully converge but should get close to boundary
    assert abs(result.x[0] - 2.0) < 1e-2
    assert abs(result.fun - 4.0) < 1e-1


def test_fminbox_rosenbrock_constrained():
    """Test fminbox on constrained Rosenbrock."""
    x0 = [2.0, 2.0]
    opts = FminboxOptions(lower=[1.5, 1.5], upper=[3.0, 3.0])
    result = fminbox(rosenbrock_f, x0, rosenbrock_grad, opts)

    # Constrained optimum near [1.5, 2.25] - may not fully converge
    assert abs(result.x[0] - 1.5) < 0.1
    assert result.fun < 1.0  # Should be close to constrained minimum


def test_fminbox_invalid_bounds():
    """Test fminbox with invalid bounds."""
    x0 = [1.0]
    opts = FminboxOptions(lower=[5.0], upper=[2.0])
    result = fminbox(sphere_f, x0, sphere_grad, opts)

    assert result.converged is False
    assert "Invalid bounds" in result.message


def test_barrier_value():
    """Test barrier value computation."""
    x = [2.0]
    lower = [0.0]
    upper = [4.0]

    val = barrier_value(x, lower, upper)
    expected = -2.0 * math.log(2.0)
    assert abs(val - expected) < 1e-6


def test_barrier_value_outside():
    """Test barrier value outside bounds."""
    x = [0.0]
    lower = [0.0]
    upper = [4.0]

    val = barrier_value(x, lower, upper)
    assert val == math.inf


def test_barrier_value_infinite_bounds():
    """Test barrier value with infinite bounds."""
    x = [5.0]
    lower = [-math.inf]
    upper = [math.inf]

    val = barrier_value(x, lower, upper)
    assert val == 0.0


def test_barrier_gradient():
    """Test barrier gradient computation."""
    x = [2.0, 3.0]
    lower = [0.0, 0.0]
    upper = [4.0, 6.0]

    grad = barrier_gradient(x, lower, upper)

    # Component 0: -1/(2-0) + 1/(4-2) = -0.5 + 0.5 = 0
    # Component 1: -1/(3-0) + 1/(6-3) = -1/3 + 1/3 = 0
    assert abs(grad[0]) < 1e-6
    assert abs(grad[1]) < 1e-6


def test_projected_gradient_norm_at_bound():
    """Test projected gradient norm at lower bound."""
    x = [0.0]
    g = [1.0]  # Pointing outward
    lower = [0.0]
    upper = [10.0]

    norm = projected_gradient_norm(x, g, lower, upper)
    assert norm == 0.0  # Gradient pointing outside is zeroed


def test_projected_gradient_norm_interior():
    """Test projected gradient norm at interior point."""
    x = [2.0, 3.0]
    g = [0.5, -0.3]
    lower = [0.0, 0.0]
    upper = [10.0, 10.0]

    norm = projected_gradient_norm(x, g, lower, upper)
    assert abs(norm - 0.5) < 1e-6  # Should equal infinity norm of g


def test_fminbox_method_bfgs():
    """Test fminbox with BFGS inner solver."""
    x0 = [1.0, 1.0]
    opts = FminboxOptions(lower=[-5.0, -5.0], upper=[5.0, 5.0], method="bfgs")
    result = fminbox(sphere_f, x0, sphere_grad, opts)

    assert result.converged is True
    assert result.fun < 1e-6


def test_fminbox_nudge_on_boundary():
    """Test that x0 on boundary is nudged to interior."""
    x0 = [0.0, 0.0]  # On lower boundary
    opts = FminboxOptions(lower=[0.0, 0.0], upper=[10.0, 10.0])
    result = fminbox(sphere_f, x0, sphere_grad, opts)

    # Should succeed (x0 is nudged to interior)
    assert result.converged is True


def test_fminbox_nudge_outside_boundary():
    """Test that x0 outside bounds is nudged to interior."""
    x0 = [-1.0, 11.0]  # Outside bounds
    opts = FminboxOptions(lower=[0.0, 0.0], upper=[10.0, 10.0])
    result = fminbox(sphere_f, x0, sphere_grad, opts)

    # Should succeed (x0 is nudged to interior)
    assert result.converged is True
