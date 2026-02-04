"""Tests for hager_zhang."""

from .hager_zhang import hager_zhang_line_search
from .test_functions import sphere, booth, rosenbrock, beale, himmelblau, goldstein_price
from .vec_ops import negate


def test_sphere_exact():
    x = [0.5, 0.5]
    g = sphere.gradient(x)
    d = [-0.5, -0.5]
    fx = sphere.f(x)
    r = hager_zhang_line_search(sphere.f, sphere.gradient, x, d, fx, g)
    assert r.success
    assert abs(r.alpha - 1.0) < 0.1
    assert abs(r.f_new) < 0.01

def test_sphere_steepest():
    x = [5, 5]
    g = sphere.gradient(x)
    d = negate(g)
    fx = sphere.f(x)
    r = hager_zhang_line_search(sphere.f, sphere.gradient, x, d, fx, g)
    assert r.success
    assert r.f_new < 1.0

def test_all_functions_succeed():
    functions = [
        (sphere, [5, 5]),
        (booth, [0, 0]),
        (rosenbrock, [-1.2, 1.0]),
        (beale, [0, 0]),
        (himmelblau, [0, 0]),
        (goldstein_price, [0, -0.5]),
    ]
    for tf, x0 in functions:
        g = tf.gradient(x0)
        d = negate(g)
        fx = tf.f(x0)
        r = hager_zhang_line_search(tf.f, tf.gradient, x0, d, fx, g)
        assert r.success, f"Failed on {tf.name}"
        assert r.f_new <= fx, f"f increased on {tf.name}"

def test_bracket_expansion():
    f = lambda x: x[0] ** 2
    g = lambda x: [2 * x[0]]
    x = [100.0]
    gx = g(x)
    d = [-1.0]
    fx = f(x)
    r = hager_zhang_line_search(f, g, x, d, fx, gx)
    assert r.success
    assert r.alpha > 1.0

def test_failure_linear():
    f = lambda x: -x[0]
    g = lambda x: [-1.0]
    x = [0.0]
    gx = g(x)
    d = [1.0]
    fx = f(x)
    r = hager_zhang_line_search(f, g, x, d, fx, gx, max_bracket_iter=2)
    assert not r.success

def test_failure_strict():
    x = rosenbrock.starting_point
    g = rosenbrock.gradient(x)
    d = negate(g)
    fx = rosenbrock.f(x)
    r = hager_zhang_line_search(
        rosenbrock.f, rosenbrock.gradient, x, d, fx, g,
        delta=0.99, sigma=0.99, max_secant_iter=1,
    )
    assert not r.success
