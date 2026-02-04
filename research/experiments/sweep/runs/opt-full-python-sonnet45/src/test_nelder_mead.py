"""Tests for nelder_mead."""

from .nelder_mead import nelder_mead
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, HIMMELBLAU_MINIMA


def test_sphere():
    r = nelder_mead(sphere.f, sphere.starting_point)
    assert r.converged
    assert r.fun < 1e-6
    assert abs(r.x[0]) < 1e-3
    assert abs(r.x[1]) < 1e-3

def test_booth():
    r = nelder_mead(booth.f, booth.starting_point)
    assert r.converged
    assert r.fun < 1e-6
    assert abs(r.x[0] - 1) < 1e-3
    assert abs(r.x[1] - 3) < 1e-3

def test_rosenbrock():
    r = nelder_mead(rosenbrock.f, rosenbrock.starting_point, max_iterations=5000, func_tol=1e-14)
    assert r.converged
    assert r.fun < 1e-6

def test_beale():
    r = nelder_mead(beale.f, beale.starting_point, max_iterations=5000)
    assert r.converged
    assert r.fun < 1e-6

def test_himmelblau():
    r = nelder_mead(himmelblau.f, himmelblau.starting_point)
    assert r.converged
    assert r.fun < 1e-6
    # Check near one of four minima
    near_min = any(
        abs(r.x[0] - m[0]) < 0.1 and abs(r.x[1] - m[1]) < 0.1
        for m in HIMMELBLAU_MINIMA
    )
    assert near_min

def test_max_iterations():
    r = nelder_mead(rosenbrock.f, rosenbrock.starting_point, max_iterations=5)
    assert r.iterations <= 5
    assert not r.converged

def test_gradient_calls_zero():
    r = nelder_mead(sphere.f, [1, 1])
    assert r.gradient_calls == 0
    assert r.gradient is None
