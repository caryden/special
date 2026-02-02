"""
Tests for nelder_mead.py — covers vec-ops, result-types, and nelder-mead nodes.

All test vectors come from the spec files:
  - experiments/optimize-skill/nodes/vec-ops/spec.md
  - experiments/optimize-skill/nodes/result-types/spec.md
  - experiments/optimize-skill/nodes/nelder-mead/spec.md
"""

import pytest

from nelder_mead import (
    # vec-ops
    dot,
    norm,
    norm_inf,
    scale,
    add,
    sub,
    negate,
    clone,
    zeros,
    add_scaled,
    # result-types
    OptimizeOptions,
    OptimizeResult,
    ConvergenceReason,
    default_options,
    check_convergence,
    is_converged,
    convergence_message,
    # nelder-mead
    NelderMeadOptions,
    nelder_mead,
)


# ===========================================================================
# Test functions (defined here, not imported)
# ===========================================================================

def sphere(x: list[float]) -> float:
    """f(x) = sum(xi^2). Minimum at origin, f=0."""
    return sum(xi * xi for xi in x)


def booth(x: list[float]) -> float:
    """f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2. Minimum at (1, 3), f=0."""
    return (x[0] + 2 * x[1] - 7) ** 2 + (2 * x[0] + x[1] - 5) ** 2


def beale(x: list[float]) -> float:
    """Beale function. Minimum at (3, 0.5), f=0."""
    return (
        (1.5 - x[0] + x[0] * x[1]) ** 2
        + (2.25 - x[0] + x[0] * x[1] ** 2) ** 2
        + (2.625 - x[0] + x[0] * x[1] ** 3) ** 2
    )


def rosenbrock(x: list[float]) -> float:
    """Rosenbrock function. Minimum at (1, 1), f=0."""
    return (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2


def himmelblau(x: list[float]) -> float:
    """Himmelblau function. Four minima, all with f=0."""
    return (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2


# Known Himmelblau minima
HIMMELBLAU_MINIMA = [
    (3.0, 2.0),
    (-2.805118, 3.131312),
    (-3.779310, -3.283186),
    (3.584428, -1.848126),
]


# ===========================================================================
# vec-ops tests
# ===========================================================================

class TestDot:
    def test_basic(self):
        assert dot([1, 2, 3], [4, 5, 6]) == 32

    def test_zero(self):
        assert dot([0, 0], [1, 1]) == 0


class TestNorm:
    def test_345(self):
        assert norm([3, 4]) == 5.0

    def test_zero(self):
        assert norm([0, 0, 0]) == 0.0


class TestNormInf:
    def test_basic(self):
        assert norm_inf([1, -3, 2]) == 3.0

    def test_zero(self):
        assert norm_inf([0, 0]) == 0.0


class TestScale:
    def test_basic(self):
        assert scale([1, 2], 3) == [3, 6]

    def test_zero_scalar(self):
        assert scale([1, 2], 0) == [0, 0]


class TestAdd:
    def test_basic(self):
        assert add([1, 2], [3, 4]) == [4, 6]


class TestSub:
    def test_basic(self):
        assert sub([3, 4], [1, 2]) == [2, 2]


class TestNegate:
    def test_basic(self):
        assert negate([1, -2]) == [-1, 2]


class TestClone:
    def test_basic(self):
        result = clone([1, 2])
        assert result == [1, 2]

    def test_distinct_array(self):
        original = [1, 2]
        cloned = clone(original)
        cloned[0] = 99
        assert original == [1, 2], "clone must return a distinct array"


class TestZeros:
    def test_basic(self):
        assert zeros(3) == [0.0, 0.0, 0.0]


class TestAddScaled:
    def test_basic(self):
        assert add_scaled([1, 2], [3, 4], 2) == [7, 10]


class TestPurity:
    """Verify vec-ops functions don't mutate inputs."""

    def test_add_purity(self):
        a = [1, 2]
        b = [3, 4]
        add(a, b)
        assert a == [1, 2]
        assert b == [3, 4]

    def test_scale_purity(self):
        v = [1, 2]
        scale(v, 3)
        assert v == [1, 2]

    def test_sub_purity(self):
        a = [3, 4]
        b = [1, 2]
        sub(a, b)
        assert a == [3, 4]
        assert b == [1, 2]


# ===========================================================================
# result-types tests
# ===========================================================================

class TestDefaultOptions:
    def test_defaults(self):
        opts = default_options()
        assert opts.grad_tol == 1e-8
        assert opts.step_tol == 1e-8
        assert opts.func_tol == 1e-12
        assert opts.max_iterations == 1000

    def test_override(self):
        opts = default_options(grad_tol=1e-4)
        assert opts.grad_tol == 1e-4
        assert opts.step_tol == 1e-8
        assert opts.func_tol == 1e-12
        assert opts.max_iterations == 1000


class TestCheckConvergence:
    def test_gradient(self):
        opts = default_options()
        reason = check_convergence(1e-9, 0.1, 0.1, 5, opts)
        assert reason is not None
        assert reason.kind == "gradient"

    def test_step(self):
        opts = default_options()
        reason = check_convergence(0.1, 1e-9, 0.1, 5, opts)
        assert reason is not None
        assert reason.kind == "step"

    def test_function(self):
        opts = default_options()
        reason = check_convergence(0.1, 0.1, 1e-13, 5, opts)
        assert reason is not None
        assert reason.kind == "function"

    def test_max_iterations(self):
        opts = default_options()
        reason = check_convergence(0.1, 0.1, 0.1, 1000, opts)
        assert reason is not None
        assert reason.kind == "maxIterations"

    def test_none(self):
        opts = default_options()
        reason = check_convergence(0.1, 0.1, 0.1, 5, opts)
        assert reason is None

    def test_priority_gradient_first(self):
        """When multiple criteria met, gradient wins (Optim.jl convention)."""
        opts = default_options()
        reason = check_convergence(1e-9, 1e-9, 1e-13, 1000, opts)
        assert reason is not None
        assert reason.kind == "gradient"


class TestIsConverged:
    def test_gradient_converged(self):
        assert is_converged(ConvergenceReason(kind="gradient")) is True

    def test_step_converged(self):
        assert is_converged(ConvergenceReason(kind="step")) is True

    def test_function_converged(self):
        assert is_converged(ConvergenceReason(kind="function")) is True

    def test_max_iterations_not_converged(self):
        assert is_converged(ConvergenceReason(kind="maxIterations")) is False

    def test_line_search_failed_not_converged(self):
        assert is_converged(ConvergenceReason(kind="lineSearchFailed")) is False


# ===========================================================================
# nelder-mead tests
# ===========================================================================

class TestNelderMeadSphere:
    def test_sphere_converges(self):
        result = nelder_mead(sphere, [5.0, 5.0])
        assert result.converged is True
        assert result.fun < 1e-6
        assert abs(result.x[0]) < 1e-3
        assert abs(result.x[1]) < 1e-3


class TestNelderMeadBooth:
    def test_booth_converges(self):
        result = nelder_mead(booth, [0.0, 0.0])
        assert result.converged is True
        assert result.fun < 1e-6
        assert abs(result.x[0] - 1.0) < 1e-3
        assert abs(result.x[1] - 3.0) < 1e-3


class TestNelderMeadBeale:
    def test_beale_converges(self):
        result = nelder_mead(beale, [0.0, 0.0], max_iterations=5000)
        assert result.converged is True
        assert result.fun < 1e-6


class TestNelderMeadRosenbrock:
    def test_rosenbrock_converges(self):
        result = nelder_mead(
            rosenbrock, [-1.2, 1.0],
            max_iterations=5000, func_tol=1e-14, step_tol=1e-10,
        )
        assert result.converged is True
        assert result.fun < 1e-6
        assert abs(result.x[0] - 1.0) < 1e-3
        assert abs(result.x[1] - 1.0) < 1e-3


class TestNelderMeadHimmelblau:
    def test_himmelblau_converges(self):
        result = nelder_mead(himmelblau, [0.0, 0.0])
        assert result.converged is True
        assert result.fun < 1e-6
        # Check that result is close to one of the four known minima
        close_to_any = any(
            abs(result.x[0] - mx) < 0.01 and abs(result.x[1] - my) < 0.01
            for mx, my in HIMMELBLAU_MINIMA
        )
        assert close_to_any, f"Result {result.x} not close to any known minimum"


class TestNelderMeadBehavioral:
    def test_respects_max_iterations(self):
        """maxIterations=5 on Rosenbrock: iterations <= 5, converged=false."""
        result = nelder_mead(rosenbrock, [-1.2, 1.0], max_iterations=5)
        assert result.iterations <= 5
        assert result.converged is False

    def test_gradient_calls_always_zero(self):
        """Nelder-Mead is derivative-free: gradientCalls must always be 0."""
        result = nelder_mead(sphere, [5.0, 5.0])
        assert result.gradient_calls == 0

    def test_gradient_is_none(self):
        """Nelder-Mead does not compute gradients."""
        result = nelder_mead(sphere, [5.0, 5.0])
        assert result.gradient is None
