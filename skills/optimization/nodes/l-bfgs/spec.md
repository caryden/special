# l-bfgs — Spec

Depends on: `vec-ops`, `result-types`, `line-search`, `finite-diff`

## Purpose

Limited-memory BFGS. Instead of storing the full n×n inverse Hessian, stores
the last `m` correction pairs {sₖ, yₖ} and uses the two-loop recursion to
compute H·g implicitly. Identical results to BFGS for small problems; essential
for large-scale optimization where n is large.

## Algorithm

@provenance: Nocedal & Wright, Numerical Optimization, Algorithm 7.4 (two-loop recursion)

1. Initialize: no history, γ = 1.0 (initial Hessian scaling)
2. Evaluate f(x₀) and ∇f(x₀). Check if already at minimum.
3. First iteration: d = −∇f (steepest descent). Subsequent: d = −H·∇f via two-loop recursion.
4. **Strong Wolfe** line search for step size α
5. Compute sₖ, yₖ. If yₖᵀsₖ > 1e-10, store in history (circular buffer, max `m` pairs)
6. Update scaling: γ = (yₖᵀsₖ)/(yₖᵀyₖ)
7. Check convergence. Repeat from step 3.

### Two-Loop Recursion

Computes `H·g` without forming H explicitly:
```
q = g
for i = k-1 down to k-m:
  αᵢ = ρᵢ sᵢᵀq
  q = q - αᵢ yᵢ
r = γ · q
for i = k-m up to k-1:
  β = ρᵢ yᵢᵀr
  r = r + (αᵢ - β) sᵢ
return r
```

## Options (extends OptimizeOptions)

| Field | Default | Description |
|-------|---------|-------------|
| `memory` | `10` | Number of correction pairs to store |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `lbfgs` | `(f, x0, grad?, options?) → OptimizeResult` | Minimize using L-BFGS |

## Test Vectors

@provenance: mathematical-definition

| Function | Starting Point | Gradient | Expected |
|----------|---------------|----------|----------|
| Sphere | [5, 5] | analytic | converged=true, fun≈0 (tol 1e-8), x≈[0,0] |
| Booth | [0, 0] | analytic | converged=true, fun≈0 (tol 1e-8), x≈[1,3] |
| Sphere | [5, 5] | (none/FD) | converged=true, fun≈0 (tol 1e-6) |

@provenance: optim.jl OptimTestProblems v2.0.0

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Rosenbrock | [-1.2, 1.0] | converged=true, fun < 1e-10, x≈[1,1] |

@provenance: mathematical-definition (Beale 1958)

| Function | Expected |
|----------|----------|
| Beale from [0, 0] | converged=true, fun < 1e-8 |

@provenance: mathematical-definition (Himmelblau 1972)

| Function | Expected |
|----------|----------|
| Himmelblau from [0, 0] | converged=true, fun < 1e-8, x close to one of four minima |

@provenance: mathematical-definition (Goldstein & Price 1971)

| Function | Expected |
|----------|----------|
| Goldstein-Price from [0, -0.5] | converged=true, fun≈3 |

### Custom memory

| Test | Expected |
|------|----------|
| Rosenbrock with memory=3 | converged=true, fun < 1e-6 |

### Cross-library validated vectors

@provenance: scipy.optimize.minimize v1.17.0, method='L-BFGS-B', jac=analytic
Empirically verified 2026-02-01 (Python 3, numpy 2.4.2).

| Function | scipy f | scipy nit | Our f | Our iter | Agreement |
|----------|---------|-----------|-------|----------|-----------|
| Sphere | 7.73e-29 | 2 | 0.0 | 1 | Both ≈ 0 |
| Booth | 1.14e-12 | 5 | 8.57e-19 | 9 | Both ≈ 0 |
| Rosenbrock | 2.81e-12 | 36 | 5.71e-22 | 35 | Both ≈ 0 |
| Beale | 4.95e-16 | 13 | 2.24e-19 | 10 | Both ≈ 0 |
| Himmelblau | 1.13e-14 | 10 | 5.39e-19 | 11 | Both → (3,2) |
| Goldstein-Price | 3.00 | 11 | 3.00 | 12 | Both → (0,-1) |

Note: scipy uses L-BFGS-B (bounded variant) with slightly different internals.
Both use memory=10 by default.

@provenance: optim.jl v2.0.0 (documented, not empirically run)
- L-BFGS is Optim.jl's default for gradient problems. Uses HagerZhang line search.
- Memory default = 10 (same as ours and scipy).

### Behavioral tests

| Test | Expected |
|------|----------|
| Already at minimum [0,0] on Sphere | converged=true, iterations=0 |
| maxIterations=2, impossible tolerance | converged=false, message contains "maximum iterations" |
