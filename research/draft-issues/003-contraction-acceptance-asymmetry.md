# Issue: nelder-mead spec ambiguity — contraction acceptance uses asymmetric operators

## Context

During translation of the nelder-mead subset to Python, Rust, and Go (3 independent
agents), all three consulted the TypeScript reference to determine the exact acceptance
conditions for outside vs inside contraction. The operators are asymmetric (`<=` vs `<`)
which is not captured in the spec's natural language.

## Current spec language

From `nodes/nelder-mead/spec.md`:

> 7. If reflection is worst → **contraction** (outside if fReflected < fWorst, inside otherwise)

The branching condition for *choosing* outside vs inside is specified, but the
*acceptance* condition for each case is not:

- Outside contraction: the spec doesn't say when to accept vs reject
- Inside contraction: the spec doesn't say when to accept vs reject

## What the reference does

```typescript
// nelder-mead.ts:190-211

// Outside contraction
if (fReflected < fWorst) {
  const contracted = addScaled(centroid, sub(reflected, centroid), opts.rho);
  const fContracted = f(contracted);
  if (fContracted <= fReflected) {    // <-- less-than-or-equal
    simplex[n] = contracted;
    fValues[n] = fContracted;
    continue;
  }
} else {
  // Inside contraction
  const contracted = addScaled(centroid, sub(simplex[n], centroid), opts.rho);
  const fContracted = f(contracted);
  if (fContracted < fWorst) {          // <-- strict less-than
    simplex[n] = contracted;
    fValues[n] = fContracted;
    continue;
  }
}
```

The asymmetry:
- **Outside**: accept if `fContracted <= fReflected` (equal is good enough)
- **Inside**: accept if `fContracted < fWorst` (must strictly improve)

This matches the standard Nelder-Mead algorithm (Nelder & Mead 1965, also scipy's
implementation). The rationale: outside contraction is a "safer" move (closer to
the centroid from the reflected point), so equality is acceptable. Inside contraction
is riskier (staying near the worst point), so we require strict improvement.

## Suggested fix

In `nodes/nelder-mead/spec.md`, step 7, replace:

> If reflection is worst → **contraction** (outside if fReflected < fWorst, inside otherwise)

With:

> 7. If reflection ≥ second-worst → **contraction**:
>    - **Outside** (if fReflected < fWorst): xc = centroid + ρ(reflected − centroid).
>      Accept if fContracted **≤** fReflected. _(equal accepted)_
>    - **Inside** (if fReflected ≥ fWorst): xc = centroid + ρ(worst − centroid).
>      Accept if fContracted **<** fWorst. _(strict improvement required)_
> 8. If contraction rejected → **shrink** all vertices toward best.

## Evidence

- 3/3 translation agents consulted reference for this
- Experiment: `experiments/optimize-skill-nelder-mead-experiment.md`
- @provenance: Nelder & Mead 1965, confirmed in scipy source `optimize/_optimize.py`

## Labels

`spec-ambiguity`, `optimize-skill`, `translation-feedback`
