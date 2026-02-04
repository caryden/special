"""Tests for fminbox."""

import math
from .fminbox import fminbox, barrier_value, barrier_gradient, projected_gradient_norm
from .test_functions import sphere, rosenbrock


def test_interior_minimum():
    r = fminbox(
        sphere.f, [1, 1], sphere.gradient,
        lower=[-5, -5], upper=[5, 5],
    )
    assert r.converged
    assert abs(r.x[0]) < 0.01
    assert abs(r.x[1]) < 0.01
    assert r.fun < 0.01

def test_boundary_minimum():
    f = lambda x: x[0] ** 2
    g = lambda x: [2 * x[0]]
    r = fminbox(f, [5.0], g, lower=[2.0], upper=[10.0])
    assert abs(r.x[0] - 2.0) < 0.01
    assert abs(r.fun - 4.0) < 0.1

def test_rosenbrock_constrained():
    r = fminbox(
        rosenbrock.f, [2, 2], rosenbrock.gradient,
        lower=[1.5, 1.5], upper=[3, 3],
    )
    assert abs(r.x[0] - 1.5) < 0.1

def test_invalid_bounds():
    f = lambda x: x[0] ** 2
    g = lambda x: [2 * x[0]]
    r = fminbox(f, [1.0], g, lower=[5.0], upper=[2.0])
    assert not r.converged
    assert "Invalid bounds" in r.message

def test_barrier_value_basic():
    v = barrier_value([2.0], [0.0], [4.0])
    assert abs(v - (-2 * math.log(2))) < 1e-10

def test_barrier_value_outside():
    v = barrier_value([0.0], [0.0], [4.0])
    assert v == float('inf')

def test_barrier_value_infinite_bounds():
    v = barrier_value([5.0], [float('-inf')], [float('inf')])
    assert v == 0.0

def test_projected_gradient_norm_boundary():
    pgn = projected_gradient_norm([0.0], [1.0], [0.0], [10.0])
    assert pgn == 0.0

def test_projected_gradient_norm_interior():
    pgn = projected_gradient_norm([2, 3], [0.5, -0.3], [0, 0], [10, 10])
    assert abs(pgn - 0.5) < 1e-10
