# Task: Implement Newton Trust Region

**Depends on:** finite-hessian, vec-ops, result-types
**Blocks:** (nothing directly)
**Status:** Completed 2026-02-01

## Context

Trust region methods are an alternative to line search for globalizing Newton's method.
Instead of finding a step size along a direction, they find the best step within a
radius (the "trust region").

Available in scipy (trust-ncg, trust-exact), Optim.jl (NewtonTrustRegion), and dlib.

## Algorithm

Trust Region Newton (Nocedal & Wright, Chapter 4):

1. Form quadratic model: m_k(p) = f_k + g_k'p + 0.5*p'*H_k*p
2. Solve trust region subproblem: min m_k(p) subject to ||p|| <= delta_k
3. Compute actual reduction ratio: rho = (f_k - f_{k+1}) / (m_k(0) - m_k(p))
4. Update trust region radius:
   - rho < 0.25: shrink delta (delta *= 0.25)
   - rho > 0.75 and ||p|| == delta: expand delta (delta *= 2)
   - otherwise: keep delta
5. Accept step if rho > eta (eta = 0.1 typical)

### Subproblem solver

For small n: eigenvalue-based (exact solve).
For large n: Steihaug-CG (truncated conjugate gradient within trust region).

For our reference, we'll implement the exact solve for small dimensions and
Steihaug-CG for general use.

## Implementation Plan

1. New file `newton-trust-region.ts`
2. Trust region subproblem solver (Cauchy point + dogleg or Steihaug-CG)
3. Adaptive trust region radius management
4. Requires gradient; optional Hessian (finite-diff fallback)
5. Add `"newton-trust-region"` to minimize.ts

## Acceptance Criteria

- [ ] `newtonTrustRegion()` implemented with ~15 tests
- [ ] Converges on all 6 test functions
- [ ] Handles indefinite Hessian (trust region naturally handles this)
- [ ] Cross-validated against Optim.jl NewtonTrustRegion()
- [ ] 100% line and function coverage
- [ ] spec.md and to-lang hints created
