"""Tests for finite_diff module."""

import pytest
from finite_diff import forward_diff_gradient, central_diff_gradient, make_gradient


# Test functions with analytic gradients
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


def beale_f(x: list[float]) -> float:
    return (
        (1.5 - x[0] + x[0] * x[1]) ** 2
        + (2.25 - x[0] + x[0] * x[1] ** 2) ** 2
        + (2.625 - x[0] + x[0] * x[1] ** 3) ** 2
    )


def beale_grad(x: list[float]) -> list[float]:
    a = x[0]
    b = x[1]
    t1 = 1.5 - a + a * b
    t2 = 2.25 - a + a * b ** 2
    t3 = 2.625 - a + a * b ** 3
    da = 2 * t1 * (-1 + b) + 2 * t2 * (-1 + b ** 2) + 2 * t3 * (-1 + b ** 3)
    db = 2 * t1 * a + 2 * t2 * (2 * a * b) + 2 * t3 * (3 * a * b ** 2)
    return [da, db]


class TestForwardDiff:
    def test_sphere_at_3_4(self):
        g = forward_diff_gradient(sphere_f, [3.0, 4.0])
        assert g[0] == pytest.approx(6.0, abs=1e-7)
        assert g[1] == pytest.approx(8.0, abs=1e-7)

    def test_sphere_at_origin(self):
        g = forward_diff_gradient(sphere_f, [0.0, 0.0])
        assert g[0] == pytest.approx(0.0, abs=1e-7)
        assert g[1] == pytest.approx(0.0, abs=1e-7)

    def test_rosenbrock(self):
        g = forward_diff_gradient(rosenbrock_f, [-1.2, 1.0])
        analytic = rosenbrock_grad([-1.2, 1.0])
        assert g[0] == pytest.approx(analytic[0], abs=1e-4)
        assert g[1] == pytest.approx(analytic[1], abs=1e-4)

    def test_beale(self):
        g = forward_diff_gradient(beale_f, [1.0, 1.0])
        analytic = beale_grad([1.0, 1.0])
        assert g[0] == pytest.approx(analytic[0], abs=1e-5)
        assert g[1] == pytest.approx(analytic[1], abs=1e-5)


class TestCentralDiff:
    def test_sphere_at_3_4(self):
        g = central_diff_gradient(sphere_f, [3.0, 4.0])
        assert g[0] == pytest.approx(6.0, abs=1e-9)
        assert g[1] == pytest.approx(8.0, abs=1e-9)

    def test_sphere_at_origin(self):
        g = central_diff_gradient(sphere_f, [0.0, 0.0])
        assert g[0] == pytest.approx(0.0, abs=1e-9)
        assert g[1] == pytest.approx(0.0, abs=1e-9)

    def test_rosenbrock(self):
        g = central_diff_gradient(rosenbrock_f, [-1.2, 1.0])
        analytic = rosenbrock_grad([-1.2, 1.0])
        assert g[0] == pytest.approx(analytic[0], abs=1e-7)
        assert g[1] == pytest.approx(analytic[1], abs=1e-7)

    def test_beale(self):
        g = central_diff_gradient(beale_f, [1.0, 1.0])
        analytic = beale_grad([1.0, 1.0])
        assert g[0] == pytest.approx(analytic[0], abs=1e-8)
        assert g[1] == pytest.approx(analytic[1], abs=1e-8)


class TestMakeGradient:
    def test_forward_default(self):
        grad_fn = make_gradient(sphere_f)
        g = grad_fn([3.0, 4.0])
        assert g[0] == pytest.approx(6.0, abs=1e-7)
        assert g[1] == pytest.approx(8.0, abs=1e-7)

    def test_central(self):
        grad_fn = make_gradient(sphere_f, "central")
        g = grad_fn([3.0, 4.0])
        assert g[0] == pytest.approx(6.0, abs=1e-9)
        assert g[1] == pytest.approx(8.0, abs=1e-9)
