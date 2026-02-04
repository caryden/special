"""vec-ops: Pure vector arithmetic for n-dimensional optimization.

All operations return new arrays and never mutate inputs.
"""

import math
from typing import List


def dot(a: List[float], b: List[float]) -> float:
    """Dot product of vectors a and b."""
    return sum(x * y for x, y in zip(a, b))


def norm(v: List[float]) -> float:
    """Euclidean (L2) norm of vector v."""
    return math.sqrt(sum(x * x for x in v))


def norm_inf(v: List[float]) -> float:
    """Infinity norm (max absolute value) of vector v."""
    if not v:
        return 0.0
    return max(abs(x) for x in v)


def scale(v: List[float], s: float) -> List[float]:
    """Scalar multiplication: s * v."""
    return [x * s for x in v]


def add(a: List[float], b: List[float]) -> List[float]:
    """Element-wise addition: a + b."""
    return [x + y for x, y in zip(a, b)]


def sub(a: List[float], b: List[float]) -> List[float]:
    """Element-wise subtraction: a - b."""
    return [x - y for x, y in zip(a, b)]


def negate(v: List[float]) -> List[float]:
    """Element-wise negation: -v."""
    return [-x for x in v]


def clone(v: List[float]) -> List[float]:
    """Deep copy of vector v."""
    return v.copy()


def zeros(n: int) -> List[float]:
    """Create a vector of n zeros."""
    return [0.0] * n


def add_scaled(a: List[float], b: List[float], s: float) -> List[float]:
    """Fused operation: a + s*b (avoids intermediate allocation)."""
    return [x + s * y for x, y in zip(a, b)]
