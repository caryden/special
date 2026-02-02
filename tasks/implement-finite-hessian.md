# Task: Implement Finite-Difference Hessian

**Depends on:** vec-ops, finite-diff
**Blocks:** newton, newton-trust-region
**Status:** Completed 2026-02-01

## Context

Newton and Newton Trust Region methods require the Hessian matrix (second derivatives).
When the user doesn't provide an analytic Hessian, we need finite-difference estimation.

This extends our existing `finite-diff` node with second-order approximation.

## Algorithm

Hessian estimation via central finite differences:

H_ij ≈ (f(x + h*e_i + h*e_j) - f(x + h*e_i - h*e_j) - f(x - h*e_i + h*e_j) + f(x - h*e_i - h*e_j)) / (4h²)

For diagonal elements:
H_ii ≈ (f(x + h*e_i) - 2*f(x) + f(x - h*e_i)) / h²

Cost: ~n² function evaluations for full Hessian (symmetric, so n*(n+1)/2 unique).

Step size: h = eps^(1/4) * max(|x_i|, 1) for optimal O(h²) error.

Alternative: Hessian-gradient product via finite differences of gradient
Hv ≈ (g(x + h*v) - g(x)) / h — useful for iterative solvers (CG-Newton).

## Implementation Plan

1. Add `finiteDiffHessian(f, x)` returning n×n matrix (number[][])
2. Add `hessianVectorProduct(grad, x, v)` for Hessian-free Newton
3. Exploit symmetry: only compute upper triangle
4. Tests: verify against analytic Hessians of test functions

## Acceptance Criteria

- [ ] `finiteDiffHessian()` implemented
- [ ] `hessianVectorProduct()` implemented
- [ ] Verified against analytic Hessians of Sphere, Rosenbrock, Booth
- [ ] 100% line and function coverage
- [ ] spec.md created
