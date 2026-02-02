# minimize — Spec

Depends on: `nelder-mead`, `gradient-descent`, `bfgs`, `l-bfgs`, `result-types`

## Purpose

Top-level public API. Dispatches to the appropriate algorithm based on the
`method` parameter and whether a gradient function is provided. This is a thin
dispatcher — the real logic lives in the algorithm nodes.

## Method Selection

@provenance: API design — method selection matches Optim.jl (NelderMead when no gradient).
scipy defaults to BFGS with finite differences when no gradient is provided.

| Condition | Default Method |
|-----------|---------------|
| gradient provided, no method specified | `"bfgs"` |
| no gradient, no method specified | `"nelder-mead"` |
| method explicitly specified | use that method |

Available methods: `"nelder-mead"`, `"gradient-descent"`, `"bfgs"`, `"l-bfgs"`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `minimize` | `(f, x0, options?) → OptimizeResult` | Minimize a scalar function |

Options include:
- `method`: algorithm to use
- `grad`: gradient function
- Plus all `OptimizeOptions` fields (gradTol, stepTol, funcTol, maxIterations)

## Test Vectors

@provenance: API design

### Default method selection

| Test | Expected |
|------|----------|
| `minimize(sphere.f, x0)` (no gradient) | Uses nelder-mead: converged=true, gradientCalls=0 |
| `minimize(sphere.f, x0, { grad })` | Uses bfgs: converged=true, gradientCalls > 0 |

### Explicit method selection

| Method | Function | Expected |
|--------|----------|----------|
| `"nelder-mead"` | Sphere | converged=true, fun≈0 |
| `"gradient-descent"` | Sphere (with grad) | converged=true, fun≈0 |
| `"bfgs"` | Rosenbrock (with grad) | converged=true, fun < 1e-10, x≈[1,1] |
| `"l-bfgs"` | Rosenbrock (with grad) | converged=true, fun < 1e-10 |
| `"bfgs"` | Sphere (no grad, uses FD) | converged=true, fun≈0 |

### All test functions via bfgs

@provenance: mathematical-definition

| Function | Expected |
|----------|----------|
| Sphere | converged=true, fun≈minimumValue (tol 1e-6) |
| Booth | converged=true, fun≈minimumValue (tol 1e-6) |
| Rosenbrock | converged=true, fun≈minimumValue (tol 1e-6) |
| Beale | converged=true, fun < 1e-8 |
| Himmelblau | converged=true, fun < 1e-8, x near one of four minima |
| Goldstein-Price | converged=true, fun≈3 (tol 1e-4) |

### Options forwarding

| Test | Expected |
|------|----------|
| maxIterations=3 on Rosenbrock via bfgs | iterations ≤ 3 |
| custom gradTol=1e-4 on Sphere | converged=true |

### Cross-library validation summary

@provenance: scipy.optimize.minimize v1.17.0, all methods
Empirically verified 2026-02-01 (Python 3, numpy 2.4.2).

All 6 test functions × 5 method configurations (30 total runs) validated against
scipy. Both libraries converge to the same minima. See individual algorithm specs
for detailed per-function comparison tables.

Key findings:
- BFGS/L-BFGS: Both converge, ±5 iteration difference due to line search details
- Nelder-Mead: Both converge, ±50% iteration difference due to simplex construction
- Finite-diff BFGS: Our tighter gradTol=1e-8 causes formal non-convergence on
  Rosenbrock/Beale where scipy's gtol=1e-5 succeeds. Actual f values are equivalent.
- All Himmelblau runs (both libraries) converge to (3, 2) from starting point (0, 0).

@provenance: optim.jl v2.0.0, empirically verified 2026-02-01 (Julia 1.10.7)
All 6 test functions × 5 method configurations validated against Optim.jl.
Both libraries converge to the same minima. See individual algorithm specs
for detailed per-function comparison tables.

Key findings:
- BFGS: Optim.jl converges in fewer iterations (HagerZhang vs Strong Wolfe line search)
- L-BFGS: Optim.jl reaches tighter f values, especially on Rosenbrock (4.93e-30)
- Nelder-Mead: Optim.jl converges faster (AffineSimplexer), our reference reaches tighter f
- Gradient Descent: Both fail on Rosenbrock at 1000 iter. Optim.jl fails on Beale (no f_tol)
- Conjugate Gradient: Optim.jl-only (we don't implement CG). Converges on all functions.
- Default method with gradient: LBFGS (we use BFGS, scipy uses BFGS)
- Default method without gradient: NelderMead (matches us; scipy uses BFGS+FD)
- gradTol: 1e-8 (matches us; scipy uses 1e-5)
