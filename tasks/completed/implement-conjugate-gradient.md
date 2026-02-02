# Task: Implement Conjugate Gradient

**Depends on:** hager-zhang (for line search), vec-ops, result-types, finite-diff
**Blocks:** (nothing directly)
**Status:** Completed 2026-02-01

## Context

Conjugate Gradient is Tier 1 in our survey — present in 4 libraries (scipy CG, Ceres NL-CG,
dlib PR, Optim.jl HZ). We already have Optim.jl CG cross-validation data from the Julia
validation (all 6 functions converge).

CG is the standard choice between gradient descent (too slow) and BFGS (too much memory for
large problems). It uses O(n) memory vs BFGS's O(n²).

## Algorithm

Nonlinear Conjugate Gradient (Hager-Zhang variant, matching Optim.jl):

1. d₀ = -g₀ (initial direction = negative gradient)
2. Line search along d_k to find alpha_k
3. x_{k+1} = x_k + alpha_k * d_k
4. Compute beta_k using Hager-Zhang formula (HZ variant)
5. d_{k+1} = -g_{k+1} + beta_k * d_k
6. Restart (reset d = -g) every n iterations or when directions become non-conjugate

### Beta formulas (for reference)

| Variant | Formula | Used by |
|---------|---------|---------|
| Fletcher-Reeves | g_{k+1}·g_{k+1} / g_k·g_k | Classic |
| Polak-Ribière | g_{k+1}·(g_{k+1}-g_k) / g_k·g_k | scipy (with +) |
| Hager-Zhang | (y_k - 2*d_k*(‖y_k‖²/d_k·y_k)) · g_{k+1} / (d_k·y_k) | Optim.jl |

We'll implement Hager-Zhang beta to match Optim.jl. Polak-Ribière+ can be a future addition.

## Implementation Plan

1. New file `conjugate-gradient.ts`
2. Uses HagerZhang line search (new node) by default, Strong Wolfe as fallback
3. Hager-Zhang beta formula with eta parameter for guaranteed descent
4. Restart every n iterations
5. Add `"conjugate-gradient"` to minimize.ts Method type and dispatcher

## Acceptance Criteria

- [ ] `conjugateGradient()` implemented with ~15 tests
- [ ] Converges on all 6 test functions with analytic gradient
- [ ] Cross-validated against Optim.jl CG results (already have data)
- [ ] Registered in minimize.ts dispatcher
- [ ] 100% line and function coverage
- [ ] spec.md and to-lang hints created
