"""Tests for bfgs module."""

import pytest
from bfgs import bfgs
from result_types import OptimizeOptions
from test_functions import (
    sphere_f, sphere_grad, booth_f, booth_grad,
    rosenbrock_f, rosenbrock_grad, beale_f, beale_grad,
    himmelblau_f, himmelblau_grad, goldstein_price_f
)


def test_bfgs_sphere():
    """Test BFGS on sphere from [5, 5]."""
    x0 = [5.0, 5.0]
    result = bfgs(sphere_f, x0, sphere_grad)

    assert result.converged is True
    assert result.fun < 1e-8
    assert abs(result.x[0]) < 1e-4
    assert abs(result.x[1]) < 1e-4
    assert result.iterations < 20


def test_bfgs_booth():
    """Test BFGS on Booth from [0, 0]."""
    x0 = [0.0, 0.0]
    result = bfgs(booth_f, x0, booth_grad)

    assert result.converged is True
    assert result.fun < 1e-8
    assert abs(result.x[0] - 1.0) < 1e-4
    assert abs(result.x[1] - 3.0) < 1e-4


def test_bfgs_rosenbrock():
    """Test BFGS on Rosenbrock from [-1.2, 1.0]."""
    x0 = [-1.2, 1.0]
    result = bfgs(rosenbrock_f, x0, rosenbrock_grad)

    assert result.converged is True
    assert result.fun < 1e-10
    assert abs(result.x[0] - 1.0) < 1e-3
    assert abs(result.x[1] - 1.0) < 1e-3


def test_bfgs_beale():
    """Test BFGS on Beale from [0, 0]."""
    x0 = [0.0, 0.0]
    result = bfgs(beale_f, x0, beale_grad)

    assert result.converged is True
    assert result.fun < 1e-8


def test_bfgs_himmelblau():
    """Test BFGS on Himmelblau from [0, 0]."""
    x0 = [0.0, 0.0]
    result = bfgs(himmelblau_f, x0, himmelblau_grad)

    assert result.converged is True
    assert result.fun < 1e-8


def test_bfgs_goldstein_price():
    """Test BFGS on Goldstein-Price from [-0.1, -0.9]."""
    x0 = [-0.1, -0.9]
    result = bfgs(goldstein_price_f, x0)

    assert result.converged is True
    assert abs(result.fun - 3.0) < 1e-2


def test_bfgs_without_gradient():
    """Test BFGS with finite differences."""
    x0 = [5.0, 5.0]
    result = bfgs(sphere_f, x0)

    assert result.converged is True
    assert result.fun < 1e-6


def test_bfgs_returns_gradient():
    """Test that BFGS returns gradient at solution."""
    x0 = [5.0, 5.0]
    result = bfgs(sphere_f, x0, sphere_grad)

    assert result.gradient is not None
    assert len(result.gradient) == 2


def test_bfgs_max_iterations():
    """Test BFGS with max iterations limit."""
    x0 = [-1.2, 1.0]
    opts = OptimizeOptions(max_iterations=3)
    result = bfgs(rosenbrock_f, x0, rosenbrock_grad, opts)

    assert result.iterations <= 3


def test_bfgs_already_at_minimum():
    """Test BFGS starting at minimum."""
    x0 = [0.0, 0.0]
    result = bfgs(sphere_f, x0, sphere_grad)

    assert result.converged is True
    assert result.iterations == 0


def test_bfgs_max_iterations_not_converged():
    """Test BFGS with impossible tolerance."""
    x0 = [-1.2, 1.0]
    opts = OptimizeOptions(max_iterations=2, grad_tol=1e-20)
    result = bfgs(rosenbrock_f, x0, rosenbrock_grad, opts)

    assert result.converged is False
    assert "maximum iterations" in result.message.lower()
