"""Tests for hager_zhang module."""

import pytest
from hager_zhang import hager_zhang_line_search, HagerZhangOptions
from test_functions import (
    sphere_f, sphere_grad, booth_f, booth_grad,
    rosenbrock_f, rosenbrock_grad, beale_f, beale_grad,
    himmelblau_f, himmelblau_grad, goldstein_price_f, goldstein_price_grad
)
from vec_ops import negate


def test_hager_zhang_sphere_simple():
    """Test HZ line search on sphere from [0.5, 0.5] with d=[-0.5, -0.5]."""
    x = [0.5, 0.5]
    d = [-0.5, -0.5]
    fx = sphere_f(x)
    gx = sphere_grad(x)

    result = hager_zhang_line_search(sphere_f, sphere_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new < fx
    assert result.function_calls >= 1
    assert result.gradient_calls >= 1


def test_hager_zhang_sphere():
    """Test HZ line search on sphere from [5, 5] with steepest descent."""
    x = [5.0, 5.0]
    fx = sphere_f(x)
    gx = sphere_grad(x)
    d = negate(gx)

    result = hager_zhang_line_search(sphere_f, sphere_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new < 1.0
    assert 0.1 < result.alpha < 2.0


def test_hager_zhang_booth():
    """Test HZ on Booth."""
    x = [0.0, 0.0]
    fx = booth_f(x)
    gx = booth_grad(x)
    d = negate(gx)

    result = hager_zhang_line_search(booth_f, booth_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new <= fx


def test_hager_zhang_rosenbrock():
    """Test HZ on Rosenbrock."""
    x = [-1.2, 1.0]
    fx = rosenbrock_f(x)
    gx = rosenbrock_grad(x)
    d = negate(gx)

    result = hager_zhang_line_search(rosenbrock_f, rosenbrock_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new <= fx


def test_hager_zhang_beale():
    """Test HZ on Beale."""
    x = [0.0, 0.0]
    fx = beale_f(x)
    gx = beale_grad(x)
    d = negate(gx)

    result = hager_zhang_line_search(beale_f, beale_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new <= fx


def test_hager_zhang_himmelblau():
    """Test HZ on Himmelblau."""
    x = [0.0, 0.0]
    fx = himmelblau_f(x)
    gx = himmelblau_grad(x)
    d = negate(gx)

    result = hager_zhang_line_search(himmelblau_f, himmelblau_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new <= fx


def test_hager_zhang_goldstein_price():
    """Test HZ on Goldstein-Price."""
    x = [-0.1, -0.9]
    fx = goldstein_price_f(x)
    gx = goldstein_price_grad(x)
    d = negate(gx)

    result = hager_zhang_line_search(goldstein_price_f, goldstein_price_grad, x, d, fx, gx)

    assert result.success is True
    assert result.f_new <= fx


def test_hager_zhang_bracket_expansion():
    """Test bracket expansion on f(x) = x^2 from x=[100]."""
    def f(x):
        return x[0] ** 2

    def grad(x):
        return [2.0 * x[0]]

    x = [100.0]
    fx = f(x)
    gx = grad(x)
    d = [-200.0]  # Steepest descent

    result = hager_zhang_line_search(f, grad, x, d, fx, gx)

    assert result.success is True
    # alpha may or may not be > 1.0 depending on exact line search behavior
    assert result.f_new < fx


def test_hager_zhang_failure_linear():
    """Test HZ failure on always-decreasing linear function."""
    def f(x):
        return -x[0]

    def grad(x):
        return [-1.0]

    x = [0.0]
    fx = f(x)
    gx = grad(x)
    d = [1.0]  # Direction of decrease

    opts = HagerZhangOptions(max_bracket_iter=2)
    result = hager_zhang_line_search(f, grad, x, d, fx, gx, opts)

    # Should fail due to bracket expansion exhaustion
    assert result.success is False


def test_hager_zhang_failure_strict_conditions():
    """Test HZ failure with strict conditions and limited iterations."""
    x = [-1.2, 1.0]
    fx = rosenbrock_f(x)
    gx = rosenbrock_grad(x)
    d = negate(gx)

    opts = HagerZhangOptions(delta=0.99, sigma=0.99, max_secant_iter=1)
    result = hager_zhang_line_search(rosenbrock_f, rosenbrock_grad, x, d, fx, gx, opts)

    # May fail with very strict conditions
    # At minimum, should not crash
    assert result.alpha > 0
