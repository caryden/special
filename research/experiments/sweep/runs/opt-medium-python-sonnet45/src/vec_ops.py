"""
vec-ops — Pure vector arithmetic for n-dimensional optimization.

All operations return new lists and never mutate inputs.
"""

import math
from typing import List

Vector = List[float]


def dot(a: Vector, b: Vector) -> float:
    """Dot product of two vectors."""
    return sum(ai * bi for ai, bi in zip(a, b))


def norm(v: Vector) -> float:
    """Euclidean (L2) norm."""
    return math.sqrt(sum(x * x for x in v))


def norm_inf(v: Vector) -> float:
    """Infinity norm (max absolute value)."""
    if not v:
        return 0.0
    return max(abs(x) for x in v)


def scale(v: Vector, s: float) -> Vector:
    """Scalar multiplication."""
    return [x * s for x in v]


def add(a: Vector, b: Vector) -> Vector:
    """Element-wise addition."""
    return [ai + bi for ai, bi in zip(a, b)]


def sub(a: Vector, b: Vector) -> Vector:
    """Element-wise subtraction."""
    return [ai - bi for ai, bi in zip(a, b)]


def negate(v: Vector) -> Vector:
    """Element-wise negation."""
    return scale(v, -1.0)


def clone(v: Vector) -> Vector:
    """Deep copy."""
    return list(v)


def zeros(n: int) -> Vector:
    """Vector of n zeros."""
    return [0.0] * n


def add_scaled(a: Vector, b: Vector, s: float) -> Vector:
    """Compute a + s*b (fused operation)."""
    return [ai + s * bi for ai, bi in zip(a, b)]
