"""
Numerical gradient via forward/central differences.
"""

import sys
import math
from typing import Callable, List

EPS = sys.float_info.epsilon


def forward_diff_gradient(f: Callable[[List[float]], float], x: List[float]) -> List[float]:
    """Forward difference gradient: (f(x+h*ei) - f(x)) / h."""
    n = len(x)
    fx = f(x)
    grad = [0.0] * n
    for i in range(n):
        h = math.sqrt(EPS) * max(abs(x[i]), 1.0)
        xp = x[:]
        xp[i] += h
        grad[i] = (f(xp) - fx) / h
    return grad


def central_diff_gradient(f: Callable[[List[float]], float], x: List[float]) -> List[float]:
    """Central difference gradient: (f(x+h*ei) - f(x-h*ei)) / (2h)."""
    n = len(x)
    grad = [0.0] * n
    for i in range(n):
        h = EPS ** (1.0 / 3.0) * max(abs(x[i]), 1.0)
        xp = x[:]
        xm = x[:]
        xp[i] += h
        xm[i] -= h
        grad[i] = (f(xp) - f(xm)) / (2.0 * h)
    return grad


def make_gradient(
    f: Callable[[List[float]], float], method: str = "forward"
) -> Callable[[List[float]], List[float]]:
    """Factory: returns a gradient function using the specified method."""
    if method == "central":
        return lambda x: central_diff_gradient(f, x)
    return lambda x: forward_diff_gradient(f, x)
