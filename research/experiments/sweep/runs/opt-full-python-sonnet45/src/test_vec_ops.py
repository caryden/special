"""Tests for vec_ops."""

from .vec_ops import dot, norm, norm_inf, scale, add, sub, negate, clone, zeros, add_scaled


def test_dot_basic():
    assert dot([1, 2, 3], [4, 5, 6]) == 32

def test_dot_zero():
    assert dot([0, 0], [1, 1]) == 0

def test_norm_basic():
    assert norm([3, 4]) == 5.0

def test_norm_zero():
    assert norm([0, 0, 0]) == 0.0

def test_norm_inf_basic():
    assert norm_inf([1, -3, 2]) == 3

def test_norm_inf_zero():
    assert norm_inf([0, 0]) == 0

def test_scale_basic():
    assert scale([1, 2], 3) == [3, 6]

def test_scale_zero():
    assert scale([1, 2], 0) == [0, 0]

def test_add():
    assert add([1, 2], [3, 4]) == [4, 6]

def test_sub():
    assert sub([3, 4], [1, 2]) == [2, 2]

def test_negate():
    assert negate([1, -2]) == [-1, 2]

def test_clone():
    v = [1, 2]
    c = clone(v)
    assert c == [1, 2]
    c[0] = 99
    assert v[0] == 1

def test_zeros():
    assert zeros(3) == [0, 0, 0]

def test_add_scaled():
    assert add_scaled([1, 2], [3, 4], 2) == [7, 10]

def test_add_purity():
    a = [1, 2]
    b = [3, 4]
    add(a, b)
    assert a == [1, 2]
    assert b == [3, 4]

def test_scale_purity():
    v = [1, 2]
    scale(v, 3)
    assert v == [1, 2]
