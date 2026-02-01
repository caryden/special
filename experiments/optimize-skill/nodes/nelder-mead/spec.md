# nelder-mead — Spec

Depends on: `vec-ops`, `result-types`

## Purpose

Derivative-free simplex optimizer. Maintains n+1 vertices in n dimensions.
At each step, replaces the worst vertex via reflection, expansion, contraction,
or shrinkage.

## Parameters

@provenance: Standard values universal across scipy, MATLAB, Optim.jl

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| alpha | α | 1.0 | Reflection coefficient |
| gamma | γ | 2.0 | Expansion coefficient |
| rho | ρ | 0.5 | Contraction coefficient |
| sigma | σ | 0.5 | Shrink coefficient |
| initialSimplexScale | — | 0.05 | Edge length scale: `h = scale × max(|xᵢ|, 1)` |

## Algorithm

@provenance: Nelder & Mead 1965, matching scipy.optimize.minimize(method='Nelder-Mead')

1. Create initial simplex: vertex 0 = x₀, vertex i = x₀ + h·eᵢ
2. Sort vertices by function value (ascending)
3. Check convergence: function value spread (std dev < funcTol) or simplex diameter < stepTol
4. Compute centroid of all vertices except worst
5. **Reflect** worst through centroid. Accept if between best and second-worst.
6. If reflection is best → try **expansion**. Accept better of expanded/reflected.
7. If reflection is worst → **contraction** (outside if fReflected < fWorst, inside otherwise)
8. If contraction fails → **shrink** all vertices toward best
9. Repeat from step 2

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `nelderMead` | `(f, x0, options?) → OptimizeResult` | Minimize using Nelder-Mead |

Returns `OptimizeResult` with `gradient: null` and `gradientCalls: 0`.

## Test Vectors

@provenance: mathematical-definition

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Sphere | [5, 5] | converged=true, fun≈0 (tol 1e-6), x≈[0,0] |
| Booth | [0, 0] | converged=true, fun≈0 (tol 1e-6), x≈[1,3] |
| Beale | [0, 0] | converged=true, fun < 1e-6 (may need 5000 iter) |

@provenance: optim.jl OptimTestProblems v2.0.0

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Rosenbrock | [-1.2, 1.0] | converged=true, fun < 1e-6, x≈[1,1] (needs 5000 iter, tight tol) |

@provenance: mathematical-definition (Himmelblau 1972)

| Function | Starting Point | Expected |
|----------|---------------|----------|
| Himmelblau | [0, 0] | converged=true, fun < 1e-6, x close to one of four known minima |

### Behavioral tests

| Test | Expected |
|------|----------|
| respects maxIterations=5 on Rosenbrock | iterations ≤ 5, converged=false |
| gradientCalls always 0 | gradientCalls=0 for any run |
