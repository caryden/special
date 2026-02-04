"""Tests for vec_ops module."""

import pytest
from vec_ops import dot, norm, norm_inf, scale, add, sub, negate, clone, zeros, add_scaled


def test_dot():
    assert dot([1, 2, 3], [4, 5, 6]) == 32
    assert dot([0, 0], [1, 1]) == 0


def test_norm():
    assert norm([3, 4]) == 5
    assert norm([0, 0, 0]) == 0


def test_norm_inf():
    assert norm_inf([1, -3, 2]) == 3
    assert norm_inf([0, 0]) == 0


def test_scale():
    assert scale([1, 2], 3) == [3, 6]
    assert scale([1, 2], 0) == [0, 0]


def test_add():
    assert add([1, 2], [3, 4]) == [4, 6]


def test_sub():
    assert sub([3, 4], [1, 2]) == [2, 2]


def test_negate():
    assert negate([1, -2]) == [-1, 2]


def test_clone():
    v = [1, 2]
    v_cloned = clone(v)
    assert v_cloned == [1, 2]
    v_cloned[0] = 99
    assert v[0] == 1  # Original unchanged


def test_zeros():
    assert zeros(3) == [0, 0, 0]


def test_add_scaled():
    assert add_scaled([1, 2], [3, 4], 2) == [7, 10]


def test_purity():
    """Verify operations don't mutate inputs."""
    a = [1.0, 2.0]
    b = [3.0, 4.0]

    _ = add(a, b)
    assert a == [1.0, 2.0]
    assert b == [3.0, 4.0]

    _ = scale(a, 5)
    assert a == [1.0, 2.0]

    _ = add_scaled(a, b, 2)
    assert a == [1.0, 2.0]
    assert b == [3.0, 4.0]
