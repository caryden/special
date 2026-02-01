# newton-trust-region — Spec

Depends on: `vec-ops`, `result-types`, `finite-diff`, `finite-hessian`

## Purpose

Newton's method with trust region globalization. Instead of a line search, constrains
the step to lie within a trust region of radius δ. Uses the dogleg method to solve the
trust region subproblem, with adaptive radius management based on actual-vs-predicted
reduction agreement.

## Types

### TrustRegionOptions

Extends `Partial<OptimizeOptions>` with:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `initialDelta` | number | 1.0 | Initial trust region radius |
| `maxDelta` | number | 100.0 | Maximum trust region radius |
| `eta` | number | 0.1 | Acceptance threshold for reduction ratio |

## Function

### newtonTrustRegion

@provenance: Nocedal & Wright, Numerical Optimization, Algorithm 4.1
@provenance: Trust region radius update from Section 4.1
@provenance: Dogleg method from Section 4.1
@provenance: Optim.jl NewtonTrustRegion() — similar algorithm

Signature: `(f, x0, grad?, hess?, options?) -> OptimizeResult`

Parameters:
- `f`: Objective function `(x: number[]) -> number`
- `x0`: Starting point
- `grad`: Gradient function (optional; uses forward finite differences if omitted)
- `hess`: Hessian function (optional; uses central finite-difference Hessian if omitted)
- `options`: Optional `TrustRegionOptions`

Returns: `OptimizeResult`

## Algorithm

1. Evaluate f(x0), g0, check initial gradient convergence.
2. For each iteration:
   a. Compute Hessian H
   b. Solve trust region subproblem via dogleg (see below) to get step p
   c. Evaluate f at trial point x + p
   d. Compute reduction ratio: ρ = actual_reduction / predicted_reduction
      - predicted = -(g'p + 0.5*p'Hp)
      - actual = f(x) - f(x+p)
   e. Update trust region radius:
      - If ρ < 0.25: δ = 0.25 * ||p||
      - If ρ > 0.75 and ||p|| ≥ 0.99δ: δ = min(2δ, δ_max)
   f. Accept step if ρ > η:
      - Update x, f, g
      - Check convergence
   g. Reject step if ρ ≤ η:
      - If δ < 1e-15: stop ("trust region radius below minimum")
3. If loop exhausted, return with max iterations message.

### Dogleg Method

Solves the trust region subproblem: minimize m(p) = g'p + 0.5*p'Hp subject to ||p|| ≤ δ.

1. **Cauchy point**: pC = -τ*g where τ = ||g||²/(g'Hg) if g'Hg > 0, else boundary
   - If ||pC|| ≥ δ: return scaled gradient step: p = -(δ/||g||)*g
2. **Newton point**: pN = -H⁻¹g via Cholesky factorization
   - If Cholesky fails (indefinite H): return pC (or scaled to boundary)
   - If ||pN|| ≤ δ: return pN (full Newton step fits in trust region)
3. **Dogleg interpolation**: find τ ∈ [0,1] such that ||pC + τ(pN - pC)|| = δ
   - Solve quadratic: ||pC + τ*(pN - pC)||² = δ²

## Test Vectors

### Basic convergence on all 6 test functions

- Sphere [5,5]: converged, fun < 1e-14
- Booth [0,0]: converged, x ≈ [1, 3]
- Rosenbrock [-1.2, 1.0]: converged, fun < 1e-8
- Beale [0,0]: converged, x ≈ [3, 0.5]
- Himmelblau [0,0]: converged, fun < 1e-10
- Goldstein-Price [0,-0.5]: converged, fun ≈ 3

### Trust region adaptation

- Sphere with initialDelta=0.1: trust region expands (good model agreement)
- Rosenbrock from [-5,5] with initialDelta=0.01: trust region shrinks (poor agreement)
- maxDelta=0.5: still converges despite small cap

### Indefinite Hessian

- Saddle function x²-y²: uses Cauchy point when Newton step unavailable
- Negative definite Hessian: falls back to Cauchy boundary step

### Dogleg paths

- Pure Newton: small problem with large delta → Newton step within trust region
- Cauchy boundary: large gradient with small delta → Cauchy scaled to boundary
- Dogleg interpolation: medium delta → interpolation between Cauchy and Newton

### Edge cases

- Starting at minimum: 0 iterations
- 1D problem: converges
- Trust region too small: wrong gradient forces rejections → δ shrinks to < 1e-15

## Cross-Library Comparison

| Property | Our Implementation | Optim.jl |
|----------|-------------------|----------|
| Subproblem solver | Dogleg | Dogleg |
| Initial δ | 1.0 | 1.0 |
| Max δ | 100.0 | 100.0 |
| η (acceptance) | 0.1 | 0.1 |
| Radius update | Nocedal & Wright 4.1 | Similar |
