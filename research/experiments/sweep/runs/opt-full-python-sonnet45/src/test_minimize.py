"""Tests for minimize."""

from .minimize import minimize
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price
import pytest


def test_default_no_grad():
    r = minimize(sphere.f, sphere.starting_point)
    assert r.converged
    assert r.gradient_calls == 0  # nelder-mead

def test_default_with_grad():
    r = minimize(sphere.f, sphere.starting_point, grad=sphere.gradient)
    assert r.converged
    assert r.gradient_calls > 0  # bfgs

def test_nelder_mead():
    r = minimize(sphere.f, sphere.starting_point, method="nelder-mead")
    assert r.converged
    assert r.fun < 1e-6

def test_gradient_descent():
    r = minimize(sphere.f, sphere.starting_point, method="gradient-descent", grad=sphere.gradient)
    assert r.converged
    assert r.fun < 1e-6

def test_bfgs_rosenbrock():
    r = minimize(rosenbrock.f, rosenbrock.starting_point, method="bfgs", grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-10

def test_lbfgs_rosenbrock():
    r = minimize(rosenbrock.f, rosenbrock.starting_point, method="l-bfgs", grad=rosenbrock.gradient)
    assert r.converged
    assert r.fun < 1e-10

def test_bfgs_fd():
    r = minimize(sphere.f, sphere.starting_point, method="bfgs")
    assert r.converged

def test_all_functions_bfgs():
    for tf in [sphere, booth, rosenbrock, beale, himmelblau, goldstein_price]:
        r = minimize(tf.f, tf.starting_point, method="bfgs", grad=tf.gradient)
        assert r.converged, f"BFGS failed on {tf.name}"
        if tf.name == "Goldstein-Price":
            assert abs(r.fun - 3) < 1e-4
        else:
            assert r.fun < 1e-6, f"BFGS high fun on {tf.name}: {r.fun}"

def test_max_iterations():
    r = minimize(rosenbrock.f, rosenbrock.starting_point, method="bfgs",
                 grad=rosenbrock.gradient, max_iterations=3)
    assert r.iterations <= 3

def test_unknown_method():
    with pytest.raises(ValueError):
        minimize(sphere.f, [1, 1], method="unknown")

def test_custom_grad_tol():
    r = minimize(sphere.f, sphere.starting_point, method="bfgs",
                 grad=sphere.gradient, grad_tol=1e-4)
    assert r.converged
