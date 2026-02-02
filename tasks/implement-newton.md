# Task: Implement Newton's Method

**Depends on:** finite-hessian, vec-ops, result-types, line-search
**Blocks:** (nothing directly)
**Status:** Completed 2026-02-01

## Context

Newton's method uses the exact (or approximate) Hessian to compute search directions:
d = -H⁻¹ g. It converges quadratically near a minimum, vs superlinear for BFGS.

Available in scipy (Newton-CG), Optim.jl (Newton), and dlib.

## Algorithm

1. Compute gradient g_k and Hessian H_k at x_k
2. Solve H_k * d = -g_k for the Newton direction d
3. Line search along d to find step size alpha
4. x_{k+1} = x_k + alpha * d
5. Check convergence

### Linear solve

For 2D problems: direct 2×2 solve (Cramer's rule or elimination).
For n-D: Cholesky factorization (if H is positive definite) or LDL.
If H is not positive definite: add regularization (modified Newton).

### Modified Newton

When the Hessian is not positive definite (near a saddle point), add
a multiple of the identity: (H + tau*I) * d = -g, choosing tau to make
the modified Hessian positive definite.

## Implementation Plan

1. New file `newton.ts`
2. Requires gradient function (no finite-diff fallback for Newton — too expensive)
3. Optional Hessian function; uses finite-diff Hessian if not provided
4. Small matrix solver (Cholesky for n<=10, with regularization fallback)
5. Wolfe line search for globalization
6. Add `"newton"` to minimize.ts

## Acceptance Criteria

- [ ] `newton()` implemented with ~15 tests
- [ ] Converges on all 6 test functions (with analytic gradient + Hessian)
- [ ] Converges with finite-diff Hessian on simpler functions
- [ ] Handles non-positive-definite Hessian gracefully
- [ ] Cross-validated against Optim.jl Newton()
- [ ] 100% line and function coverage
- [ ] spec.md and to-lang hints created
