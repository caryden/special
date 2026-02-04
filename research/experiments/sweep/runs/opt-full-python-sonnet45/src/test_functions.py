"""
Standard optimization test functions with analytic gradients.
"""

import math
from dataclasses import dataclass
from typing import Callable, List


@dataclass
class TestFunction:
    name: str
    dimensions: int
    f: Callable[[List[float]], float]
    gradient: Callable[[List[float]], List[float]]
    minimum_at: List[float]
    minimum_value: float
    starting_point: List[float]


sphere = TestFunction(
    name="Sphere",
    dimensions=2,
    f=lambda x: x[0] ** 2 + x[1] ** 2,
    gradient=lambda x: [2 * x[0], 2 * x[1]],
    minimum_at=[0.0, 0.0],
    minimum_value=0.0,
    starting_point=[5.0, 5.0],
)

booth = TestFunction(
    name="Booth",
    dimensions=2,
    f=lambda x: (x[0] + 2 * x[1] - 7) ** 2 + (2 * x[0] + x[1] - 5) ** 2,
    gradient=lambda x: [
        2 * (x[0] + 2 * x[1] - 7) + 4 * (2 * x[0] + x[1] - 5),
        4 * (x[0] + 2 * x[1] - 7) + 2 * (2 * x[0] + x[1] - 5),
    ],
    minimum_at=[1.0, 3.0],
    minimum_value=0.0,
    starting_point=[0.0, 0.0],
)

rosenbrock = TestFunction(
    name="Rosenbrock",
    dimensions=2,
    f=lambda x: (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
    gradient=lambda x: [
        -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] ** 2),
        200 * (x[1] - x[0] ** 2),
    ],
    minimum_at=[1.0, 1.0],
    minimum_value=0.0,
    starting_point=[-1.2, 1.0],
)

beale = TestFunction(
    name="Beale",
    dimensions=2,
    f=lambda x: (
        (1.5 - x[0] + x[0] * x[1]) ** 2
        + (2.25 - x[0] + x[0] * x[1] ** 2) ** 2
        + (2.625 - x[0] + x[0] * x[1] ** 3) ** 2
    ),
    gradient=lambda x: [
        2 * (1.5 - x[0] + x[0] * x[1]) * (-1 + x[1])
        + 2 * (2.25 - x[0] + x[0] * x[1] ** 2) * (-1 + x[1] ** 2)
        + 2 * (2.625 - x[0] + x[0] * x[1] ** 3) * (-1 + x[1] ** 3),
        2 * (1.5 - x[0] + x[0] * x[1]) * x[0]
        + 2 * (2.25 - x[0] + x[0] * x[1] ** 2) * (2 * x[0] * x[1])
        + 2 * (2.625 - x[0] + x[0] * x[1] ** 3) * (3 * x[0] * x[1] ** 2),
    ],
    minimum_at=[3.0, 0.5],
    minimum_value=0.0,
    starting_point=[0.0, 0.0],
)

himmelblau = TestFunction(
    name="Himmelblau",
    dimensions=2,
    f=lambda x: (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2,
    gradient=lambda x: [
        4 * x[0] * (x[0] ** 2 + x[1] - 11) + 2 * (x[0] + x[1] ** 2 - 7),
        2 * (x[0] ** 2 + x[1] - 11) + 4 * x[1] * (x[0] + x[1] ** 2 - 7),
    ],
    minimum_at=[3.0, 2.0],
    minimum_value=0.0,
    starting_point=[0.0, 0.0],
)

HIMMELBLAU_MINIMA = [
    [3.0, 2.0],
    [-2.805118, 3.131312],
    [-3.779310, -3.283186],
    [3.584428, -1.848126],
]


def _goldstein_price_f(x: List[float]) -> float:
    x1, x2 = x[0], x[1]
    a = 1 + (x1 + x2 + 1) ** 2 * (
        19 - 14 * x1 + 3 * x1 ** 2 - 14 * x2 + 6 * x1 * x2 + 3 * x2 ** 2
    )
    b = 30 + (2 * x1 - 3 * x2) ** 2 * (
        18 - 32 * x1 + 12 * x1 ** 2 + 48 * x2 - 36 * x1 * x2 + 27 * x2 ** 2
    )
    return a * b


def _goldstein_price_grad(x: List[float]) -> List[float]:
    x1, x2 = x[0], x[1]
    h = 1e-8
    # Use central differences for the gradient of this complex function
    g = [0.0, 0.0]
    for i in range(2):
        xp = x[:]
        xm = x[:]
        xp[i] += h
        xm[i] -= h
        g[i] = (_goldstein_price_f(xp) - _goldstein_price_f(xm)) / (2 * h)
    return g


goldstein_price = TestFunction(
    name="Goldstein-Price",
    dimensions=2,
    f=_goldstein_price_f,
    gradient=_goldstein_price_grad,
    minimum_at=[0.0, -1.0],
    minimum_value=3.0,
    starting_point=[0.0, -0.5],
)
