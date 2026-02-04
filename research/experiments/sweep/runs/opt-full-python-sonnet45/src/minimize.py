"""
Top-level minimize dispatcher.
"""

from typing import Callable, List, Optional

from .result_types import OptimizeResult
from .nelder_mead import nelder_mead
from .gradient_descent import gradient_descent
from .bfgs import bfgs
from .l_bfgs import lbfgs


def minimize(
    f: Callable[[List[float]], float],
    x0: List[float],
    method: Optional[str] = None,
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    **kwargs,
) -> OptimizeResult:
    """Minimize a scalar function, dispatching to the appropriate algorithm."""
    if method is None:
        method = "bfgs" if grad is not None else "nelder-mead"

    if method == "nelder-mead":
        return nelder_mead(f, x0, **kwargs)
    elif method == "gradient-descent":
        return gradient_descent(f, x0, grad=grad, **kwargs)
    elif method == "bfgs":
        return bfgs(f, x0, grad=grad, **kwargs)
    elif method == "l-bfgs":
        return lbfgs(f, x0, grad=grad, **kwargs)
    else:
        raise ValueError(f"Unknown method: {method}")
