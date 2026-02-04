"""Tests for l_bfgs module."""

import pytest
from l_bfgs import lbfgs, LBFGSOptions
from test_functions import (
    sphere_f, sphere_grad, booth_f, booth_grad,
    rosenbrock_f, rosenbrock_grad, beale_f, beale_grad,
    himmelblau_f, himmelblau_grad, goldstein_price_f
)


def test_lbfgs_sphere():
    """Test L-BFGS on sphere from [5, 5]."""
    x0 = [5.0, 5.0]
    result = lbfgs(sphere_f, x0, sphere_grad)

    assert result.converged is True
    assert result.fun < 1e-8
    assert abs(result.x[0]) < 1e-4
    assert abs(result.x[1]) < 1e-4


def test_lbfgs_booth():
    """Test L-BFGS on Booth from [0, 0]."""
    x0 = [0.0, 0.0]
    result = lbfgs(booth_f, x0, booth_grad)

    assert result.converged is True
    assert result.fun < 1e-8
    assert abs(result.x[0] - 1.0) < 1e-4
    assert abs(result.x[1] - 3.0) < 1e-4


def test_lbfgs_rosenbrock():
    """Test L-BFGS on Rosenbrock from [-1.2, 1.0]."""
    x0 = [-1.2, 1.0]
    result = lbfgs(rosenbrock_f, x0, rosenbrock_grad)

    assert result.converged is True
    assert result.fun < 1e-10
    assert abs(result.x[0] - 1.0) < 1e-3
    assert abs(result.x[1] - 1.0) < 1e-3


def test_lbfgs_beale():
    """Test L-BFGS on Beale from [0, 0]."""
    x0 = [0.0, 0.0]
    result = lbfgs(beale_f, x0, beale_grad)

    assert result.converged is True
    assert result.fun < 1e-8


def test_lbfgs_himmelblau():
    """Test L-BFGS on Himmelblau from [0, 0]."""
    x0 = [0.0, 0.0]
    result = lbfgs(himmelblau_f, x0, himmelblau_grad)

    assert result.converged is True
    assert result.fun < 1e-8


def test_lbfgs_goldstein_price():
    """Test L-BFGS on Goldstein-Price from [-0.1, -0.9]."""
    x0 = [-0.1, -0.9]
    result = lbfgs(goldstein_price_f, x0)

    # Goldstein-Price is hard with FD gradient, may not fully converge
    assert result.fun < 10.0  # Should at least improve significantly


def test_lbfgs_without_gradient():
    """Test L-BFGS with finite differences."""
    x0 = [5.0, 5.0]
    result = lbfgs(sphere_f, x0)

    assert result.converged is True
    assert result.fun < 1e-6


def test_lbfgs_custom_memory():
    """Test L-BFGS with custom memory."""
    x0 = [-1.2, 1.0]
    opts = LBFGSOptions(memory=3)
    result = lbfgs(rosenbrock_f, x0, rosenbrock_grad, opts)

    assert result.converged is True
    assert result.fun < 1e-6


def test_lbfgs_already_at_minimum():
    """Test L-BFGS starting at minimum."""
    x0 = [0.0, 0.0]
    result = lbfgs(sphere_f, x0, sphere_grad)

    assert result.converged is True
    assert result.iterations == 0


def test_lbfgs_max_iterations():
    """Test L-BFGS with max iterations limit."""
    x0 = [-1.2, 1.0]
    opts = LBFGSOptions(max_iterations=2)
    result = lbfgs(rosenbrock_f, x0, rosenbrock_grad, opts)

    assert result.converged is False
    assert "maximum iterations" in result.message.lower()
