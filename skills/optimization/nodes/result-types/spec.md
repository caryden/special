# result-types — Spec

Depends on: _(none — leaf node)_

## Purpose

Shared types and convergence logic used by all optimization algorithms.

## Types

### OptimizeOptions

| Field | Type | Default | Provenance |
|-------|------|---------|------------|
| `gradTol` | number | `1e-8` | Matches Optim.jl `g_abstol`; scipy uses `1e-5`, MATLAB `1e-6` |
| `stepTol` | number | `1e-8` | Matches MATLAB; Optim.jl disables by default |
| `funcTol` | number | `1e-12` | Stricter than most; catches near-convergence stalls |
| `maxIterations` | number | `1000` | Matches Optim.jl; MATLAB uses 400 |

### OptimizeResult

| Field | Type | Description |
|-------|------|-------------|
| `x` | number[] | Solution vector (minimizer) |
| `fun` | number | Objective value at solution |
| `gradient` | number[] or null | Gradient at solution (null for derivative-free) |
| `iterations` | number | Iterations performed |
| `functionCalls` | number | Objective function evaluations |
| `gradientCalls` | number | Gradient evaluations |
| `converged` | boolean | Whether a convergence criterion was met |
| `message` | string | Human-readable termination reason |

### ConvergenceReason

Tagged union with kinds:
- `gradient` — gradient norm below tolerance
- `step` — step size below tolerance
- `function` — function change below tolerance
- `maxIterations` — hit iteration limit (NOT converged)
- `lineSearchFailed` — line search could not find acceptable step (NOT converged)

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `defaultOptions` | `(overrides?) → OptimizeOptions` | Create defaults with optional overrides |
| `checkConvergence` | `(gradNorm, stepNorm, funcChange, iteration, opts) → reason or null` | Check criteria in order: gradient → step → function → maxIterations |
| `isConverged` | `(reason) → boolean` | True for gradient/step/function; false for maxIterations/lineSearchFailed |
| `convergenceMessage` | `(reason) → string` | Human-readable message |

### Convergence comparison semantics

All convergence checks use **strict less-than** (`<`): a criterion is met when `value < tolerance`.
This means a value exactly equal to the tolerance does NOT trigger convergence — the algorithm
continues for at least one more iteration. This matches scipy and Optim.jl behavior.

## Test Vectors

| Test | Input | Expected |
|------|-------|----------|
| `defaultOptions()` | — | `{ gradTol: 1e-8, stepTol: 1e-8, funcTol: 1e-12, maxIterations: 1000 }` |
| `defaultOptions({ gradTol: 1e-4 })` | — | `{ gradTol: 1e-4, stepTol: 1e-8, ... }` |
| `checkConvergence(1e-9, 0.1, 0.1, 5, defaults)` | — | `{ kind: "gradient" }` (grad < 1e-8) |
| `checkConvergence(0.1, 1e-9, 0.1, 5, defaults)` | — | `{ kind: "step" }` |
| `checkConvergence(0.1, 0.1, 1e-13, 5, defaults)` | — | `{ kind: "function" }` |
| `checkConvergence(0.1, 0.1, 0.1, 1000, defaults)` | — | `{ kind: "maxIterations" }` |
| `checkConvergence(0.1, 0.1, 0.1, 5, defaults)` | — | `null` (no criterion met) |
| `isConverged({ kind: "gradient" })` | — | `true` |
| `isConverged({ kind: "maxIterations" })` | — | `false` |
| `isConverged({ kind: "lineSearchFailed" })` | — | `false` |

### Priority test

@provenance: Optim.jl convention — gradient is the primary convergence criterion.

When multiple criteria are met simultaneously, `checkConvergence` returns the
first match in order: gradient → step → function → maxIterations.
