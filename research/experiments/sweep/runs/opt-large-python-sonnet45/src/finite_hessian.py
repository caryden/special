"""Numerical Hessian approximation via finite differences."""

import sys
import math
from typing import Callable, List
from vec_ops import norm, add_scaled, sub, scale


FOURTH_ROOT_EPS = sys.float_info.epsilon ** 0.25


def finite_diff_hessian(f: Callable[[List[float]], float], x: List[float]) -> List[List[float]]:
    """Approximate the full Hessian matrix using central differences."""
    n = len(x)
    H = [[0.0] * n for _ in range(n)]
    fx = f(x)

    # Compute step sizes
    h = [FOURTH_ROOT_EPS * max(abs(x[i]), 1.0) for i in range(n)]

    # Diagonal elements
    for i in range(n):
        x_plus = x[:]
        x_plus[i] += h[i]
        x_minus = x[:]
        x_minus[i] -= h[i]
        H[i][i] = (f(x_plus) - 2.0 * fx + f(x_minus)) / (h[i] ** 2)

    # Off-diagonal elements (upper triangle only)
    for i in range(n):
        for j in range(i + 1, n):
            x_pp = x[:]
            x_pp[i] += h[i]
            x_pp[j] += h[j]

            x_pm = x[:]
            x_pm[i] += h[i]
            x_pm[j] -= h[j]

            x_mp = x[:]
            x_mp[i] -= h[i]
            x_mp[j] += h[j]

            x_mm = x[:]
            x_mm[i] -= h[i]
            x_mm[j] -= h[j]

            H[i][j] = (f(x_pp) - f(x_pm) - f(x_mp) + f(x_mm)) / (4.0 * h[i] * h[j])
            H[j][i] = H[i][j]  # Symmetry

    return H


def hessian_vector_product(
    grad: Callable[[List[float]], List[float]],
    x: List[float],
    v: List[float],
    gx: List[float]
) -> List[float]:
    """Approximate Hessian-vector product using finite differences of gradient."""
    v_norm = norm(v)
    h = FOURTH_ROOT_EPS * max(v_norm, 1.0)
    x_perturbed = add_scaled(x, v, h)
    g_perturbed = grad(x_perturbed)
    return scale(sub(g_perturbed, gx), 1.0 / h)
