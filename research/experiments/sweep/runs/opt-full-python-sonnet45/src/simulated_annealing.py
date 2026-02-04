"""
Simulated Annealing: derivative-free stochastic global optimizer.
"""

import math
from typing import Callable, List, Optional

from .result_types import OptimizeResult, default_options


def log_temperature(k: int) -> float:
    """Default logarithmic cooling: T(k) = 1/ln(k)."""
    if k <= 1:
        return float('inf')
    return 1.0 / math.log(k)


def mulberry32(seed: int) -> Callable[[], float]:
    """Seeded 32-bit PRNG returning values in [0, 1)."""
    s = [seed & 0xFFFFFFFF]

    def next_val() -> float:
        s[0] = (s[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = s[0] ^ (s[0] >> 15)
        t = (t * (1 | s[0])) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t = t ^ (t >> 14)
        return (t & 0xFFFFFFFF) / 4294967296.0

    return next_val


def _box_muller_normal(rng: Callable[[], float]) -> float:
    """Box-Muller transform for standard normal samples."""
    u1 = rng()
    while u1 == 0:
        u1 = rng()
    u2 = rng()
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


def gaussian_neighbor(x: List[float], rng: Callable[[], float]) -> List[float]:
    """Default neighbor: adds N(0,1) noise to each coordinate."""
    return [xi + _box_muller_normal(rng) for xi in x]


def simulated_annealing(
    f: Callable[[List[float]], float],
    x0: List[float],
    temperature: Optional[Callable[[int], float]] = None,
    neighbor: Optional[Callable[[List[float], Callable[[], float]], List[float]]] = None,
    seed: Optional[int] = None,
    max_iterations: int = 1000,
    **kwargs,
) -> OptimizeResult:
    """Minimize using Simulated Annealing."""
    temp_fn = temperature if temperature is not None else log_temperature
    neighbor_fn = neighbor if neighbor is not None else gaussian_neighbor

    import random
    if seed is not None:
        rng = mulberry32(seed)
    else:
        rng = random.random

    x_current = x0[:]
    f_current = f(x_current)
    x_best = x_current[:]
    f_best = f_current
    function_calls = 1

    for k in range(1, max_iterations + 1):
        t = temp_fn(k)
        x_proposal = neighbor_fn(x_current, rng)
        f_proposal = f(x_proposal)
        function_calls += 1

        if f_proposal <= f_current:
            x_current = x_proposal
            f_current = f_proposal
            if f_proposal < f_best:
                x_best = x_proposal[:]
                f_best = f_proposal
        else:
            p = math.exp(-(f_proposal - f_current) / t) if t > 0 else 0.0
            if rng() <= p:
                x_current = x_proposal
                f_current = f_proposal

    return OptimizeResult(
        x=x_best,
        fun=f_best,
        gradient=[],
        iterations=max_iterations,
        function_calls=function_calls,
        gradient_calls=0,
        converged=True,
        message=f"Completed {max_iterations} iterations",
    )
