"""Tests for newton."""

from .newton import newton
from .test_functions import sphere, booth, rosenbrock


def _sphere_hess(x):
    return [[2, 0], [0, 2]]

def _booth_hess(x):
    return [[10, 8], [8, 10]]

def _rosenbrock_hess(x):
    return [
        [-2 + 1200 * x[0] ** 2 - 400 * x[1], -400 * x[0]],
        [-400 * x[0], 200],
    ]


def test_sphere():
    r = newton(sphere.f, sphere.starting_point, grad=sphere.gradient, hess=_sphere_hess)
    assert r.converged
    assert r.fun < 1e-14
    assert r.iterations <= 2

def test_booth():
    r = newton(booth.f, booth.starting_point, grad=booth.gradient, hess=_booth_hess)
    assert r.converged
    assert abs(r.x[0] - 1) < 1e-6
    assert abs(r.x[1] - 3) < 1e-6

def test_rosenbrock():
    r = newton(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, hess=_rosenbrock_hess)
    assert r.converged
    assert r.fun < 1e-10

def test_sphere_fd_hessian():
    r = newton(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged

def test_booth_fd_hessian():
    r = newton(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged

def test_rosenbrock_fd():
    r = newton(rosenbrock.f, rosenbrock.starting_point)
    assert r.converged

def test_at_minimum():
    r = newton(sphere.f, [0, 0], grad=sphere.gradient, hess=_sphere_hess)
    assert r.converged
    assert r.iterations == 0

def test_1d():
    f = lambda x: x[0] ** 2
    g = lambda x: [2 * x[0]]
    h = lambda x: [[2]]
    r = newton(f, [5.0], grad=g, hess=h)
    assert r.converged
    assert r.iterations <= 2

def test_saddle():
    f = lambda x: x[0] ** 2 - x[1] ** 2
    g = lambda x: [2 * x[0], -2 * x[1]]
    h = lambda x: [[2, 0], [0, -2]]
    r = newton(f, [1, 1], grad=g, hess=h, max_iterations=100)
    # Should handle indefinite Hessian via regularization

def test_max_regularize_zero():
    f = lambda x: x[0] ** 2 - x[1] ** 2
    g = lambda x: [2 * x[0], -2 * x[1]]
    h = lambda x: [[2, 0], [0, -2]]
    r = newton(f, [1, 1], grad=g, hess=h, max_regularize=0)
    # With max_regularize=0, regularization can't help

def test_max_iterations():
    r = newton(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, max_iterations=2)
    # Should terminate within 2 iterations
