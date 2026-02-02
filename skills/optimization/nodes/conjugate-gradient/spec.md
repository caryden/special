# conjugate-gradient — Spec

Depends on: `vec-ops`, `result-types`, `hager-zhang`, `finite-diff`

## Purpose

Nonlinear conjugate gradient optimization using the Hager-Zhang (HZ) beta formula
with guaranteed descent. Uses the HZ line search for step selection. Memory usage
is O(n), making CG suitable for large-scale problems where BFGS (O(n²)) or Newton
(O(n²) Hessian) are prohibitive.

This matches Optim.jl's `ConjugateGradient()` implementation.

## Types

### ConjugateGradientOptions

Extends `Partial<OptimizeOptions>` with:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `eta` | number | 0.4 | Descent guarantee parameter for HZ beta |
| `restartInterval` | number | n (dimension) | Restart CG direction every this many iterations |

## Function

### conjugateGradient

@provenance: Hager & Zhang, "A new conjugate gradient method with guaranteed descent
             and an efficient line search", SIAM J. Optim. 16(1), 2005
@provenance: Optim.jl ConjugateGradient() — uses HZ beta + HZ line search

Signature: `(f, x0, grad?, options?) -> OptimizeResult`

Parameters:
- `f`: Objective function `(x: number[]) -> number`
- `x0`: Starting point
- `grad`: Gradient function (optional; uses forward finite differences if omitted)
- `options`: Optional `ConjugateGradientOptions`

Returns: `OptimizeResult`

## Algorithm

1. Evaluate f(x0) and g0 = grad(x0). Set initial direction d = -g0.
2. Check initial gradient convergence.
3. For each iteration:
   a. Perform HZ line search along direction d to get step size alpha
   b. Update: x_new = x + alpha * d
   c. Evaluate f_new and g_new
   d. Compute HZ beta:
      - y = g_new - g_old
      - beta_HZ = (dot(y, g_new) - 2 * dot(y, y) * dot(d, g_new) / dot(d, y)) / dot(d, y)
   e. Apply eta guarantee: beta = max(beta_HZ, -1 / (||d|| * min(eta, ||g_old||)))
   f. Update direction: d = -g_new + beta * d
   g. If dot(d, g_new) >= 0, restart: d = -g_new (descent safety)
   h. Periodic restart every `restartInterval` iterations: d = -g_new
   i. Check convergence (gradTol, stepTol, funcTol)
4. If loop exhausted, return with max iterations message.

## Test Vectors

### Basic convergence on all 6 test functions

- Sphere [5,5]: converged, fun < 1e-14
- Booth [0,0]: converged, x ≈ [1, 3]
- Rosenbrock [-1.2, 1.0]: converged, fun < 1e-8
- Beale [0,0]: converged, x ≈ [3, 0.5]
- Himmelblau [0,0]: converged, fun < 1e-10
- Goldstein-Price [0,-0.5]: converged, fun ≈ 3

### Without gradient (finite differences)

- Sphere and Booth converge with forward-difference gradient

### Edge cases

- Starting at minimum: 0 iterations
- 1D problem: converges
- 5D sphere: converges

### Failure modes

- maxIterations=5 on Rosenbrock: converged = false
- maxIterations=2 on Rosenbrock: message contains "maximum iterations"

## Cross-Library Comparison

| Property | Our Implementation | Optim.jl |
|----------|-------------------|----------|
| Beta formula | Hager-Zhang | Hager-Zhang |
| Eta parameter | 0.4 | 0.4 |
| Line search | Hager-Zhang | Hager-Zhang |
| Restart | every n iterations | every n iterations |

All defaults match Optim.jl's `ConjugateGradient()` constructor.
