"""
Pure vector arithmetic for n-dimensional optimization.
All operations return new arrays and never mutate inputs.
"""

import math


def dot(a: list[float], b: list[float]) -> float:
    """Dot product of two vectors."""
    return sum(ai * bi for ai, bi in zip(a, b))


def norm(v: list[float]) -> float:
    """Euclidean (L2) norm."""
    return math.sqrt(sum(vi * vi for vi in v))


def norm_inf(v: list[float]) -> float:
    """Infinity norm (max absolute value)."""
    if not v:
        return 0.0
    return max(abs(vi) for vi in v)


def scale(v: list[float], s: float) -> list[float]:
    """Scalar multiplication."""
    return [vi * s for vi in v]


def add(a: list[float], b: list[float]) -> list[float]:
    """Element-wise addition."""
    return [ai + bi for ai, bi in zip(a, b)]


def sub(a: list[float], b: list[float]) -> list[float]:
    """Element-wise subtraction."""
    return [ai - bi for ai, bi in zip(a, b)]


def negate(v: list[float]) -> list[float]:
    """Element-wise negation."""
    return [-vi for vi in v]


def clone(v: list[float]) -> list[float]:
    """Deep copy of a vector."""
    return v[:]


def zeros(n: int) -> list[float]:
    """Vector of n zeros."""
    return [0.0] * n


def add_scaled(a: list[float], b: list[float], s: float) -> list[float]:
    """Compute a + s*b (fused, avoids intermediate allocation)."""
    return [ai + s * bi for ai, bi in zip(a, b)]
