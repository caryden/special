"""Tests for finite_hessian."""

from .finite_hessian import finite_diff_hessian, hessian_vector_product
from .test_functions import sphere, booth, rosenbrock


def test_sphere_hessian_origin():
    H = finite_diff_hessian(sphere.f, [0, 0])
    assert abs(H[0][0] - 2) < 0.01
    assert abs(H[1][1] - 2) < 0.01
    assert abs(H[0][1]) < 0.01

def test_sphere_hessian_53():
    H = finite_diff_hessian(sphere.f, [5, 3])
    assert abs(H[0][0] - 2) < 0.01
    assert abs(H[1][1] - 2) < 0.01
    assert abs(H[0][1]) < 0.01

def test_booth_hessian():
    H = finite_diff_hessian(booth.f, [0, 0])
    assert abs(H[0][0] - 10) < 0.1
    assert abs(H[0][1] - 8) < 0.1
    assert abs(H[1][1] - 10) < 0.1

def test_rosenbrock_hessian_min():
    H = finite_diff_hessian(rosenbrock.f, [1, 1])
    assert abs(H[0][0] - 802) < 1
    assert abs(H[0][1] - (-400)) < 1
    assert abs(H[1][1] - 200) < 1

def test_hvp_sphere():
    v = [1, 0]
    gx = sphere.gradient([0, 0])
    Hv = hessian_vector_product(sphere.gradient, [0, 0], v, gx)
    assert abs(Hv[0] - 2) < 0.1
    assert abs(Hv[1]) < 0.1

def test_hvp_booth():
    gx = booth.gradient([0, 0])
    Hv = hessian_vector_product(booth.gradient, [0, 0], [1, 0], gx)
    assert abs(Hv[0] - 10) < 0.5
    assert abs(Hv[1] - 8) < 0.5

    Hv2 = hessian_vector_product(booth.gradient, [0, 0], [1, 1], gx)
    assert abs(Hv2[0] - 18) < 1
    assert abs(Hv2[1] - 18) < 1

def test_hvp_rosenbrock_min():
    gx = rosenbrock.gradient([1, 1])
    Hv = hessian_vector_product(rosenbrock.gradient, [1, 1], [1, 1], gx)
    assert abs(Hv[0] - 402) < 5
    assert abs(Hv[1] - (-200)) < 5
