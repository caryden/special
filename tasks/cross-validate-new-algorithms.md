# Task: Cross-Validate New Algorithms Against Optim.jl

**Depends on:** hager-zhang, brent-1d, conjugate-gradient, newton, newton-trust-region
**Blocks:** documentation updates
**Status:** Completed 2026-02-01

## Context

After implementing the Tier 1 algorithms, run them against Optim.jl to verify correctness
and document behavioral differences.

## Steps

### 1. Extend Julia validation script

Add to `scripts/julia-validation.jl`:
- Newton() on all 6 test functions (requires Hessian — use autodiff)
- NewtonTrustRegion() on all 6 test functions
- Brent() on 1D test functions
- CG with HagerZhang line search (already have this data)

### 2. Run our new implementations

Run all new methods on the same test functions and collect results.

### 3. Compare and document

For each new method, compare:
- Final f values (should agree within 1e-6)
- Minimizer locations (should agree within 1e-4)
- Iteration counts (document differences)
- Convergence status

### 4. Update artifacts

- Add new rows to CROSS-VALIDATION.md
- Add cross-validation tests to cross-validation.test.ts
- Update node spec files with provenance annotations

## Acceptance Criteria

- [ ] Julia validation extended with Newton, NewtonTR, Brent
- [ ] All new algorithms cross-validated (results match Optim.jl)
- [ ] CROSS-VALIDATION.md updated
- [ ] Cross-validation tests added
- [ ] All tests pass at 100% coverage
