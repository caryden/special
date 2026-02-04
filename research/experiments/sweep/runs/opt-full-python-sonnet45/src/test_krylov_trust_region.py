"""Tests for krylov_trust_region."""

from .krylov_trust_region import krylov_trust_region
from .test_functions import sphere, booth, rosenbrock


def test_sphere():
    r = krylov_trust_region(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-6
    assert abs(r.x[0]) < 1e-3

def test_rosenbrock():
    r = krylov_trust_region(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-6

def test_booth():
    r = krylov_trust_region(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged
    assert abs(r.x[0] - 1) < 0.01

def test_negative_curvature():
    f = lambda x: -x[0] ** 2 - x[1] ** 2
    g = lambda x: [-2 * x[0], -2 * x[1]]
    r = krylov_trust_region(f, [0.1, 0.1], grad=g, max_iterations=50)
    # Should not crash; makes progress
    assert r.fun <= f([0.1, 0.1])

def test_at_minimum():
    r = krylov_trust_region(sphere.f, [0, 0], grad=sphere.gradient)
    assert r.converged
    assert r.iterations == 0
