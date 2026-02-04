"""Tests for newton_trust_region."""

from .newton_trust_region import newton_trust_region
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price


def test_sphere():
    r = newton_trust_region(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-14

def test_booth():
    r = newton_trust_region(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged
    assert abs(r.x[0] - 1) < 0.01

def test_rosenbrock():
    r = newton_trust_region(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-8

def test_beale():
    r = newton_trust_region(beale.f, beale.starting_point, grad=beale.gradient)
    assert r.converged
    assert abs(r.x[0] - 3) < 0.01

def test_himmelblau():
    r = newton_trust_region(himmelblau.f, himmelblau.starting_point, grad=himmelblau.gradient)
    assert r.converged
    assert r.fun < 1e-10

def test_goldstein_price():
    r = newton_trust_region(goldstein_price.f, goldstein_price.starting_point, grad=goldstein_price.gradient)
    assert r.converged
    assert abs(r.fun - 3) < 0.1

def test_at_minimum():
    r = newton_trust_region(sphere.f, [0, 0], grad=sphere.gradient)
    assert r.converged
    assert r.iterations == 0

def test_small_delta():
    r = newton_trust_region(sphere.f, sphere.starting_point, grad=sphere.gradient, initial_delta=0.1)
    assert r.converged

def test_small_max_delta():
    r = newton_trust_region(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, max_delta=0.5)
    assert r.converged

def test_1d():
    f = lambda x: x[0] ** 2
    g = lambda x: [2 * x[0]]
    r = newton_trust_region(f, [5.0], grad=g)
    assert r.converged

def test_saddle():
    f = lambda x: x[0] ** 2 - x[1] ** 2
    g = lambda x: [2 * x[0], -2 * x[1]]
    r = newton_trust_region(f, [1, 1], grad=g, max_iterations=100)
    # Should handle indefinite Hessian via Cauchy fallback
