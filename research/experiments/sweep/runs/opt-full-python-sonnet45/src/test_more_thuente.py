"""Tests for more_thuente."""

from .more_thuente import more_thuente, cstep
from .test_functions import sphere, rosenbrock
from .vec_ops import dot, negate
import math


def test_sphere_convergence():
    x = [5, 5]
    g = sphere.gradient(x)
    d = negate(g)
    fx = sphere.f(x)
    r = more_thuente(sphere.f, sphere.gradient, x, d, fx, g)
    assert r.success
    assert r.alpha > 0
    assert r.f_new < 50

def test_rosenbrock_convergence():
    x = rosenbrock.starting_point
    g = rosenbrock.gradient(x)
    d = negate(g)
    fx = rosenbrock.f(x)
    r = more_thuente(rosenbrock.f, rosenbrock.gradient, x, d, fx, g)
    assert r.success
    assert r.f_new < fx

def test_max_fev():
    f = lambda x: -x[0]
    g = lambda x: [-1.0]
    x = [0.0]
    gx = g(x)
    d = [1.0]
    fx = f(x)
    r = more_thuente(f, g, x, d, fx, gx, max_fev=3)
    assert not r.success

def test_wolfe_conditions():
    x = [5, 5]
    g = sphere.gradient(x)
    d = negate(g)
    fx = sphere.f(x)
    c1 = 1e-4
    c2 = 0.9
    r = more_thuente(sphere.f, sphere.gradient, x, d, fx, g, f_tol=c1, gtol=c2)
    if r.success:
        dg0 = dot(g, d)
        assert r.f_new <= fx + c1 * r.alpha * dg0
        if r.g_new:
            assert abs(dot(r.g_new, d)) <= c2 * abs(dg0)

def test_cstep_case3():
    r = cstep(5, 10, -10, 0, 0, 0, 2, 8, -5, False, 0, 100)
    assert r.info == 3

def test_cstep_case4_bracketed():
    r = cstep(1, 2, -1, 5, 10, 1, 3, 1, -2, True, 0, 100)
    assert r.info == 4

def test_cstep_case4_stmin():
    r = cstep(5, 10, -1, 0, 0, 0, 2, 5, -3, False, 0, 100)
    assert r.info == 4
