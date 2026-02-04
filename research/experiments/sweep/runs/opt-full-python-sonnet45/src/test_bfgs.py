"""Tests for bfgs."""

from .bfgs import bfgs
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price, HIMMELBLAU_MINIMA


def test_sphere():
    r = bfgs(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-8
    assert abs(r.x[0]) < 1e-4
    assert r.iterations < 20

def test_booth():
    r = bfgs(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged
    assert r.fun < 1e-8
    assert abs(r.x[0] - 1) < 1e-3
    assert abs(r.x[1] - 3) < 1e-3

def test_sphere_fd():
    r = bfgs(sphere.f, sphere.starting_point)
    assert r.converged
    assert r.fun < 1e-6

def test_rosenbrock():
    r = bfgs(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-10

def test_beale():
    r = bfgs(beale.f, beale.starting_point, grad=beale.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_himmelblau():
    r = bfgs(himmelblau.f, himmelblau.starting_point, grad=himmelblau.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_goldstein_price():
    r = bfgs(goldstein_price.f, goldstein_price.starting_point, grad=goldstein_price.gradient)
    assert r.converged
    assert abs(r.fun - 3) < 1e-4

def test_at_minimum():
    r = bfgs(sphere.f, [0, 0], grad=sphere.gradient)
    assert r.converged
    assert r.iterations == 0

def test_max_iterations():
    r = bfgs(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, max_iterations=2)
    assert not r.converged
    assert "maximum iterations" in r.message

def test_returns_gradient():
    r = bfgs(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.gradient is not None

def test_rosenbrock_fd():
    r = bfgs(rosenbrock.f, rosenbrock.starting_point)
    assert r.fun < 1e-6
