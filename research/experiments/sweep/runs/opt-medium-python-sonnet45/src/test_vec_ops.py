"""Tests for vec-ops."""

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
    # Verify it's a new array
    v_cloned[0] = 999
    assert v[0] == 1


def test_zeros():
    assert zeros(3) == [0, 0, 0]


def test_add_scaled():
    assert add_scaled([1, 2], [3, 4], 2) == [7, 10]


def test_purity_add():
    """add(a, b) must not modify a or b."""
    a = [1, 2]
    b = [3, 4]
    result = add(a, b)
    assert a == [1, 2]
    assert b == [3, 4]
    assert result == [4, 6]


def test_purity_scale():
    """scale(v, s) must not modify v."""
    v = [1, 2]
    result = scale(v, 3)
    assert v == [1, 2]
    assert result == [3, 6]


def test_purity_clone():
    """clone(v) result must be a distinct array."""
    v = [1, 2, 3]
    v_cloned = clone(v)
    v_cloned[1] = 999
    assert v[1] == 2
    assert v_cloned[1] == 999
