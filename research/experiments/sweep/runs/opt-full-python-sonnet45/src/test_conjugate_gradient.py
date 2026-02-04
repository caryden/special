"""Tests for conjugate_gradient."""

from .conjugate_gradient import conjugate_gradient
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price


def test_sphere():
    r = conjugate_gradient(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-14

def test_booth():
    r = conjugate_gradient(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged
    assert abs(r.x[0] - 1) < 0.01
    assert abs(r.x[1] - 3) < 0.01

def test_rosenbrock():
    r = conjugate_gradient(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_beale():
    r = conjugate_gradient(beale.f, beale.starting_point, grad=beale.gradient)
    assert r.converged
    assert abs(r.x[0] - 3) < 0.01
    assert abs(r.x[1] - 0.5) < 0.01

def test_himmelblau():
    r = conjugate_gradient(himmelblau.f, himmelblau.starting_point, grad=himmelblau.gradient)
    assert r.converged
    assert r.fun < 1e-10

def test_goldstein_price():
    r = conjugate_gradient(goldstein_price.f, goldstein_price.starting_point, grad=goldstein_price.gradient)
    assert r.converged
    assert abs(r.fun - 3) < 0.1

def test_sphere_fd():
    r = conjugate_gradient(sphere.f, sphere.starting_point)
    assert r.converged

def test_at_minimum():
    r = conjugate_gradient(sphere.f, [0, 0], grad=sphere.gradient)
    assert r.converged
    assert r.iterations == 0

def test_1d():
    f = lambda x: x[0] ** 2
    g = lambda x: [2 * x[0]]
    r = conjugate_gradient(f, [5.0], grad=g)
    assert r.converged

def test_5d_sphere():
    f = lambda x: sum(xi ** 2 for xi in x)
    g = lambda x: [2 * xi for xi in x]
    r = conjugate_gradient(f, [1, 2, 3, 4, 5], grad=g)
    assert r.converged

def test_max_iterations():
    r = conjugate_gradient(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, max_iterations=2)
    assert not r.converged
    assert "maximum iterations" in r.message
