# Task: Implement HagerZhang Line Search

**Depends on:** (none — leaf node, extends line-search)
**Blocks:** conjugate-gradient
**Status:** Completed 2026-02-01

## Context

Optim.jl's default line search is HagerZhang (Hager & Zhang, 2005). Our cross-validation
showed Optim.jl converges in fewer iterations than our Strong Wolfe on most test functions,
likely due to HagerZhang's better bracketing and secant-based interpolation.

Adding HagerZhang as an alternative line search will:
1. Close the gap with Optim.jl iteration counts
2. Provide the default line search for our new Conjugate Gradient node
3. Allow existing BFGS/L-BFGS to optionally use it

## Algorithm

HagerZhang line search (CG_DESCENT paper, Hager & Zhang 2005/2006):

1. **Bracket phase**: Find interval [a, b] containing a point satisfying approximate Wolfe
2. **Secant phase**: Use secant steps to narrow the bracket
3. **Bisection fallback**: If secant fails, bisect

Key parameters (Optim.jl defaults):
- delta = 0.1 (Wolfe sufficient decrease)
- sigma = 0.9 (Wolfe curvature)
- epsilon = 1e-6 (approximate Wolfe tolerance)
- theta = 0.5 (bisection ratio)
- gamma = 0.66 (bracket shrink factor)
- rho = 5.0 (bracket expansion factor)

## Implementation Plan

1. Add `hagerZhangLineSearch()` to `line-search.ts` (or new `hager-zhang.ts` node)
2. Same `LineSearchResult` return type as existing line searches
3. Tests: verify Wolfe conditions satisfied, compare with Strong Wolfe on test functions
4. Cross-validate iteration counts against Optim.jl

## Acceptance Criteria

- [ ] HagerZhang line search implemented with ~15 tests
- [ ] Returns same `LineSearchResult` type
- [ ] Satisfies approximate Wolfe conditions on all 6 test functions
- [ ] 100% line and function coverage
- [ ] spec.md and to-lang hints created
