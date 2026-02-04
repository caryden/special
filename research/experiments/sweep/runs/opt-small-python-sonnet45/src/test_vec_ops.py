"""Tests for vec-ops module."""

import pytest
from vec_ops import (
    dot, norm, norm_inf, scale, add, sub, negate, clone, zeros, add_scaled
)


def test_dot():
    """Test dot product."""
    assert dot([1, 2, 3], [4, 5, 6]) == 32
    assert dot([0, 0], [1, 1]) == 0


def test_norm():
    """Test Euclidean norm."""
    assert norm([3, 4]) == 5
    assert norm([0, 0, 0]) == 0


def test_norm_inf():
    """Test infinity norm."""
    assert norm_inf([1, -3, 2]) == 3
    assert norm_inf([0, 0]) == 0


def test_scale():
    """Test scalar multiplication."""
    assert scale([1, 2], 3) == [3, 6]
    assert scale([1, 2], 0) == [0, 0]


def test_add():
    """Test element-wise addition."""
    assert add([1, 2], [3, 4]) == [4, 6]


def test_sub():
    """Test element-wise subtraction."""
    assert sub([3, 4], [1, 2]) == [2, 2]


def test_negate():
    """Test element-wise negation."""
    assert negate([1, -2]) == [-1, 2]


def test_clone():
    """Test deep copy."""
    v = [1, 2]
    cloned = clone(v)
    assert cloned == [1, 2]
    assert cloned is not v  # Different array instance


def test_zeros():
    """Test zeros vector creation."""
    assert zeros(3) == [0, 0, 0]


def test_add_scaled():
    """Test fused a + s*b operation."""
    assert add_scaled([1, 2], [3, 4], 2) == [7, 10]


def test_purity_add():
    """Test that add does not mutate inputs."""
    a = [1, 2]
    b = [3, 4]
    result = add(a, b)
    assert a == [1, 2]
    assert b == [3, 4]
    assert result == [4, 6]


def test_purity_scale():
    """Test that scale does not mutate input."""
    v = [1, 2]
    result = scale(v, 3)
    assert v == [1, 2]
    assert result == [3, 6]


def test_purity_clone():
    """Test that clone creates independent copy."""
    v = [1, 2]
    cloned = clone(v)
    cloned[0] = 999
    assert v == [1, 2]  # Original unchanged
    assert cloned == [999, 2]
