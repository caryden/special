"""Tests for simulated_annealing."""

import math
from .simulated_annealing import simulated_annealing


def test_sphere():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    r = simulated_annealing(f, [5, 5], seed=42, max_iterations=10000)
    assert r.converged
    assert r.fun < 1.0
    assert r.function_calls == 10001

def test_rastrigin():
    def rastrigin(x):
        n = len(x)
        return 10 * n + sum(xi ** 2 - 10 * math.cos(2 * math.pi * xi) for xi in x)
    r = simulated_annealing(rastrigin, [3, 3], seed=42, max_iterations=50000)
    assert r.fun < 5

def test_deterministic():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    r1 = simulated_annealing(f, [5, 5], seed=99, max_iterations=100)
    r2 = simulated_annealing(f, [5, 5], seed=99, max_iterations=100)
    assert r1.x == r2.x
    assert r1.fun == r2.fun

def test_keep_best():
    f = lambda x: x[0] ** 2 + x[1] ** 2
    r = simulated_annealing(
        f, [0, 0], seed=42, max_iterations=100,
        temperature=lambda k: 1000.0,
    )
    assert r.fun < 0.01  # best stays near origin

def test_gradient_calls_zero():
    f = lambda x: x[0] ** 2
    r = simulated_annealing(f, [5.0], seed=1, max_iterations=100)
    assert r.gradient_calls == 0
    assert r.gradient == []
