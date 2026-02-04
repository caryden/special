"""Numerical gradient approximation via finite differences."""

import sys
import math
from typing import Callable, List


EPS = sys.float_info.epsilon


def forward_diff_gradient(f: Callable[[List[float]], float], x: List[float]) -> List[float]:
    """Approximate gradient using forward differences."""
    n = len(x)
    grad = [0.0] * n
    fx = f(x)

    for i in range(n):
        h = math.sqrt(EPS) * max(abs(x[i]), 1.0)
        x_perturbed = x[:]
        x_perturbed[i] += h
        grad[i] = (f(x_perturbed) - fx) / h

    return grad


def central_diff_gradient(f: Callable[[List[float]], float], x: List[float]) -> List[float]:
    """Approximate gradient using central differences."""
    n = len(x)
    grad = [0.0] * n

    for i in range(n):
        h = EPS ** (1.0 / 3.0) * max(abs(x[i]), 1.0)
        x_plus = x[:]
        x_plus[i] += h
        x_minus = x[:]
        x_minus[i] -= h
        grad[i] = (f(x_plus) - f(x_minus)) / (2.0 * h)

    return grad


def make_gradient(
    f: Callable[[List[float]], float],
    method: str = "forward"
) -> Callable[[List[float]], List[float]]:
    """Factory function that returns a gradient function."""
    if method == "forward":
        return lambda x: forward_diff_gradient(f, x)
    elif method == "central":
        return lambda x: central_diff_gradient(f, x)
    else:
        raise ValueError(f"Unknown method: {method}")
