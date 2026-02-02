# Issue: nelder-mead spec ambiguity — convergence check uses strict `<` not `<=`

## Context

During translation of the nelder-mead subset to Python, Rust, and Go (3 independent
agents), all three consulted the TypeScript reference to resolve whether convergence
checks use strict less-than (`<`) or less-than-or-equal (`<=`).

## Current spec language

From `nodes/result-types/spec.md`:

> `checkConvergence(1e-9, 0.1, 0.1, 5, defaults)` → `{ kind: "gradient" }` (grad < 1e-8)

The test vector shows `<` in a parenthetical, but the prose says "below tolerance"
which is ambiguous.

From `nodes/nelder-mead/spec.md`:

> Check convergence: function value spread (std dev < funcTol) or simplex diameter < stepTol

Uses `<` in the algorithm description but not in a way that's clearly normative vs descriptive.

## What the reference does

```typescript
// result-types.ts:96
if (gradNorm < options.gradTol) {

// nelder-mead.ts:115
if (fStd < opts.funcTol) {

// nelder-mead.ts:135
if (diameter < opts.stepTol) {
```

All strict `<`. This matters at boundary values — `<=` would cause convergence
one iteration earlier when the value exactly equals the tolerance.

## Suggested fix

In `nodes/result-types/spec.md`, change the `checkConvergence` description to:

> Check criteria in order: gradient → step → function → maxIterations.
> All comparisons use **strict less-than** (`<`): converged when value < tolerance.

In `nodes/nelder-mead/spec.md`, step 3:

> Check convergence: function value spread (std dev **<** funcTol, strict) or
> simplex diameter (normInf **<** stepTol, strict)

## Evidence

- 3/3 translation agents consulted reference for this
- Experiment: `experiments/optimize-skill-nelder-mead-experiment.md`

## Labels

`spec-ambiguity`, `optimize-skill`, `translation-feedback`
