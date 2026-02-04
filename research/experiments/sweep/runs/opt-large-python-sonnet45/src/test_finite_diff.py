"""Tests for finite_diff module."""

import pytest
from finite_diff import forward_diff_gradient, central_diff_gradient, make_gradient
from test_functions import sphere_f, sphere_grad, rosenbrock_f, rosenbrock_grad, beale_f, beale_grad


def test_forward_diff_sphere():
    """Test forward differences on sphere."""
    x = [3.0, 4.0]
    grad_numeric = forward_diff_gradient(sphere_f, x)
    grad_analytic = sphere_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-7


def test_forward_diff_sphere_at_origin():
    """Test forward differences at origin."""
    x = [0.0, 0.0]
    grad_numeric = forward_diff_gradient(sphere_f, x)
    grad_analytic = sphere_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-7


def test_central_diff_sphere():
    """Test central differences on sphere."""
    x = [3.0, 4.0]
    grad_numeric = central_diff_gradient(sphere_f, x)
    grad_analytic = sphere_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-9


def test_forward_diff_rosenbrock():
    """Test forward differences on Rosenbrock."""
    x = [-1.2, 1.0]
    grad_numeric = forward_diff_gradient(rosenbrock_f, x)
    grad_analytic = rosenbrock_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-4


def test_central_diff_rosenbrock():
    """Test central differences on Rosenbrock."""
    x = [-1.2, 1.0]
    grad_numeric = central_diff_gradient(rosenbrock_f, x)
    grad_analytic = rosenbrock_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-7


def test_forward_diff_beale():
    """Test forward differences on Beale."""
    x = [1.0, 1.0]
    grad_numeric = forward_diff_gradient(beale_f, x)
    grad_analytic = beale_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-5


def test_central_diff_beale():
    """Test central differences on Beale."""
    x = [1.0, 1.0]
    grad_numeric = central_diff_gradient(beale_f, x)
    grad_analytic = beale_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-8


def test_make_gradient_forward():
    """Test make_gradient factory with forward method."""
    grad_fn = make_gradient(sphere_f, "forward")
    x = [3.0, 4.0]
    grad_numeric = grad_fn(x)
    grad_analytic = sphere_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-7


def test_make_gradient_central():
    """Test make_gradient factory with central method."""
    grad_fn = make_gradient(sphere_f, "central")
    x = [3.0, 4.0]
    grad_numeric = grad_fn(x)
    grad_analytic = sphere_grad(x)

    for i in range(len(x)):
        assert abs(grad_numeric[i] - grad_analytic[i]) < 1e-9
