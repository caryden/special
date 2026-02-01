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

### Cross-library validated vectors

@provenance: scipy.optimize.minimize v1.17.0, method='Nelder-Mead'
Empirically verified 2026-02-01 (Python 3, numpy 2.4.2).

| Function | scipy f | scipy nit | Our f | Our iter | Agreement |
|----------|---------|-----------|-------|----------|-----------|
| Sphere | 1.48e-9 | 44 | 3.04e-12 | 54 | Both ≈ 0 |
| Booth | 2.50e-9 | 67 | 1.38e-12 | 58 | Both ≈ 0 |
| Rosenbrock | 8.18e-10 | 85 | 2.31e-12 | 126 | Both ≈ 0 |
| Beale | 5.53e-10 | 83 | 7.09e-13 | 61 | Both ≈ 0 |
| Himmelblau | 1.43e-8 | 81 | 5.12e-12 | 68 | Both → (3,2) |
| Goldstein-Price | 3.00 | 39 | 3.00 | 51 | Both → (0,-1) |

Note: Iteration counts differ significantly (±50%) due to different initial simplex
construction. Our simplex uses `h = 0.05 × max(|xᵢ|, 1)`. scipy uses a different
scheme. Both converge to the correct minima.

@provenance: optim.jl v2.0.0, empirically verified 2026-02-01 (Julia 1.10.7)

| Function | Optim.jl f | Optim.jl iter | Our f | Our iter | Agreement |
|----------|-----------|---------------|-------|----------|-----------|
| Sphere | 1.37e-9 | 37 | 3.04e-12 | 54 | Both ≈ 0 |
| Booth | 2.83e-10 | 44 | 1.38e-12 | 58 | Both ≈ 0 |
| Rosenbrock | 4.66e-9 | 78 | 2.31e-12 | 126 | Both ≈ 0 |
| Beale | 2.06e-9 | 53 | 7.09e-13 | 61 | Both ≈ 0 |
| Himmelblau | 3.02e-9 | 57 | 5.12e-12 | 68 | Both → (3,2) |
| Goldstein-Price | 3.00 | 35 | 3.00 | 51 | Both → (0,-1) |

Note: NelderMead parameters: α=1, β=2, γ=0.5, δ=0.5 (same as ours and scipy).
Initial simplex: AffineSimplexer with a=0.025, b=0.5 (different from ours).
Optim.jl converges in fewer iterations but to looser f values due to simplex construction.
Some functions skipped in Optim.jl's NM test suite: Large Polynomial, Extended Powell,
Paraboloid Diagonal, Extended Rosenbrock.

### Behavioral tests

| Test | Expected |
|------|----------|
| respects maxIterations=5 on Rosenbrock | iterations ≤ 5, converged=false |
| gradientCalls always 0 | gradientCalls=0 for any run |
