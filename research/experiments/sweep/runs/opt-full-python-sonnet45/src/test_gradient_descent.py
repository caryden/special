"""Tests for gradient_descent."""

from .gradient_descent import gradient_descent
from .test_functions import sphere, booth, rosenbrock


def test_sphere():
    r = gradient_descent(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-8
    assert abs(r.x[0]) < 1e-4
    assert abs(r.x[1]) < 1e-4

def test_booth():
    r = gradient_descent(booth.f, booth.starting_point, grad=booth.gradient)
    assert r.converged
    assert r.fun < 1e-6

def test_sphere_fd():
    r = gradient_descent(sphere.f, sphere.starting_point)
    assert r.converged
    assert r.fun < 1e-6

def test_at_minimum():
    r = gradient_descent(sphere.f, [0, 0], grad=sphere.gradient)
    assert r.converged
    assert r.iterations == 0

def test_max_iterations():
    r = gradient_descent(rosenbrock.f, rosenbrock.starting_point, grad=rosenbrock.gradient, max_iterations=2)
    assert not r.converged
    assert "maximum iterations" in r.message

def test_wrong_gradient():
    def wrong_grad(x):
        return [2 * x[0], 2 * x[1]]  # uphill for rosenbrock
    r = gradient_descent(rosenbrock.f, rosenbrock.starting_point, grad=wrong_grad, max_iterations=100)
    # Should eventually fail or converge strangely
