"""Tests for conjugate_gradient module."""

import pytest
from conjugate_gradient import conjugate_gradient, ConjugateGradientOptions
from test_functions import (
    sphere_f, sphere_grad, booth_f, booth_grad,
    rosenbrock_f, rosenbrock_grad, beale_f, beale_grad,
    himmelblau_f, himmelblau_grad, goldstein_price_f
)


def test_conjugate_gradient_sphere():
    """Test CG on sphere from [5, 5]."""
    x0 = [5.0, 5.0]
    result = conjugate_gradient(sphere_f, x0, sphere_grad)

    assert result.converged is True
    assert result.fun < 1e-14


def test_conjugate_gradient_booth():
    """Test CG on Booth from [0, 0]."""
    x0 = [0.0, 0.0]
    result = conjugate_gradient(booth_f, x0, booth_grad)

    assert result.converged is True
    assert abs(result.x[0] - 1.0) < 1e-3
    assert abs(result.x[1] - 3.0) < 1e-3


def test_conjugate_gradient_rosenbrock():
    """Test CG on Rosenbrock from [-1.2, 1.0]."""
    x0 = [-1.2, 1.0]
    result = conjugate_gradient(rosenbrock_f, x0, rosenbrock_grad)

    assert result.converged is True
    assert result.fun < 1e-8


def test_conjugate_gradient_beale():
    """Test CG on Beale from [0, 0]."""
    x0 = [0.0, 0.0]
    result = conjugate_gradient(beale_f, x0, beale_grad)

    assert result.converged is True
    assert abs(result.x[0] - 3.0) < 1e-2
    assert abs(result.x[1] - 0.5) < 1e-2


def test_conjugate_gradient_himmelblau():
    """Test CG on Himmelblau from [0, 0]."""
    x0 = [0.0, 0.0]
    result = conjugate_gradient(himmelblau_f, x0, himmelblau_grad)

    assert result.converged is True
    assert result.fun < 1e-10


def test_conjugate_gradient_goldstein_price():
    """Test CG on Goldstein-Price from [-0.1, -0.9]."""
    x0 = [-0.1, -0.9]
    result = conjugate_gradient(goldstein_price_f, x0)

    assert result.converged is True
    assert abs(result.fun - 3.0) < 1e-1


def test_conjugate_gradient_without_gradient():
    """Test CG with finite differences."""
    x0 = [5.0, 5.0]
    result = conjugate_gradient(sphere_f, x0)

    assert result.converged is True
    assert result.fun < 1e-10


def test_conjugate_gradient_1d():
    """Test CG on 1D problem."""
    def f(x):
        return x[0] ** 2

    def grad(x):
        return [2.0 * x[0]]

    x0 = [5.0]
    result = conjugate_gradient(f, x0, grad)

    assert result.converged is True


def test_conjugate_gradient_5d_sphere():
    """Test CG on 5D sphere."""
    x0 = [1.0, 2.0, 3.0, 4.0, 5.0]

    def f(x):
        return sum(xi ** 2 for xi in x)

    def grad(x):
        return [2.0 * xi for xi in x]

    result = conjugate_gradient(f, x0, grad)

    assert result.converged is True


def test_conjugate_gradient_already_at_minimum():
    """Test CG starting at minimum."""
    x0 = [0.0, 0.0]
    result = conjugate_gradient(sphere_f, x0, sphere_grad)

    assert result.converged is True
    assert result.iterations == 0


def test_conjugate_gradient_max_iterations():
    """Test CG with max iterations limit."""
    x0 = [-1.2, 1.0]
    opts = ConjugateGradientOptions(max_iterations=5)
    result = conjugate_gradient(rosenbrock_f, x0, rosenbrock_grad, opts)

    assert result.converged is False


def test_conjugate_gradient_max_iterations_message():
    """Test CG max iterations message."""
    x0 = [-1.2, 1.0]
    opts = ConjugateGradientOptions(max_iterations=2)
    result = conjugate_gradient(rosenbrock_f, x0, rosenbrock_grad, opts)

    assert "maximum iterations" in result.message.lower()
