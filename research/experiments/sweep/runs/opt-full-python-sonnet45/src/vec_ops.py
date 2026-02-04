"""
Pure vector arithmetic for n-dimensional optimization.
All operations return new lists and never mutate inputs.
"""

import math
from typing import List


def dot(a: List[float], b: List[float]) -> float:
    """Dot product of two vectors."""
    return sum(ai * bi for ai, bi in zip(a, b))


def norm(v: List[float]) -> float:
    """Euclidean (L2) norm."""
    return math.sqrt(sum(vi * vi for vi in v))


def norm_inf(v: List[float]) -> float:
    """Infinity norm (max absolute value)."""
    if not v:
        return 0.0
    return max(abs(vi) for vi in v)


def scale(v: List[float], s: float) -> List[float]:
    """Scalar multiplication."""
    return [vi * s for vi in v]


def add(a: List[float], b: List[float]) -> List[float]:
    """Element-wise addition."""
    return [ai + bi for ai, bi in zip(a, b)]


def sub(a: List[float], b: List[float]) -> List[float]:
    """Element-wise subtraction."""
    return [ai - bi for ai, bi in zip(a, b)]


def negate(v: List[float]) -> List[float]:
    """Element-wise negation."""
    return [-vi for vi in v]


def clone(v: List[float]) -> List[float]:
    """Deep copy."""
    return v[:]


def zeros(n: int) -> List[float]:
    """Vector of n zeros."""
    return [0.0] * n


def add_scaled(a: List[float], b: List[float], s: float) -> List[float]:
    """a + s*b (fused, avoids intermediate allocation)."""
    return [ai + s * bi for ai, bi in zip(a, b)]
