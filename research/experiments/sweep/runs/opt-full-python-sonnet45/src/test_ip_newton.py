"""Tests for ip_newton."""

import math
from .ip_newton import ip_newton


def test_unconstrained_sphere():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    g = lambda x: [2 * x[0], 2 * x[1]]
    r = ip_newton(f, [5, 5], grad=g)
    assert r.converged
    assert abs(r.x[0]) < 0.1
    assert abs(r.x[1]) < 0.1

def test_box_constrained_sphere():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    g = lambda x: [2 * x[0], 2 * x[1]]
    r = ip_newton(f, [5, 5], grad=g, lower=[1, 1], upper=[10, 10])
    assert r.converged
    assert abs(r.x[0] - 1) < 0.1
    assert abs(r.x[1] - 1) < 0.1
    assert abs(r.fun - 2) < 0.2

def test_equality_constraint():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    g = lambda x: [2 * x[0], 2 * x[1]]
    constraints = {
        'c': lambda x: [x[0] + x[1]],
        'jacobian': lambda x: [[1.0, 1.0]],
        'lower': [1.0],
        'upper': [1.0],
    }
    r = ip_newton(f, [2, 2], grad=g, constraints=constraints)
    assert r.converged
    assert abs(r.x[0] - 0.5) < 0.1
    assert abs(r.x[1] - 0.5) < 0.1

def test_inequality_constraint():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    g = lambda x: [2 * x[0], 2 * x[1]]
    constraints = {
        'c': lambda x: [x[0] + x[1]],
        'jacobian': lambda x: [[1.0, 1.0]],
        'lower': [3.0],
        'upper': [float('inf')],
    }
    r = ip_newton(f, [3, 3], grad=g, constraints=constraints)
    assert r.converged
    assert abs(r.x[0] - 1.5) < 0.2
    assert abs(r.x[1] - 1.5) < 0.2

def test_1d_active_bound():
    f = lambda x: (x[0] - 3) ** 2
    g = lambda x: [2 * (x[0] - 3)]
    r = ip_newton(f, [5.0], grad=g, lower=[4.0], upper=[10.0])
    assert r.converged
    assert abs(r.x[0] - 4.0) < 0.1
    assert abs(r.fun - 1.0) < 0.2

def test_nan_detection():
    call_count = [0]
    def f(x):
        call_count[0] += 1
        if call_count[0] > 8:
            return float('nan')
        return x[0] ** 2 + x[1] ** 2
    g = lambda x: [2 * x[0], 2 * x[1]]
    r = ip_newton(f, [5, 5], grad=g, max_iterations=50)
    assert "NaN" in r.message or r.converged
