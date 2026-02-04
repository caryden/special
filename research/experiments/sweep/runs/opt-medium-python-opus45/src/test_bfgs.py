"""Tests for bfgs module."""

import math
import pytest
from bfgs import bfgs, identity_matrix, mat_vec_mul, bfgs_update


# --- Test functions ---

def sphere_f(x: list[float]) -> float:
    return sum(xi * xi for xi in x)

def sphere_grad(x: list[float]) -> list[float]:
    return [2 * xi for xi in x]

def booth_f(x: list[float]) -> float:
    return (x[0] + 2 * x[1] - 7) ** 2 + (2 * x[0] + x[1] - 5) ** 2

def booth_grad(x: list[float]) -> list[float]:
    dx = 2 * (x[0] + 2 * x[1] - 7) + 2 * (2 * x[0] + x[1] - 5) * 2
    dy = 2 * (x[0] + 2 * x[1] - 7) * 2 + 2 * (2 * x[0] + x[1] - 5)
    return [dx, dy]

def rosenbrock_f(x: list[float]) -> float:
    return (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2

def rosenbrock_grad(x: list[float]) -> list[float]:
    dx = -2 * (1 - x[0]) + 100 * 2 * (x[1] - x[0] ** 2) * (-2 * x[0])
    dy = 100 * 2 * (x[1] - x[0] ** 2)
    return [dx, dy]

def beale_f(x: list[float]) -> float:
    return (
        (1.5 - x[0] + x[0] * x[1]) ** 2
        + (2.25 - x[0] + x[0] * x[1] ** 2) ** 2
        + (2.625 - x[0] + x[0] * x[1] ** 3) ** 2
    )

def beale_grad(x: list[float]) -> list[float]:
    a, b = x[0], x[1]
    t1 = 1.5 - a + a * b
    t2 = 2.25 - a + a * b ** 2
    t3 = 2.625 - a + a * b ** 3
    da = 2 * t1 * (-1 + b) + 2 * t2 * (-1 + b ** 2) + 2 * t3 * (-1 + b ** 3)
    db = 2 * t1 * a + 2 * t2 * (2 * a * b) + 2 * t3 * (3 * a * b ** 2)
    return [da, db]

def himmelblau_f(x: list[float]) -> float:
    return (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2

def himmelblau_grad(x: list[float]) -> list[float]:
    dx = 4 * x[0] * (x[0] ** 2 + x[1] - 11) + 2 * (x[0] + x[1] ** 2 - 7)
    dy = 2 * (x[0] ** 2 + x[1] - 11) + 4 * x[1] * (x[0] + x[1] ** 2 - 7)
    return [dx, dy]

def goldstein_price_f(x: list[float]) -> float:
    a = x[0]
    b = x[1]
    part1 = 1 + (a + b + 1) ** 2 * (19 - 14 * a + 3 * a ** 2 - 14 * b + 6 * a * b + 3 * b ** 2)
    part2 = 30 + (2 * a - 3 * b) ** 2 * (18 - 32 * a + 12 * a ** 2 + 48 * b - 36 * a * b + 27 * b ** 2)
    return part1 * part2

def goldstein_price_grad(x: list[float]) -> list[float]:
    """Numerical gradient for GP (analytic is messy)."""
    from finite_diff import central_diff_gradient
    return central_diff_gradient(goldstein_price_f, x)


# --- Helper tests ---

class TestIdentityMatrix:
    def test_2x2(self):
        m = identity_matrix(2)
        assert m == [[1, 0], [0, 1]]

    def test_3x3(self):
        m = identity_matrix(3)
        assert m == [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


class TestMatVecMul:
    def test_identity(self):
        m = identity_matrix(2)
        v = [3.0, 4.0]
        assert mat_vec_mul(m, v) == [3.0, 4.0]

    def test_basic(self):
        m = [[1, 2], [3, 4]]
        v = [5.0, 6.0]
        result = mat_vec_mul(m, v)
        assert result[0] == pytest.approx(17.0)
        assert result[1] == pytest.approx(39.0)


# --- BFGS optimization tests ---

class TestBFGSSphere:
    def test_analytic_grad(self):
        result = bfgs(sphere_f, [5.0, 5.0], sphere_grad)
        assert result.converged is True
        assert result.fun == pytest.approx(0.0, abs=1e-8)
        assert result.x[0] == pytest.approx(0.0, abs=1e-4)
        assert result.x[1] == pytest.approx(0.0, abs=1e-4)
        assert result.iterations < 20

    def test_finite_diff(self):
        result = bfgs(sphere_f, [5.0, 5.0])
        assert result.converged is True
        assert result.fun == pytest.approx(0.0, abs=1e-6)


class TestBFGSBooth:
    def test_analytic_grad(self):
        result = bfgs(booth_f, [0.0, 0.0], booth_grad)
        assert result.converged is True
        assert result.fun == pytest.approx(0.0, abs=1e-8)
        assert result.x[0] == pytest.approx(1.0, abs=1e-4)
        assert result.x[1] == pytest.approx(3.0, abs=1e-4)


class TestBFGSRosenbrock:
    def test_analytic_grad(self):
        result = bfgs(rosenbrock_f, [-1.2, 1.0], rosenbrock_grad)
        assert result.converged is True
        assert result.fun < 1e-10
        assert result.x[0] == pytest.approx(1.0, abs=1e-4)
        assert result.x[1] == pytest.approx(1.0, abs=1e-4)

    def test_finite_diff(self):
        result = bfgs(rosenbrock_f, [-1.2, 1.0])
        assert result.fun < 1e-6
        assert result.x[0] == pytest.approx(1.0, abs=1e-3)
        assert result.x[1] == pytest.approx(1.0, abs=1e-3)


class TestBFGSBeale:
    def test_analytic_grad(self):
        result = bfgs(beale_f, [0.0, 0.0], beale_grad)
        assert result.converged is True
        assert result.fun < 1e-8
        assert result.x[0] == pytest.approx(3.0, abs=1e-3)
        assert result.x[1] == pytest.approx(0.5, abs=1e-3)


class TestBFGSHimmelblau:
    def test_from_origin(self):
        result = bfgs(himmelblau_f, [0.0, 0.0], himmelblau_grad)
        assert result.converged is True
        assert result.fun < 1e-8
        # Should converge to one of the four known minima
        known_minima = [
            (3.0, 2.0),
            (-2.805118, 3.131312),
            (-3.779310, -3.283186),
            (3.584428, -1.848126),
        ]
        found = False
        for xm, ym in known_minima:
            if abs(result.x[0] - xm) < 0.01 and abs(result.x[1] - ym) < 0.01:
                found = True
                break
        assert found, f"x={result.x} is not close to any known Himmelblau minimum"


class TestBFGSGoldsteinPrice:
    def test_from_0_neg05(self):
        result = bfgs(goldstein_price_f, [0.0, -0.5], goldstein_price_grad)
        assert result.converged is True
        assert result.fun == pytest.approx(3.0, abs=1e-4)
        assert result.x[0] == pytest.approx(0.0, abs=1e-2)
        assert result.x[1] == pytest.approx(-1.0, abs=1e-2)


class TestBFGSBehavioral:
    def test_returns_gradient_at_solution(self):
        result = bfgs(sphere_f, [5.0, 5.0], sphere_grad)
        assert result.gradient is not None
        assert len(result.gradient) == 2
        for g in result.gradient:
            assert abs(g) < 1e-4

    def test_max_iterations_limited(self):
        result = bfgs(rosenbrock_f, [-1.2, 1.0], rosenbrock_grad,
                      options={"max_iterations": 3})
        assert result.iterations <= 3

    def test_already_at_minimum(self):
        result = bfgs(sphere_f, [0.0, 0.0], sphere_grad)
        assert result.converged is True
        assert result.iterations == 0

    def test_max_iterations_message(self):
        result = bfgs(rosenbrock_f, [-1.2, 1.0], rosenbrock_grad,
                      options={"max_iterations": 2})
        assert result.converged is False
        assert "maximum iterations" in result.message.lower() or "max" in result.message.lower()
