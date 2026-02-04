"""Tests for test_functions."""

import math
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price
from .vec_ops import norm


def test_sphere_minimum():
    assert sphere.f(sphere.minimum_at) == 0.0

def test_booth_minimum():
    assert booth.f(booth.minimum_at) == 0.0

def test_rosenbrock_minimum():
    assert rosenbrock.f(rosenbrock.minimum_at) == 0.0

def test_beale_minimum():
    assert abs(beale.f(beale.minimum_at)) < 1e-14

def test_himmelblau_minimum():
    assert abs(himmelblau.f(himmelblau.minimum_at)) < 1e-10

def test_goldstein_price_minimum():
    assert abs(goldstein_price.f(goldstein_price.minimum_at) - 3.0) < 1e-6

def test_sphere_gradient_at_min():
    g = sphere.gradient([0, 0])
    assert norm(g) == 0

def test_rosenbrock_gradient_at_min():
    g = rosenbrock.gradient([1, 1])
    assert norm(g) == 0

def test_booth_gradient_at_min():
    g = booth.gradient([1, 3])
    assert norm(g) < 1e-10

def test_gradient_finite_diff_match():
    """Analytic gradient matches central differences."""
    for tf in [sphere, booth, rosenbrock]:
        x = tf.starting_point
        g_analytic = tf.gradient(x)
        h = 1e-7
        for i in range(tf.dimensions):
            xp = x[:]
            xm = x[:]
            xp[i] += h
            xm[i] -= h
            g_fd = (tf.f(xp) - tf.f(xm)) / (2 * h)
            assert abs(g_analytic[i] - g_fd) < 1e-5, f"{tf.name} dim {i}"
