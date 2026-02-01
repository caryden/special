# newton — Spec

Depends on: `vec-ops`, `result-types`, `line-search`, `finite-hessian`, `finite-diff`

## Purpose

Newton's method for optimization: uses the Hessian (or finite-difference approximation)
to compute Newton directions d = -H⁻¹g for quadratic convergence near a minimum.
Globalized with Strong Wolfe line search for robustness far from the solution.

When the Hessian is not positive definite, uses modified Newton regularization
(adding τI to the Hessian) to ensure a descent direction.

## Types

### NewtonOptions

Extends `Partial<OptimizeOptions>` with:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `initialTau` | number | 1e-8 | Initial regularization parameter |
| `tauFactor` | number | 10 | Regularization growth factor per retry |
| `maxRegularize` | number | 20 | Maximum regularization attempts |

## Function

### newton

@provenance: Nocedal & Wright, Numerical Optimization, Chapter 3 (Newton's method)
@provenance: Modified Newton: Nocedal & Wright, Section 3.4
@provenance: Optim.jl Newton() — uses NLSolversBase Hessian infrastructure

Signature: `(f, x0, grad?, hess?, options?) -> OptimizeResult`

Parameters:
- `f`: Objective function `(x: number[]) -> number`
- `x0`: Starting point
- `grad`: Gradient function (optional; uses forward finite differences if omitted)
- `hess`: Hessian function (optional; uses central finite-difference Hessian if omitted)
- `options`: Optional `NewtonOptions`

Returns: `OptimizeResult`

## Algorithm

1. Evaluate f(x0), g0, check initial gradient convergence.
2. For each iteration:
   a. Compute Hessian H at current point
   b. Solve (H + τI)d = -g using Cholesky factorization:
      - Try Cholesky on H first (τ = 0)
      - If Cholesky fails (not PD), add τI and retry with τ *= tauFactor
      - Up to maxRegularize attempts
   c. If regularization exhausts all attempts, return failure
   d. If Newton direction is not descent (d'g >= 0), use steepest descent: d = -g
   e. Perform Strong Wolfe line search along d
   f. Update x, f, g
   g. Check convergence (gradTol, stepTol, funcTol, maxIterations)
3. If loop exhausted, return with max iterations message.

### Cholesky Factorization

- Compute L such that A = LL' (lower triangular)
- Forward substitution: Ly = b
- Back substitution: L'x = y
- Returns null if matrix is not positive definite (diagonal element ≤ 0)

## Test Vectors

### Analytic Hessian convergence

- Sphere [5,5]: converged, fun < 1e-14, iterations ≤ 2 (quadratic convergence)
- Booth [0,0]: converged, x ≈ [1, 3]
- Rosenbrock [-1.2, 1.0]: converged, fun < 1e-10

### Finite-difference Hessian

- Sphere, Booth, Rosenbrock: all converge without analytic Hessian

### Modified Newton (regularization)

- Saddle function x²-y²: handles indefinite Hessian via τI regularization
- Small negative eigenvalue: regularization succeeds after multiple attempts
- maxRegularize=0: returns "regularization failed"

### Edge cases

- Starting at minimum: 0 iterations
- 1D problem: converges, ≤ 2 iterations
- Line search failure: returns gracefully
- maxIterations reached: message contains "maximum iterations"

## Cross-Library Comparison

| Property | Our Implementation | Optim.jl |
|----------|-------------------|----------|
| Hessian solve | Cholesky + τI regularization | Cholesky (via LinearAlgebra) |
| Line search | Strong Wolfe | Hager-Zhang |
| Regularization | τI with exponential growth | Similar via positive-definiteness check |
