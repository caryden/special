"""Tests for l_bfgs."""

from .l_bfgs import lbfgs
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price


def test_sphere():
    r = lbfgs(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_booth():
    r = lbfgs(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_sphere_fd():
    r = lbfgs(sphere.f, sphere.starting_point)
    assert r.converged
    assert r.fun < 1e-6

def test_rosenbrock():
    r = lbfgs(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-10

def test_beale():
    r = lbfgs(beale.f, beale.starting_point, grad=beale.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_himmelblau():
    r = lbfgs(himmelblau.f, himmelblau.starting_point, grad=himmelblau.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_goldstein_price():
    r = lbfgs(goldstein_price.f, goldstein_price.starting_point, grad=goldstein_price.gradient)
    assert r.converged
    assert abs(r.fun - 3) < 1e-4

def test_rosenbrock_memory3():
    r = lbfgs(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, memory=3)
    assert r.converged
    assert r.fun < 1e-6

def test_at_minimum():
    r = lbfgs(sphere.f, [0, 0], grad=sphere.gradient)
    assert r.converged
    assert r.iterations == 0

def test_max_iterations():
    r = lbfgs(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, max_iterations=2)
    assert not r.converged
    assert "maximum iterations" in r.message
