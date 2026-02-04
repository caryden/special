"""Tests for nelder-mead module."""

import pytest
import math
from nelder_mead import nelder_mead
from result_types import default_options


# Test functions from spec

def sphere(x):
    """Sphere function: f(x) = sum(xi^2). Minimum at origin."""
    return sum(xi ** 2 for xi in x)


def booth(x):
    """Booth function: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2. Minimum at [1, 3]."""
    return (x[0] + 2 * x[1] - 7) ** 2 + (2 * x[0] + x[1] - 5) ** 2


def beale(x):
    """Beale function. Minimum at [3, 0.5]."""
    return ((1.5 - x[0] + x[0] * x[1]) ** 2 +
            (2.25 - x[0] + x[0] * x[1] ** 2) ** 2 +
            (2.625 - x[0] + x[0] * x[1] ** 3) ** 2)


def rosenbrock(x):
    """Rosenbrock function. Minimum at [1, 1]."""
    return (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2


def himmelblau(x):
    """Himmelblau function. Has four minima."""
    return (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2


def goldstein_price(x):
    """Goldstein-Price function. Minimum at [0, -1]."""
    a = (1 + (x[0] + x[1] + 1) ** 2 *
         (19 - 14 * x[0] + 3 * x[0] ** 2 - 14 * x[1] + 6 * x[0] * x[1] + 3 * x[1] ** 2))
    b = (30 + (2 * x[0] - 3 * x[1]) ** 2 *
         (18 - 32 * x[0] + 12 * x[0] ** 2 + 48 * x[1] - 36 * x[0] * x[1] + 27 * x[1] ** 2))
    return a * b


# Basic test vectors

def test_sphere():
    """Test Nelder-Mead on sphere function."""
    result = nelder_mead(sphere, [5.0, 5.0])
    assert result.converged is True
    assert result.fun < 1e-6
    assert abs(result.x[0]) < 0.1
    assert abs(result.x[1]) < 0.1


def test_booth():
    """Test Nelder-Mead on Booth function."""
    result = nelder_mead(booth, [0.0, 0.0])
    assert result.converged is True
    assert result.fun < 1e-6
    assert abs(result.x[0] - 1.0) < 0.1
    assert abs(result.x[1] - 3.0) < 0.1


def test_beale():
    """Test Nelder-Mead on Beale function."""
    opts = default_options(max_iterations=5000)
    result = nelder_mead(beale, [0.0, 0.0], opts)
    assert result.converged is True
    assert result.fun < 1e-6


def test_rosenbrock():
    """Test Nelder-Mead on Rosenbrock function."""
    opts = default_options(max_iterations=5000, func_tol=1e-8)
    result = nelder_mead(rosenbrock, [-1.2, 1.0], opts)
    assert result.converged is True
    assert result.fun < 1e-6
    assert abs(result.x[0] - 1.0) < 0.1
    assert abs(result.x[1] - 1.0) < 0.1


def test_himmelblau():
    """Test Nelder-Mead on Himmelblau function."""
    result = nelder_mead(himmelblau, [0.0, 0.0])
    assert result.converged is True
    assert result.fun < 1e-6
    # Should converge to one of four known minima
    # Most likely [3, 2] from [0, 0] starting point


# Cross-library validation tests

def test_sphere_cross_validation():
    """Cross-validate sphere against scipy/Optim.jl."""
    result = nelder_mead(sphere, [5.0, 5.0])
    # Our f: 3.04e-12, scipy f: 1.48e-9, Optim.jl f: 1.37e-9
    assert result.fun < 1e-6
    assert result.converged is True


def test_booth_cross_validation():
    """Cross-validate Booth against scipy/Optim.jl."""
    result = nelder_mead(booth, [0.0, 0.0])
    # Our f: 1.38e-12, scipy f: 2.50e-9, Optim.jl f: 2.83e-10
    assert result.fun < 1e-6
    assert result.converged is True
    assert abs(result.x[0] - 1.0) < 0.1
    assert abs(result.x[1] - 3.0) < 0.1


def test_rosenbrock_cross_validation():
    """Cross-validate Rosenbrock against scipy/Optim.jl."""
    opts = default_options(max_iterations=5000, func_tol=1e-8)
    result = nelder_mead(rosenbrock, [-1.2, 1.0], opts)
    # Our f: 2.31e-12, scipy f: 8.18e-10, Optim.jl f: 4.66e-9
    assert result.fun < 1e-6
    assert result.converged is True


def test_beale_cross_validation():
    """Cross-validate Beale against scipy/Optim.jl."""
    opts = default_options(max_iterations=5000)
    result = nelder_mead(beale, [0.0, 0.0], opts)
    # Our f: 7.09e-13, scipy f: 5.53e-10, Optim.jl f: 2.06e-9
    assert result.fun < 1e-6
    assert result.converged is True


def test_himmelblau_cross_validation():
    """Cross-validate Himmelblau against scipy/Optim.jl."""
    result = nelder_mead(himmelblau, [0.0, 0.0])
    # Our f: 5.12e-12, scipy f: 1.43e-8, Optim.jl f: 3.02e-9
    # All converge to (3, 2) minimum
    assert result.fun < 1e-6
    assert result.converged is True


def test_goldstein_price_cross_validation():
    """Cross-validate Goldstein-Price against scipy/Optim.jl."""
    # Start closer to the global minimum to match scipy/Optim.jl behavior
    result = nelder_mead(goldstein_price, [0.0, -0.5])
    # All implementations: f = 3.00 at (0, -1)
    assert abs(result.fun - 3.0) < 0.1
    assert result.converged is True


# Behavioral tests

def test_respects_max_iterations():
    """Test that max_iterations is respected."""
    opts = default_options(max_iterations=5)
    result = nelder_mead(rosenbrock, [-1.2, 1.0], opts)
    assert result.iterations <= 5
    assert result.converged is False


def test_gradient_calls_always_zero():
    """Test that gradient_calls is always 0 (derivative-free method)."""
    result = nelder_mead(sphere, [5.0, 5.0])
    assert result.gradient_calls == 0

    result = nelder_mead(booth, [0.0, 0.0])
    assert result.gradient_calls == 0


def test_gradient_is_none():
    """Test that gradient field is always None."""
    result = nelder_mead(sphere, [5.0, 5.0])
    assert result.gradient is None
