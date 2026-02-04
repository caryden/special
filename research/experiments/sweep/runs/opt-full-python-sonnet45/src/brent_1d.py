"""
Brent's method for 1D minimization on a bounded interval.
"""

import math
import sys
from dataclasses import dataclass
from typing import Callable, Optional

GOLDEN = (3.0 - math.sqrt(5.0)) / 2.0


@dataclass
class Brent1dResult:
    x: float
    fun: float
    iterations: int
    function_calls: int
    converged: bool
    message: str


def brent_1d(
    f: Callable[[float], float],
    a: float,
    b: float,
    tol: Optional[float] = None,
    max_iter: int = 500,
) -> Brent1dResult:
    """Minimize a univariate function on [a, b] using Brent's method."""
    if tol is None:
        tol = math.sqrt(sys.float_info.epsilon)

    if a > b:
        a, b = b, a

    # Initialize
    x = w = v = a + GOLDEN * (b - a)
    fx = fw = fv = f(x)
    function_calls = 1

    d = 0.0
    e = 0.0

    for iteration in range(1, max_iter + 1):
        midpoint = 0.5 * (a + b)
        tol1 = tol * abs(x) + 1e-10
        tol2 = 2.0 * tol1

        # Convergence check
        if abs(x - midpoint) <= tol2 - 0.5 * (b - a):
            return Brent1dResult(
                x=x, fun=fx, iterations=iteration,
                function_calls=function_calls, converged=True,
                message="Converged",
            )

        # Try parabolic interpolation
        use_golden = True
        if abs(e) > tol1:
            # Parabolic fit through (v, fv), (w, fw), (x, fx)
            r = (x - w) * (fx - fv)
            q = (x - v) * (fx - fw)
            p = (x - v) * q - (x - w) * r
            q = 2.0 * (q - r)

            if q > 0:
                p = -p
            else:
                q = -q

            # Check if parabolic step is acceptable
            if abs(p) < abs(0.5 * q * e) and p > q * (a - x) and p < q * (b - x):
                e = d
                d = p / q
                u = x + d
                # Don't evaluate too close to endpoints
                if (u - a) < tol2 or (b - u) < tol2:
                    d = tol1 if x < midpoint else -tol1
                use_golden = False

        if use_golden:
            # Golden section step
            e = (b if x < midpoint else a) - x
            d = GOLDEN * e

        # Evaluate new point
        if abs(d) >= tol1:
            u = x + d
        else:
            u = x + (tol1 if d > 0 else -tol1)

        fu = f(u)
        function_calls += 1

        # Update bracket and best points
        if fu <= fx:
            if u < x:
                b = x
            else:
                a = x
            v, fv = w, fw
            w, fw = x, fx
            x, fx = u, fu
        else:
            if u < x:
                a = u
            else:
                b = u
            if fu <= fw or w == x:
                v, fv = w, fw
                w, fw = u, fu
            elif fu <= fv or v == x or v == w:
                v, fv = u, fu

    return Brent1dResult(
        x=x, fun=fx, iterations=max_iter,
        function_calls=function_calls, converged=False,
        message="Maximum iterations exceeded",
    )
