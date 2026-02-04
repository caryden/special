"""Tests for bfgs."""

import pytest
from bfgs import bfgs, identity_matrix, mat_vec_mul, bfgs_update
import vec_ops


# Test functions
def sphere(x):
    """f(x) = sum(x_i^2)"""
    return sum(xi**2 for xi in x)


def sphere_grad(x):
    """Analytic gradient of sphere."""
    return [2 * xi for xi in x]


def booth(x):
    """Booth function: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2"""
    return (x[0] + 2*x[1] - 7)**2 + (2*x[0] + x[1] - 5)**2


def booth_grad(x):
    """Analytic gradient of Booth."""
    dx = 2*(x[0] + 2*x[1] - 7) + 2*2*(2*x[0] + x[1] - 5)
    dy = 2*2*(x[0] + 2*x[1] - 7) + 2*(2*x[0] + x[1] - 5)
    return [dx, dy]


def rosenbrock(x):
    """Rosenbrock function."""
    return (1 - x[0])**2 + 100 * (x[1] - x[0]**2)**2


def rosenbrock_grad(x):
    """Analytic gradient of Rosenbrock."""
    return [
        -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0]**2),
        200 * (x[1] - x[0]**2)
    ]


def beale(x):
    """Beale function."""
    return (
        (1.5 - x[0] + x[0] * x[1])**2 +
        (2.25 - x[0] + x[0] * x[1]**2)**2 +
        (2.625 - x[0] + x[0] * x[1]**3)**2
    )


def beale_grad(x):
    """Analytic gradient of Beale."""
    t1 = 1.5 - x[0] + x[0] * x[1]
    t2 = 2.25 - x[0] + x[0] * x[1]**2
    t3 = 2.625 - x[0] + x[0] * x[1]**3

    dx0 = (
        2 * t1 * (-1 + x[1]) +
        2 * t2 * (-1 + x[1]**2) +
        2 * t3 * (-1 + x[1]**3)
    )
    dx1 = (
        2 * t1 * x[0] +
        2 * t2 * x[0] * 2 * x[1] +
        2 * t3 * x[0] * 3 * x[1]**2
    )
    return [dx0, dx1]


def himmelblau(x):
    """Himmelblau function: (x^2 + y - 11)^2 + (x + y^2 - 7)^2"""
    return (x[0]**2 + x[1] - 11)**2 + (x[0] + x[1]**2 - 7)**2


def himmelblau_grad(x):
    """Analytic gradient of Himmelblau."""
    dx = 2*(x[0]**2 + x[1] - 11)*2*x[0] + 2*(x[0] + x[1]**2 - 7)
    dy = 2*(x[0]**2 + x[1] - 11) + 2*(x[0] + x[1]**2 - 7)*2*x[1]
    return [dx, dy]


def goldstein_price(x):
    """Goldstein-Price function."""
    a = 1 + (x[0] + x[1] + 1)**2 * (19 - 14*x[0] + 3*x[0]**2 - 14*x[1] + 6*x[0]*x[1] + 3*x[1]**2)
    b = 30 + (2*x[0] - 3*x[1])**2 * (18 - 32*x[0] + 12*x[0]**2 + 48*x[1] - 36*x[0]*x[1] + 27*x[1]**2)
    return a * b


def goldstein_price_grad(x):
    """Analytic gradient of Goldstein-Price."""
    # This is complex, so we'll compute it step by step
    u = x[0] + x[1] + 1
    v = 19 - 14*x[0] + 3*x[0]**2 - 14*x[1] + 6*x[0]*x[1] + 3*x[1]**2
    a = 1 + u**2 * v

    du_dx = 1
    du_dy = 1
    dv_dx = -14 + 6*x[0] + 6*x[1]
    dv_dy = -14 + 6*x[0] + 6*x[1]

    da_dx = 2*u*du_dx*v + u**2*dv_dx
    da_dy = 2*u*du_dy*v + u**2*dv_dy

    w = 2*x[0] - 3*x[1]
    z = 18 - 32*x[0] + 12*x[0]**2 + 48*x[1] - 36*x[0]*x[1] + 27*x[1]**2
    b = 30 + w**2 * z

    dw_dx = 2
    dw_dy = -3
    dz_dx = -32 + 24*x[0] - 36*x[1]
    dz_dy = 48 - 36*x[0] + 54*x[1]

    db_dx = 2*w*dw_dx*z + w**2*dz_dx
    db_dy = 2*w*dw_dy*z + w**2*dz_dy

    return [da_dx*b + a*db_dx, da_dy*b + a*db_dy]


# Helper function tests
def test_identity_matrix():
    """Test identity matrix creation."""
    I = identity_matrix(3)
    assert I == [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]


def test_mat_vec_mul():
    """Test matrix-vector multiplication."""
    M = [[1.0, 2.0], [3.0, 4.0]]
    v = [5.0, 6.0]
    result = mat_vec_mul(M, v)
    assert result == [17.0, 39.0]


# Main BFGS tests
def test_bfgs_sphere():
    """Test BFGS on sphere from [5, 5]."""
    result = bfgs(sphere, [5.0, 5.0], sphere_grad)

    assert result.converged is True
    assert result.fun == pytest.approx(0.0, abs=1e-8)
    assert result.x[0] == pytest.approx(0.0, abs=1e-4)
    assert result.x[1] == pytest.approx(0.0, abs=1e-4)
    assert result.iterations < 20


def test_bfgs_booth():
    """Test BFGS on Booth from [0, 0]."""
    result = bfgs(booth, [0.0, 0.0], booth_grad)

    assert result.converged is True
    assert result.fun == pytest.approx(0.0, abs=1e-8)
    assert result.x[0] == pytest.approx(1.0, abs=1e-4)
    assert result.x[1] == pytest.approx(3.0, abs=1e-4)


def test_bfgs_rosenbrock():
    """Test BFGS on Rosenbrock from [-1.2, 1.0]."""
    result = bfgs(rosenbrock, [-1.2, 1.0], rosenbrock_grad)

    assert result.converged is True
    assert result.fun < 1e-10
    assert result.x[0] == pytest.approx(1.0, abs=1e-3)
    assert result.x[1] == pytest.approx(1.0, abs=1e-3)


def test_bfgs_beale():
    """Test BFGS on Beale from [0, 0]."""
    result = bfgs(beale, [0.0, 0.0], beale_grad)

    assert result.converged is True
    assert result.fun < 1e-8
    assert result.x[0] == pytest.approx(3.0, abs=1e-3)
    assert result.x[1] == pytest.approx(0.5, abs=1e-3)


def test_bfgs_himmelblau():
    """Test BFGS on Himmelblau from [0, 0]."""
    result = bfgs(himmelblau, [0.0, 0.0], himmelblau_grad)

    assert result.converged is True
    assert result.fun < 1e-8
    # Himmelblau has four minima, check if we're close to one of them
    minima = [[3.0, 2.0], [-2.805118, 3.131312], [-3.779310, -3.283186], [3.584428, -1.848126]]
    distances = [vec_ops.norm(vec_ops.sub(result.x, m)) for m in minima]
    assert min(distances) < 0.1


def test_bfgs_goldstein_price():
    """Test BFGS on Goldstein-Price from [0, -0.5] (per task instructions)."""
    result = bfgs(goldstein_price, [0.0, -0.5], goldstein_price_grad)

    assert result.converged is True
    assert result.fun == pytest.approx(3.0, abs=1e-4)
    assert result.x[0] == pytest.approx(0.0, abs=1e-2)
    assert result.x[1] == pytest.approx(-1.0, abs=1e-2)


def test_bfgs_sphere_finite_diff():
    """Test BFGS on sphere with finite differences (no gradient provided)."""
    result = bfgs(sphere, [5.0, 5.0])

    assert result.converged is True
    assert result.fun == pytest.approx(0.0, abs=1e-6)


def test_bfgs_rosenbrock_finite_diff():
    """Test BFGS on Rosenbrock with finite differences."""
    result = bfgs(rosenbrock, [-1.2, 1.0])

    # May not formally converge due to FD noise, but should get close
    assert result.fun < 1e-6
    assert result.x[0] == pytest.approx(1.0, abs=1e-2)
    assert result.x[1] == pytest.approx(1.0, abs=1e-2)


def test_bfgs_returns_gradient():
    """Test that BFGS returns gradient at solution."""
    result = bfgs(sphere, [5.0, 5.0], sphere_grad)

    assert result.gradient is not None
    assert len(result.gradient) == 2
    assert abs(result.gradient[0]) < 1e-6
    assert abs(result.gradient[1]) < 1e-6


def test_bfgs_max_iterations():
    """Test BFGS respects maxIterations."""
    result = bfgs(rosenbrock, [-1.2, 1.0], rosenbrock_grad, {"max_iterations": 3})

    assert result.iterations <= 3


def test_bfgs_already_at_minimum():
    """Test BFGS when starting at minimum."""
    result = bfgs(sphere, [0.0, 0.0], sphere_grad)

    assert result.converged is True
    assert result.iterations == 0


def test_bfgs_max_iterations_impossible_tolerance():
    """Test BFGS with impossible tolerance hits max iterations."""
    result = bfgs(
        rosenbrock,
        [-1.2, 1.0],
        rosenbrock_grad,
        {
            "max_iterations": 2,
            "grad_tol": 1e-30,
            "step_tol": 1e-30,
            "func_tol": 1e-30
        }
    )

    assert result.converged is False
    assert result.iterations == 2
    assert "maximum iterations" in result.message.lower()
