# Issue: nelder-mead spec ambiguity — std dev uses population variance (÷ n+1)

## Context

During translation of the nelder-mead subset to Python, Rust, and Go (3 independent
agents), all three consulted the TypeScript reference to determine whether the simplex
function value spread uses population standard deviation (÷ n+1) or sample standard
deviation (÷ n).

## Current spec language

From `nodes/nelder-mead/spec.md`:

> Check convergence: function value spread (std dev < funcTol) or simplex diameter < stepTol

The `to-python.md` hint says:

> Standard deviation: `(sum((fv - mean)**2 for fv in f_values) / (n+1)) ** 0.5`

The Python hint specifies `/ (n+1)` but the spec itself doesn't. The Rust and Go
hints don't mention the formula at all.

## What the reference does

```typescript
// nelder-mead.ts:108-113
const fMean = fValues.reduce((s, v) => s + v, 0) / (n + 1);
let fStd = 0;
for (const fv of fValues) {
  fStd += (fv - fMean) ** 2;
}
fStd = Math.sqrt(fStd / (n + 1));
```

Population std dev: divide by n+1 (number of simplex vertices), not n.

## Why it matters

For a 2D problem (n=2, 3 vertices), the difference between ÷3 and ÷2 is a factor
of ~1.22 in the std dev value. This could cause convergence to trigger at different
iterations depending on which formula is used. With very tight tolerances (funcTol=1e-12),
this rarely changes the final result but does affect iteration counts.

## Suggested fix

In `nodes/nelder-mead/spec.md`, step 3, add the explicit formula:

> Check convergence:
> - Function spread: `fStd = sqrt(Σ(fᵢ - f̄)² / (n+1))` where n+1 is the vertex count.
>   Converged when fStd < funcTol.
> - Simplex diameter: max infinity-norm distance from best vertex to any other vertex.
>   Converged when diameter < stepTol.

Also add the formula to `to-rust.md` and `to-go.md` hints (currently only in `to-python.md`).

## Evidence

- 3/3 translation agents consulted reference for this (2 explicitly cited this ambiguity)
- Experiment: `experiments/optimize-skill-nelder-mead-experiment.md`

## Labels

`spec-ambiguity`, `optimize-skill`, `translation-feedback`
