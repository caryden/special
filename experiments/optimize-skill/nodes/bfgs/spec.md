# bfgs — Spec

Depends on: `vec-ops`, `result-types`, `line-search`, `finite-diff`

## Purpose

Full-memory BFGS quasi-Newton optimizer. Builds an inverse Hessian approximation
using gradient information from successive iterations. Much faster than gradient
descent on ill-conditioned problems (like Rosenbrock).

## Algorithm

@provenance: Nocedal & Wright, Numerical Optimization, Chapter 6 (Eq. 6.17)
@provenance: Wolfe line search required for positive-definite Hessian updates

1. Initialize H₀ = I (identity matrix, stored as n×n array of rows)
2. Evaluate f(x₀) and ∇f(x₀). Check if already at minimum.
3. Compute direction d = −H·∇f
4. **Strong Wolfe** line search to find step size α
5. Compute step sₖ = x_{k+1} − xₖ and gradient change yₖ = ∇f_{k+1} − ∇fₖ
6. **Curvature guard**: if yₖᵀsₖ ≤ 1e-10, skip Hessian update (prevents breakdown)
7. BFGS update: H_{k+1} = (I − ρsyᵀ)H(I − ρysᵀ) + ρssᵀ where ρ = 1/(yᵀs)
8. Check convergence. Repeat from step 3.

If no gradient function is provided, uses forward finite differences.

## Helper Functions

| Function | Description |
|----------|-------------|
| `identityMatrix(n)` | Create n×n identity as array of row arrays |
| `matVecMul(M, v)` | Matrix-vector product (M is array of rows) |
| `bfgsUpdate(H, s, y, rho)` | Apply BFGS inverse Hessian update formula |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `bfgs` | `(f, x0, grad?, options?) → OptimizeResult` | Minimize using BFGS |

## Test Vectors

@provenance: mathematical-definition

| Function | Starting Point | Gradient | Expected |
|----------|---------------|----------|----------|
| Sphere | [5, 5] | analytic | converged=true, fun≈0 (tol 1e-8), x≈[0,0], iterations < 20 |
| Booth | [0, 0] | analytic | converged=true, fun≈0 (tol 1e-8), x≈[1,3] |
| Sphere | [5, 5] | (none/FD) | converged=true, fun≈0 (tol 1e-6) |

@provenance: optim.jl OptimTestProblems v2.0.0

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Rosenbrock | [-1.2, 1.0] | converged=true, fun < 1e-10, x≈[1,1] |

@provenance: mathematical-definition (Beale 1958)

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Beale | [0, 0] | converged=true, fun < 1e-8, x≈[3, 0.5] |

@provenance: mathematical-definition (Himmelblau 1972)

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Himmelblau | [0, 0] | converged=true, fun < 1e-8, x close to one of four minima |

@provenance: mathematical-definition (Goldstein & Price 1971)

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Goldstein-Price | [0, -0.5] | converged=true, fun≈3 (tol 1e-4), x≈[0, -1] |

### Finite-diff gradient tests

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Rosenbrock (no grad) | [-1.2, 1.0] | fun < 1e-6, x≈[1,1] (may not formally converge due to FD noise) |

### Behavioral tests

| Test | Expected |
|------|----------|
| Returns gradient at solution | gradient is non-null, near-zero at Sphere minimum |
| maxIterations=3 on Rosenbrock | iterations ≤ 3 |
| Already at minimum [0,0] on Sphere | converged=true, iterations=0 |
| maxIterations=2, impossible tolerance | converged=false, message contains "maximum iterations" |
