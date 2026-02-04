"""Tests for vec_ops module."""

import pytest
from vec_ops import dot, norm, norm_inf, scale, add, sub, negate, clone, zeros, add_scaled


class TestDot:
    def test_basic(self):
        assert dot([1, 2, 3], [4, 5, 6]) == 32

    def test_zero_vector(self):
        assert dot([0, 0], [1, 1]) == 0


class TestNorm:
    def test_3_4_triangle(self):
        assert norm([3, 4]) == 5.0

    def test_zero_vector(self):
        assert norm([0, 0, 0]) == 0.0


class TestNormInf:
    def test_basic(self):
        assert norm_inf([1, -3, 2]) == 3.0

    def test_zero_vector(self):
        assert norm_inf([0, 0]) == 0.0


class TestScale:
    def test_basic(self):
        assert scale([1, 2], 3) == [3, 6]

    def test_zero_scalar(self):
        assert scale([1, 2], 0) == [0, 0]


class TestAdd:
    def test_basic(self):
        assert add([1, 2], [3, 4]) == [4, 6]


class TestSub:
    def test_basic(self):
        assert sub([3, 4], [1, 2]) == [2, 2]


class TestNegate:
    def test_basic(self):
        assert negate([1, -2]) == [-1, 2]


class TestClone:
    def test_basic(self):
        v = [1, 2]
        c = clone(v)
        assert c == [1, 2]
        c[0] = 99
        assert v[0] == 1  # original unmodified


class TestZeros:
    def test_basic(self):
        assert zeros(3) == [0, 0, 0]


class TestAddScaled:
    def test_basic(self):
        assert add_scaled([1, 2], [3, 4], 2) == [7, 10]


class TestPurity:
    def test_add_does_not_mutate(self):
        a = [1, 2]
        b = [3, 4]
        add(a, b)
        assert a == [1, 2]
        assert b == [3, 4]

    def test_scale_does_not_mutate(self):
        v = [1, 2]
        scale(v, 3)
        assert v == [1, 2]

    def test_clone_is_distinct(self):
        v = [1, 2]
        c = clone(v)
        c[0] = 99
        assert v == [1, 2]
