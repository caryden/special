"""Tests for finite_diff."""

from .finite_diff import forward_diff_gradient, central_diff_gradient, make_gradient
from .test_functions import sphere, rosenbrock, beale


def test_forward_sphere_origin():
    g = forward_diff_gradient(sphere.f, [0, 0])
    assert abs(g[0]) < 1e-7
    assert abs(g[1]) < 1e-7

def test_forward_sphere():
    g = forward_diff_gradient(sphere.f, [3, 4])
    assert abs(g[0] - 6) < 1e-7
    assert abs(g[1] - 8) < 1e-7

def test_central_sphere():
    g = central_diff_gradient(sphere.f, [3, 4])
    assert abs(g[0] - 6) < 2e-10
    assert abs(g[1] - 8) < 2e-10

def test_forward_rosenbrock():
    g = forward_diff_gradient(rosenbrock.f, [-1.2, 1.0])
    g_exact = rosenbrock.gradient([-1.2, 1.0])
    assert abs(g[0] - g_exact[0]) < 1e-4
    assert abs(g[1] - g_exact[1]) < 1e-4

def test_central_rosenbrock():
    g = central_diff_gradient(rosenbrock.f, [-1.2, 1.0])
    g_exact = rosenbrock.gradient([-1.2, 1.0])
    assert abs(g[0] - g_exact[0]) < 1e-7
    assert abs(g[1] - g_exact[1]) < 1e-7

def test_forward_beale():
    g = forward_diff_gradient(beale.f, [1, 1])
    g_exact = beale.gradient([1, 1])
    assert abs(g[0] - g_exact[0]) < 1e-5
    assert abs(g[1] - g_exact[1]) < 1e-5

def test_central_beale():
    g = central_diff_gradient(beale.f, [1, 1])
    g_exact = beale.gradient([1, 1])
    assert abs(g[0] - g_exact[0]) < 1e-8
    assert abs(g[1] - g_exact[1]) < 1e-8

def test_make_gradient_forward():
    gf = make_gradient(sphere.f)
    g = gf([3, 4])
    assert abs(g[0] - 6) < 1e-7

def test_make_gradient_central():
    gf = make_gradient(sphere.f, "central")
    g = gf([3, 4])
    assert abs(g[0] - 6) < 1e-10
