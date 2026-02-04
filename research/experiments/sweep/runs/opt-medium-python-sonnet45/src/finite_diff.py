"""
finite-diff — Numerical gradient approximation using finite differences.
"""

from typing import Callable, Literal
import vec_ops

# Machine epsilon for float64
EPS = 2.220446049250313e-16


def forward_diff_gradient(f: Callable[[list[float]], float], x: list[float]) -> list[float]:
    """
    Approximate gradient using forward differences.

    Uses step size h = sqrt(eps) * max(|x_i|, 1) for each component.
    """
    n = len(x)
    grad = vec_ops.zeros(n)
    fx = f(x)

    for i in range(n):
        # Compute step size for this component
        h = EPS**0.5 * max(abs(x[i]), 1.0)

        # Perturb x_i
        x_perturbed = vec_ops.clone(x)
        x_perturbed[i] += h

        # Compute forward difference
        f_perturbed = f(x_perturbed)
        grad[i] = (f_perturbed - fx) / h

    return grad


def central_diff_gradient(f: Callable[[list[float]], float], x: list[float]) -> list[float]:
    """
    Approximate gradient using central differences.

    Uses step size h = cbrt(eps) * max(|x_i|, 1) for each component.
    """
    n = len(x)
    grad = vec_ops.zeros(n)

    for i in range(n):
        # Compute step size for this component
        h = EPS**(1.0/3.0) * max(abs(x[i]), 1.0)

        # Perturb x_i forward and backward
        x_forward = vec_ops.clone(x)
        x_forward[i] += h

        x_backward = vec_ops.clone(x)
        x_backward[i] -= h

        # Compute central difference
        f_forward = f(x_forward)
        f_backward = f(x_backward)
        grad[i] = (f_forward - f_backward) / (2.0 * h)

    return grad


def make_gradient(
    f: Callable[[list[float]], float],
    method: Literal["forward", "central"] = "forward"
) -> Callable[[list[float]], list[float]]:
    """
    Factory function that returns a gradient function using the specified method.

    Args:
        f: Objective function
        method: Either "forward" or "central" (default: "forward")

    Returns:
        A function that computes the gradient of f
    """
    if method == "central":
        return lambda x: central_diff_gradient(f, x)
    else:
        return lambda x: forward_diff_gradient(f, x)
