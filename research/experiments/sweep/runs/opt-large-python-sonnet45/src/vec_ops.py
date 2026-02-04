"""Vector operations for n-dimensional optimization."""

import math
from typing import List


def dot(a: List[float], b: List[float]) -> float:
    """Dot product of two vectors."""
    return sum(a[i] * b[i] for i in range(len(a)))


def norm(v: List[float]) -> float:
    """Euclidean (L2) norm."""
    return math.sqrt(sum(x * x for x in v))


def norm_inf(v: List[float]) -> float:
    """Infinity norm (max absolute value)."""
    return max(abs(x) for x in v) if v else 0.0


def scale(v: List[float], s: float) -> List[float]:
    """Scalar multiplication."""
    return [x * s for x in v]


def add(a: List[float], b: List[float]) -> List[float]:
    """Element-wise addition."""
    return [a[i] + b[i] for i in range(len(a))]


def sub(a: List[float], b: List[float]) -> List[float]:
    """Element-wise subtraction."""
    return [a[i] - b[i] for i in range(len(a))]


def negate(v: List[float]) -> List[float]:
    """Element-wise negation."""
    return [-x for x in v]


def clone(v: List[float]) -> List[float]:
    """Deep copy of a vector."""
    return v.copy()


def zeros(n: int) -> List[float]:
    """Create a vector of n zeros."""
    return [0.0] * n


def add_scaled(a: List[float], b: List[float], s: float) -> List[float]:
    """Fused operation: a + s*b."""
    return [a[i] + s * b[i] for i in range(len(a))]
