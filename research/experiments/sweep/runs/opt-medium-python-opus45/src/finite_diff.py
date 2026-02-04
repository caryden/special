"""
Gradient estimation via finite differences.

Forward differences (O(h) error) and central differences (O(h^2) error).

Provenance: Nocedal & Wright, Numerical Optimization, section 8.1
"""

import math
import sys
from typing import Callable

_EPS = sys.float_info.epsilon
_SQRT_EPS = math.sqrt(_EPS)   # ~1.49e-8
_CBRT_EPS = _EPS ** (1.0 / 3.0)  # ~6.06e-6


def forward_diff_gradient(
    f: Callable[[list[float]], float],
    x: list[float],
) -> list[float]:
    """
    Estimate gradient using forward finite differences.
    g_i = (f(x + h*e_i) - f(x)) / h
    """
    n = len(x)
    fx = f(x)
    grad = [0.0] * n

    for i in range(n):
        h = _SQRT_EPS * max(abs(x[i]), 1.0)
        x_perturbed = x[:]
        x_perturbed[i] += h
        grad[i] = (f(x_perturbed) - fx) / h

    return grad


def central_diff_gradient(
    f: Callable[[list[float]], float],
    x: list[float],
) -> list[float]:
    """
    Estimate gradient using central finite differences.
    g_i = (f(x + h*e_i) - f(x - h*e_i)) / (2h)
    """
    n = len(x)
    grad = [0.0] * n

    for i in range(n):
        h = _CBRT_EPS * max(abs(x[i]), 1.0)
        x_plus = x[:]
        x_minus = x[:]
        x_plus[i] += h
        x_minus[i] -= h
        grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)

    return grad


def make_gradient(
    f: Callable[[list[float]], float],
    method: str = "forward",
) -> Callable[[list[float]], list[float]]:
    """
    Factory: returns a gradient function using the specified method.
    method: "forward" or "central"
    """
    if method == "central":
        return lambda x: central_diff_gradient(f, x)
    return lambda x: forward_diff_gradient(f, x)
