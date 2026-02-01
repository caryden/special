# gradient-descent — Spec

Depends on: `vec-ops`, `result-types`, `line-search`, `finite-diff`

## Purpose

Steepest descent with backtracking line search. The simplest gradient-based
method: search direction d = −∇f. Serves as a baseline for BFGS/L-BFGS.

## Algorithm

@provenance: Standard steepest descent (Cauchy 1847)
@provenance: Backtracking line search from Nocedal & Wright, Algorithm 3.1

1. Evaluate f(x₀) and ∇f(x₀). Check if already at minimum (gradient norm < gradTol).
2. Set direction d = −∇f(x)
3. Backtracking line search to find step size α
4. Update x ← x + α·d
5. Check convergence (gradient, step, function change, max iterations)
6. Repeat from step 2

If no gradient function is provided, uses forward finite differences.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `gradientDescent` | `(f, x0, grad?, options?) → OptimizeResult` | Minimize using gradient descent |

## Test Vectors

@provenance: mathematical-definition

| Function | Starting Point | Gradient | Expected |
|----------|---------------|----------|----------|
| Sphere | [5, 5] | analytic | converged=true, fun≈0 (tol 1e-8), x≈[0,0] |
| Booth | [0, 0] | analytic | converged=true, fun≈0 (tol 1e-6), x≈[1,3] |
| Sphere | [5, 5] | (none/FD) | converged=true, fun≈0 (tol 1e-6) |

@provenance: optim.jl OptimTestProblems v2.0.0

| Function | Starting Point | Note |
|----------|---------------|------|
| Rosenbrock | [-1.2, 1.0] | GD is slow due to ill-conditioning. May need 10000 iterations. Check fun < f(start). |

### Behavioral tests

| Test | Expected |
|------|----------|
| At minimum [0,0] on Sphere | converged=true, iterations=0 |
| maxIterations=2, impossible tolerance, Rosenbrock | converged=false, message contains "maximum iterations" |
| Wrong gradient (points uphill) | converged=false, message contains "line search failed" |
