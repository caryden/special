"""Tests for finite-diff."""

import pytest
from finite_diff import forward_diff_gradient, central_diff_gradient, make_gradient


# Test functions
def sphere(x):
    """f(x) = sum(x_i^2)"""
    return sum(xi**2 for xi in x)


def sphere_grad(x):
    """Analytic gradient of sphere."""
    return [2 * xi for xi in x]


def rosenbrock(x):
    """Rosenbrock function."""
    return (1 - x[0])**2 + 100 * (x[1] - x[0]**2)**2


def rosenbrock_grad(x):
    """Analytic gradient of Rosenbrock."""
    return [
        -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0]**2),
        200 * (x[1] - x[0]**2)
    ]


def beale(x):
    """Beale function."""
    return (
        (1.5 - x[0] + x[0] * x[1])**2 +
        (2.25 - x[0] + x[0] * x[1]**2)**2 +
        (2.625 - x[0] + x[0] * x[1]**3)**2
    )


def beale_grad(x):
    """Analytic gradient of Beale."""
    t1 = 1.5 - x[0] + x[0] * x[1]
    t2 = 2.25 - x[0] + x[0] * x[1]**2
    t3 = 2.625 - x[0] + x[0] * x[1]**3

    dx0 = (
        2 * t1 * (-1 + x[1]) +
        2 * t2 * (-1 + x[1]**2) +
        2 * t3 * (-1 + x[1]**3)
    )
    dx1 = (
        2 * t1 * x[0] +
        2 * t2 * x[0] * 2 * x[1] +
        2 * t3 * x[0] * 3 * x[1]**2
    )
    return [dx0, dx1]


def test_forward_diff_sphere_nonzero():
    """Test forward differences on sphere at [3, 4]."""
    x = [3.0, 4.0]
    grad_fd = forward_diff_gradient(sphere, x)
    grad_analytic = sphere_grad(x)

    assert grad_fd[0] == pytest.approx(grad_analytic[0], abs=1e-7)
    assert grad_fd[1] == pytest.approx(grad_analytic[1], abs=1e-7)


def test_forward_diff_sphere_zero():
    """Test forward differences on sphere at origin."""
    x = [0.0, 0.0]
    grad_fd = forward_diff_gradient(sphere, x)
    grad_analytic = sphere_grad(x)

    assert grad_fd[0] == pytest.approx(grad_analytic[0], abs=1e-7)
    assert grad_fd[1] == pytest.approx(grad_analytic[1], abs=1e-7)


def test_forward_diff_rosenbrock():
    """Test forward differences on Rosenbrock."""
    x = [-1.2, 1.0]
    grad_fd = forward_diff_gradient(rosenbrock, x)
    grad_analytic = rosenbrock_grad(x)

    assert grad_fd[0] == pytest.approx(grad_analytic[0], abs=1e-4)
    assert grad_fd[1] == pytest.approx(grad_analytic[1], abs=1e-4)


def test_forward_diff_beale():
    """Test forward differences on Beale."""
    x = [1.0, 1.0]
    grad_fd = forward_diff_gradient(beale, x)
    grad_analytic = beale_grad(x)

    assert grad_fd[0] == pytest.approx(grad_analytic[0], abs=1e-5)
    assert grad_fd[1] == pytest.approx(grad_analytic[1], abs=1e-5)


def test_central_diff_sphere_nonzero():
    """Test central differences on sphere at [3, 4]."""
    x = [3.0, 4.0]
    grad_cd = central_diff_gradient(sphere, x)
    grad_analytic = sphere_grad(x)

    assert grad_cd[0] == pytest.approx(grad_analytic[0], abs=1e-9)
    assert grad_cd[1] == pytest.approx(grad_analytic[1], abs=1e-9)


def test_central_diff_sphere_zero():
    """Test central differences on sphere at origin."""
    x = [0.0, 0.0]
    grad_cd = central_diff_gradient(sphere, x)
    grad_analytic = sphere_grad(x)

    assert grad_cd[0] == pytest.approx(grad_analytic[0], abs=1e-10)
    assert grad_cd[1] == pytest.approx(grad_analytic[1], abs=1e-10)


def test_central_diff_rosenbrock():
    """Test central differences on Rosenbrock."""
    x = [-1.2, 1.0]
    grad_cd = central_diff_gradient(rosenbrock, x)
    grad_analytic = rosenbrock_grad(x)

    assert grad_cd[0] == pytest.approx(grad_analytic[0], abs=1e-7)
    assert grad_cd[1] == pytest.approx(grad_analytic[1], abs=1e-7)


def test_central_diff_beale():
    """Test central differences on Beale."""
    x = [1.0, 1.0]
    grad_cd = central_diff_gradient(beale, x)
    grad_analytic = beale_grad(x)

    assert grad_cd[0] == pytest.approx(grad_analytic[0], abs=1e-8)
    assert grad_cd[1] == pytest.approx(grad_analytic[1], abs=1e-8)


def test_make_gradient_forward():
    """Test make_gradient with forward method."""
    grad_fn = make_gradient(sphere)
    x = [3.0, 4.0]
    grad = grad_fn(x)
    grad_analytic = sphere_grad(x)

    assert grad[0] == pytest.approx(grad_analytic[0], abs=1e-7)
    assert grad[1] == pytest.approx(grad_analytic[1], abs=1e-7)


def test_make_gradient_central():
    """Test make_gradient with central method."""
    grad_fn = make_gradient(sphere, "central")
    x = [3.0, 4.0]
    grad = grad_fn(x)
    grad_analytic = sphere_grad(x)

    assert grad[0] == pytest.approx(grad_analytic[0], abs=1e-9)
    assert grad[1] == pytest.approx(grad_analytic[1], abs=1e-9)
