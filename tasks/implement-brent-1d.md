# Task: Implement Brent 1D Minimizer

**Depends on:** (none — standalone leaf node)
**Blocks:** (nothing directly)
**Status:** Completed 2026-02-01

## Context

Brent's method (1973) is the standard univariate minimization algorithm, available in
scipy (`brent`), Optim.jl (`Brent()`), and MATLAB (`fminbnd`). It combines golden section
search with parabolic interpolation for superlinear convergence.

This fills a gap: all our current methods are multivariate. Brent 1D is useful for:
1. Line search internals (1D subproblem)
2. Single-variable optimization problems
3. Parameter tuning / grid refinement

## Algorithm

Brent's method without derivatives:

1. Start with bracket [a, b] known to contain a minimum
2. Maintain three points: x (best), w (second best), v (previous w)
3. At each step, try parabolic interpolation through (v, w, x)
4. If parabolic step is acceptable (inside bracket, small enough), take it
5. Otherwise, fall back to golden section step
6. Converge when bracket width < tol

Key parameters:
- tol: convergence tolerance (default: sqrt(eps) ≈ 1.49e-8)
- maxIter: maximum iterations (default: 500)
- Golden ratio: (3 - sqrt(5)) / 2 ≈ 0.381966

## Implementation Plan

1. New file `brent-1d.ts` with `brent1d(f, a, b, options?)` function
2. Returns `{ x, fun, iterations, functionCalls, converged, message }`
3. Tests: standard 1D test functions (quadratic, abs, sin, Brent's own examples)
4. Cross-validate against scipy.optimize.brent and Optim.jl Brent()

## Acceptance Criteria

- [ ] `brent1d()` implemented with ~12 tests
- [ ] Handles edge cases: minimum at endpoint, flat regions, very narrow brackets
- [ ] 100% line and function coverage
- [ ] spec.md and to-lang hints created
- [ ] Cross-validated against scipy and Optim.jl
