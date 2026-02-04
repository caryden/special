"""Tests for finite_hessian module."""

import pytest
from finite_hessian import finite_diff_hessian, hessian_vector_product
from test_functions import sphere_f, sphere_grad, booth_f, booth_grad, rosenbrock_f, rosenbrock_grad


def test_hessian_sphere_origin():
    """Test Hessian of sphere at origin: H = 2*I."""
    x = [0.0, 0.0]
    H = finite_diff_hessian(sphere_f, x)

    assert abs(H[0][0] - 2.0) < 1e-4
    assert abs(H[1][1] - 2.0) < 1e-4
    assert abs(H[0][1]) < 1e-4
    assert abs(H[1][0]) < 1e-4


def test_hessian_sphere():
    """Test Hessian of sphere at [5, 3]: H = 2*I."""
    x = [5.0, 3.0]
    H = finite_diff_hessian(sphere_f, x)

    assert abs(H[0][0] - 2.0) < 1e-4
    assert abs(H[1][1] - 2.0) < 1e-4
    assert abs(H[0][1]) < 1e-4
    assert abs(H[1][0]) < 1e-4


def test_hessian_booth():
    """Test Hessian of Booth: H = [[10, 8], [8, 10]]."""
    x = [0.0, 0.0]
    H = finite_diff_hessian(booth_f, x)

    assert abs(H[0][0] - 10.0) < 1e-3
    assert abs(H[0][1] - 8.0) < 1e-3
    assert abs(H[1][0] - 8.0) < 1e-3
    assert abs(H[1][1] - 10.0) < 1e-3


def test_hessian_rosenbrock_minimum():
    """Test Hessian of Rosenbrock at minimum [1, 1]."""
    x = [1.0, 1.0]
    H = finite_diff_hessian(rosenbrock_f, x)

    # Expected: [[802, -400], [-400, 200]]
    assert abs(H[0][0] - 802.0) < 10
    assert abs(H[0][1] - (-400.0)) < 10
    assert abs(H[1][0] - (-400.0)) < 10
    assert abs(H[1][1] - 200.0) < 10


def test_hessian_rosenbrock():
    """Test Hessian of Rosenbrock at [-1.2, 1.0]."""
    x = [-1.2, 1.0]
    H = finite_diff_hessian(rosenbrock_f, x)

    # Expected: [[1330, 480], [480, 200]]
    assert abs(H[0][0] - 1330.0) < 20
    assert abs(H[0][1] - 480.0) < 20
    assert abs(H[1][0] - 480.0) < 20
    assert abs(H[1][1] - 200.0) < 20


def test_hessian_symmetry():
    """Verify Hessian is symmetric."""
    x = [1.0, 2.0]
    H = finite_diff_hessian(rosenbrock_f, x)

    assert abs(H[0][1] - H[1][0]) < 1e-10


def test_hessian_vector_product_sphere():
    """Test H*v for sphere: H*v = 2*v."""
    x = [3.0, 4.0]
    gx = sphere_grad(x)
    v = [1.0, 1.0]

    Hv = hessian_vector_product(sphere_grad, x, v, gx)

    expected = [2.0, 2.0]
    for i in range(len(v)):
        assert abs(Hv[i] - expected[i]) < 1e-4


def test_hessian_vector_product_booth():
    """Test H*v for Booth."""
    x = [1.0, 1.0]
    gx = booth_grad(x)
    v = [1.0, 0.0]

    Hv = hessian_vector_product(booth_grad, x, v, gx)

    # Expected: H*[1,0] = [10, 8]
    assert abs(Hv[0] - 10.0) < 1e-2
    assert abs(Hv[1] - 8.0) < 1e-2


def test_hessian_vector_product_rosenbrock():
    """Test H*v for Rosenbrock at minimum."""
    x = [1.0, 1.0]
    gx = rosenbrock_grad(x)
    v = [1.0, 1.0]

    Hv = hessian_vector_product(rosenbrock_grad, x, v, gx)

    # Expected: H*[1,1] = [802-400, -400+200] = [402, -200]
    assert abs(Hv[0] - 402.0) < 10
    assert abs(Hv[1] - (-200.0)) < 10
