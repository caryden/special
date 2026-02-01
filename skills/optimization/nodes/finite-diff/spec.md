# finite-diff — Spec

Depends on: `vec-ops`

## Purpose

Approximate gradients numerically when analytic gradients are unavailable.
Two methods: forward differences (fast, O(h) error) and central differences
(slower, O(h²) error).

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `forwardDiffGradient` | `(f, x) → gradient` | Forward difference: `(f(x+h*eᵢ) - f(x)) / h` per component |
| `centralDiffGradient` | `(f, x) → gradient` | Central difference: `(f(x+h*eᵢ) - f(x-h*eᵢ)) / (2h)` per component |
| `makeGradient` | `(f, method?) → gradientFn` | Factory: returns a gradient function using the specified method |

## Step Size Selection

@provenance: Nocedal & Wright, Numerical Optimization, §8.1

- Forward: `h = √ε × max(|xᵢ|, 1)` where `ε = machine epsilon ≈ 2.22e-16`
- Central: `h = ∛ε × max(|xᵢ|, 1)`

The `max(|xᵢ|, 1)` scaling ensures the step is relative to the magnitude of x.

## Test Vectors

@provenance: mathematical-definition — compare against analytic gradients

| Function | Point | Analytic Gradient | Forward Diff Tolerance | Central Diff Tolerance |
|----------|-------|-------------------|----------------------|----------------------|
| Sphere `x²+y²` | `[3, 4]` | `[6, 8]` | `1e-7` | `1e-10` |
| Sphere | `[0, 0]` | `[0, 0]` | `1e-7` | `1e-10` |
| Rosenbrock | `[-1.2, 1.0]` | `[-215.6, -88]` | `1e-4` | `1e-7` |
| Beale | `[1, 1]` | `[-1.5, 5.25]` | `1e-5` | `1e-8` |

### makeGradient factory

| Call | Expected |
|------|----------|
| `makeGradient(sphere.f)` | Returns function matching `forwardDiffGradient` |
| `makeGradient(sphere.f, "central")` | Returns function matching `centralDiffGradient` |
