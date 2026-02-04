"""Tests for brent_1d."""

import math
from .brent_1d import brent_1d


def test_quadratic():
    r = brent_1d(lambda x: x ** 2, -2, 2)
    assert r.converged
    assert abs(r.x) < 1e-7
    assert abs(r.fun) < 1e-14

def test_shifted_quadratic():
    r = brent_1d(lambda x: (x - 3) ** 2, 0, 10)
    assert r.converged
    assert abs(r.x - 3) < 1e-7
    assert abs(r.fun) < 1e-14

def test_sin():
    r = brent_1d(lambda x: -math.sin(x), 0, math.pi)
    assert r.converged
    assert abs(r.x - math.pi / 2) < 1e-7
    assert abs(r.fun - (-1)) < 1e-7

def test_xlogx():
    r = brent_1d(lambda x: x * math.log(x), 0.1, 3)
    assert r.converged
    assert abs(r.x - 1.0 / math.e) < 1e-5

def test_abs():
    r = brent_1d(lambda x: abs(x), -3, 2)
    assert r.converged
    assert abs(r.x) < 1e-6
    assert abs(r.fun) < 1e-6

def test_reversed_bracket():
    r = brent_1d(lambda x: x ** 2, 2, -2)
    assert r.converged
    assert abs(r.x) < 1e-7

def test_max_iter():
    r = brent_1d(lambda x: x ** 2, -100, 100, max_iter=3)
    assert not r.converged
    assert r.message == "Maximum iterations exceeded"
