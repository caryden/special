# test-functions — Spec

Depends on: _(none — leaf node)_

## Purpose

Standard optimization test functions with analytic gradients, known minima, and
starting points. Used for validating optimizer implementations.

## Type

Each test function provides:
- `name` — human-readable name
- `dimensions` — number of variables (all are 2D here)
- `f(x)` — objective function
- `gradient(x)` — analytic gradient
- `minimumAt` — known minimizer
- `minimumValue` — known minimum value
- `startingPoint` — standard starting point for benchmarks

## Functions

### Sphere
@provenance: mathematical-definition

`f(x) = x₁² + x₂²`

| Property | Value |
|----------|-------|
| Gradient | `[2x₁, 2x₂]` |
| Minimum at | `[0, 0]` |
| Minimum value | `0` |
| Starting point | `[5, 5]` |

### Booth
@provenance: mathematical-definition

`f(x) = (x₁ + 2x₂ - 7)² + (2x₁ + x₂ - 5)²`

| Property | Value |
|----------|-------|
| Gradient | `[2(x₁+2x₂-7) + 4(2x₁+x₂-5), 4(x₁+2x₂-7) + 2(2x₁+x₂-5)]` |
| Minimum at | `[1, 3]` |
| Minimum value | `0` |
| Starting point | `[0, 0]` |

### Rosenbrock
@provenance: mathematical-definition (Rosenbrock 1960)
@provenance: scipy.optimize.rosen v1.17.0 (same formula)
@provenance: optim.jl OptimTestProblems v2.0.0 (starting point [-1.2, 1.0])

`f(x) = (1 - x₁)² + 100(x₂ - x₁²)²`

| Property | Value |
|----------|-------|
| Gradient | `[-2(1-x₁) - 400x₁(x₂-x₁²), 200(x₂-x₁²)]` |
| Minimum at | `[1, 1]` |
| Minimum value | `0` |
| Starting point | `[-1.2, 1.0]` |

### Beale
@provenance: mathematical-definition (Beale 1958)

`f(x) = (1.5 - x₁ + x₁x₂)² + (2.25 - x₁ + x₁x₂²)² + (2.625 - x₁ + x₁x₂³)²`

| Property | Value |
|----------|-------|
| Minimum at | `[3, 0.5]` |
| Minimum value | `0` |
| Starting point | `[0, 0]` |

### Himmelblau
@provenance: mathematical-definition (Himmelblau 1972)

`f(x) = (x₁² + x₂ - 11)² + (x₁ + x₂² - 7)²`

Has four minima (all with f = 0):
- `[3.0, 2.0]`
- `[-2.805118, 3.131312]`
- `[-3.779310, -3.283186]`
- `[3.584428, -1.848126]`

| Property | Value |
|----------|-------|
| Starting point | `[0, 0]` |
| Minimum value | `0` |

### Goldstein-Price
@provenance: mathematical-definition (Goldstein & Price 1971)

Two-part product function. Minimum value is **3** (not 0).

| Property | Value |
|----------|-------|
| Minimum at | `[0, -1]` |
| Minimum value | `3` |
| Starting point | `[0, -0.5]` |

Note: Starting point `[-0.5, -0.5]` converges to a local minimum at f≈30.
Use `[0, -0.5]` to reach the global minimum. If an algorithm (particularly
L-BFGS) struggles with `[0, -0.5]`, use `[-0.1, -0.9]` instead — it is
closer to the basin of the global minimum and converges reliably across
all tested algorithms and languages.

## Validation Test Vectors

@provenance: mathematical-definition — verify f(minimumAt) = minimumValue

| Function | f(minimumAt) | Expected |
|----------|-------------|----------|
| Sphere | `f([0, 0])` | `0` |
| Booth | `f([1, 3])` | `0` |
| Rosenbrock | `f([1, 1])` | `0` |
| Beale | `f([3, 0.5])` | `0` |
| Himmelblau | `f([3, 2])` | `0` |
| Goldstein-Price | `f([0, -1])` | `3` |

@provenance: mathematical-definition — gradient at minimum should be zero (or near-zero for Goldstein-Price)

| Function | ‖∇f(minimumAt)‖ | Expected |
|----------|----------------|----------|
| Sphere | `norm(gradient([0,0]))` | `0` |
| Booth | `norm(gradient([1,3]))` | `< 1e-10` |
| Rosenbrock | `norm(gradient([1,1]))` | `0` |

@provenance: mathematical-definition — verify gradient matches finite differences

For each function, at the starting point, the analytic gradient should match
a central-difference approximation to within 1e-5.
