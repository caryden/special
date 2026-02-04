"""Tests for line_search module."""

import pytest
from vec_ops import dot, scale, negate
from line_search import backtracking_line_search, wolfe_line_search


# Test functions
def sphere_f(x: list[float]) -> float:
    return sum(xi * xi for xi in x)


def sphere_grad(x: list[float]) -> list[float]:
    return [2 * xi for xi in x]


def rosenbrock_f(x: list[float]) -> float:
    return (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2


def rosenbrock_grad(x: list[float]) -> list[float]:
    dx = -2 * (1 - x[0]) + 100 * 2 * (x[1] - x[0] ** 2) * (-2 * x[0])
    dy = 100 * 2 * (x[1] - x[0] ** 2)
    return [dx, dy]


class TestBacktracking:
    def test_sphere_from_10_10(self):
        x = [10.0, 10.0]
        gx = sphere_grad(x)
        d = negate(gx)
        fx = sphere_f(x)
        result = backtracking_line_search(sphere_f, x, d, fx, gx)
        assert result.success is True
        assert result.alpha == pytest.approx(0.5)
        assert result.f_new == pytest.approx(0.0, abs=1e-10)

    def test_rosenbrock(self):
        x = [-1.2, 1.0]
        gx = rosenbrock_grad(x)
        d = negate(gx)
        fx = rosenbrock_f(x)
        result = backtracking_line_search(sphere_f, x, d, fx, gx)
        # Just check success
        # For Rosenbrock proper:
        result2 = backtracking_line_search(rosenbrock_f, x, d, fx, gx)
        assert result2.success is True
        assert result2.f_new < fx

    def test_ascending_direction(self):
        x = [10.0, 10.0]
        gx = sphere_grad(x)
        d = gx  # ascending direction (not negated)
        fx = sphere_f(x)
        result = backtracking_line_search(sphere_f, x, d, fx, gx)
        assert result.success is False


class TestWolfe:
    def test_sphere_from_10_10(self):
        x = [10.0, 10.0]
        gx = sphere_grad(x)
        d = negate(gx)
        fx = sphere_f(x)
        result = wolfe_line_search(sphere_f, sphere_grad, x, d, fx, gx)
        assert result.success is True

        # Verify Armijo condition
        c1 = 1e-4
        dg = dot(gx, d)
        assert result.f_new <= fx + c1 * result.alpha * dg

        # Verify curvature condition
        c2 = 0.9
        assert result.g_new is not None
        dg_new = dot(result.g_new, d)
        assert abs(dg_new) <= c2 * abs(dg)

    def test_rosenbrock(self):
        x = [-1.2, 1.0]
        gx = rosenbrock_grad(x)
        d = negate(gx)
        fx = rosenbrock_f(x)
        result = wolfe_line_search(rosenbrock_f, rosenbrock_grad, x, d, fx, gx)
        assert result.success is True
        assert result.f_new < fx

    def test_returns_gradient(self):
        x = [10.0, 10.0]
        gx = sphere_grad(x)
        d = negate(gx)
        fx = sphere_f(x)
        result = wolfe_line_search(sphere_f, sphere_grad, x, d, fx, gx)
        assert result.g_new is not None
        assert len(result.g_new) == 2

    def test_wolfe_conditions_verified(self):
        """Post-hoc verification of Wolfe conditions."""
        x = [10.0, 10.0]
        gx = sphere_grad(x)
        d = negate(gx)
        fx = sphere_f(x)
        c1, c2 = 1e-4, 0.9
        result = wolfe_line_search(sphere_f, sphere_grad, x, d, fx, gx, c1=c1, c2=c2)

        assert result.success is True
        dg = dot(gx, d)

        # Armijo
        assert result.f_new <= fx + c1 * result.alpha * dg

        # Curvature
        assert result.g_new is not None
        dg_new = dot(result.g_new, d)
        assert abs(dg_new) <= c2 * abs(dg)
