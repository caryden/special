"""Tests for line_search."""

from .line_search import backtracking_line_search, wolfe_line_search
from .test_functions import sphere, rosenbrock
from .vec_ops import dot, negate


def test_backtracking_sphere():
    x = [10, 10]
    g = sphere.gradient(x)
    d = negate(g)
    fx = sphere.f(x)
    r = backtracking_line_search(sphere.f, x, d, fx, g)
    assert r.success
    assert abs(r.alpha - 0.5) < 1e-10
    assert abs(r.f_new) < 1e-10

def test_backtracking_rosenbrock():
    x = rosenbrock.starting_point
    g = rosenbrock.gradient(x)
    d = negate(g)
    fx = rosenbrock.f(x)
    r = backtracking_line_search(rosenbrock.f, x, d, fx, g)
    assert r.success
    assert r.f_new < fx

def test_backtracking_ascending():
    x = [10, 10]
    g = sphere.gradient(x)
    d = g  # ascending
    fx = sphere.f(x)
    r = backtracking_line_search(sphere.f, x, d, fx, g)
    assert not r.success

def test_wolfe_sphere():
    x = [10, 10]
    g = sphere.gradient(x)
    d = negate(g)
    fx = sphere.f(x)
    r = wolfe_line_search(sphere.f, sphere.gradient, x, d, fx, g)
    assert r.success
    assert r.g_new is not None
    assert len(r.g_new) == 2

def test_wolfe_rosenbrock():
    x = rosenbrock.starting_point
    g = rosenbrock.gradient(x)
    d = negate(g)
    fx = rosenbrock.f(x)
    r = wolfe_line_search(rosenbrock.f, rosenbrock.gradient, x, d, fx, g)
    assert r.success
    assert r.f_new < fx

def test_wolfe_conditions():
    x = [10, 10]
    g = sphere.gradient(x)
    d = negate(g)
    fx = sphere.f(x)
    c1, c2 = 1e-4, 0.9
    r = wolfe_line_search(sphere.f, sphere.gradient, x, d, fx, g, c1=c1, c2=c2)
    assert r.success
    assert r.f_new <= fx + c1 * r.alpha * dot(g, d)
    if r.g_new:
        assert abs(dot(r.g_new, d)) <= c2 * abs(dot(g, d))
