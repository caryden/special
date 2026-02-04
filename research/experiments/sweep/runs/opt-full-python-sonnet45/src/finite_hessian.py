"""
Finite-difference Hessian and Hessian-vector products.
"""

import sys
import math
from typing import Callable, List

FOURTH_ROOT_EPS = sys.float_info.epsilon ** 0.25


def finite_diff_hessian(f: Callable[[List[float]], float], x: List[float]) -> List[List[float]]:
    """Full Hessian via central differences."""
    n = len(x)
    H = [[0.0] * n for _ in range(n)]
    fx = f(x)
    h = [FOURTH_ROOT_EPS * max(abs(x[i]), 1.0) for i in range(n)]

    # Diagonal
    for i in range(n):
        xp = x[:]
        xm = x[:]
        xp[i] += h[i]
        xm[i] -= h[i]
        H[i][i] = (f(xp) - 2.0 * fx + f(xm)) / (h[i] ** 2)

    # Off-diagonal (upper triangle, then mirror)
    for i in range(n):
        for j in range(i + 1, n):
            xpp = x[:]
            xpm = x[:]
            xmp = x[:]
            xmm = x[:]
            xpp[i] += h[i]; xpp[j] += h[j]
            xpm[i] += h[i]; xpm[j] -= h[j]
            xmp[i] -= h[i]; xmp[j] += h[j]
            xmm[i] -= h[i]; xmm[j] -= h[j]
            H[i][j] = (f(xpp) - f(xpm) - f(xmp) + f(xmm)) / (4.0 * h[i] * h[j])
            H[j][i] = H[i][j]

    return H


def hessian_vector_product(
    grad: Callable[[List[float]], List[float]],
    x: List[float],
    v: List[float],
    gx: List[float],
) -> List[float]:
    """Approximate H*v using finite differences of the gradient."""
    v_norm = math.sqrt(sum(vi * vi for vi in v))
    h = FOURTH_ROOT_EPS * max(v_norm, 1.0)
    n = len(x)
    x_pert = [x[i] + h * v[i] for i in range(n)]
    g_pert = grad(x_pert)
    return [(g_pert[i] - gx[i]) / h for i in range(n)]
