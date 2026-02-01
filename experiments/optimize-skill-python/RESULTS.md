# Nelder-Mead Subset → Python: Translation Results

## Experiment

- **Source**: optimize-skill (progressive disclosure)
- **Subset**: Just Nelder-Mead (vec-ops + result-types + nelder-mead)
- **Target**: Python 3.11, no dependencies (no numpy/scipy)
- **Model**: claude-opus-4-5-20251101 (subagent)
- **Date**: 2026-02-01

## Results

| Metric | Value |
|--------|-------|
| Tests | **39 passed, 0 failed** |
| Runtime | 0.11s |
| Files generated | 2 (nelder_mead.py, test_nelder_mead.py) |
| External dependencies | None |

### Test Breakdown

| Category | Count |
|----------|-------|
| vec-ops test vectors | 15 (including 3 purity checks) |
| result-types test vectors | 8 (including priority test) |
| Optimization convergence | 5 (sphere, booth, beale, rosenbrock, himmelblau) |
| Behavioral tests | 3 (max_iterations, gradient_calls=0, gradient=None) |
| **Total** | **39** |

## Files Consulted (Progressive Disclosure)

| Step | File | Consulted? |
|------|------|-----------|
| 1 | skill.md | Yes |
| 2 | vec-ops/spec.md | Yes |
| 2 | result-types/spec.md | Yes |
| 2 | nelder-mead/spec.md | Yes |
| 3 | vec-ops/to-python.md | Yes |
| 3 | result-types/to-python.md | Yes |
| 3 | nelder-mead/to-python.md | Yes |
| 4 | reference nelder-mead.ts | **Yes** |
| 4 | reference result-types.ts | **Yes** |
| 4 | reference vec-ops.ts | No |

## TypeScript Reference Needed?

**Yes**, for two specific ambiguities:

1. **Convergence check operator**: Spec says "gradient norm below tolerance" but doesn't
   specify strict `<` vs `<=`. Reference uses strict `<`.

2. **Nelder-Mead convergence logic**: Spec describes convergence criteria but doesn't
   clarify that Nelder-Mead uses inline checks (not `checkConvergence`). The NM algorithm
   has its own convergence messages about "simplex function spread" and "simplex diameter"
   rather than routing through the shared convergence checker.

## De-bundling Observation

The subset extraction worked cleanly. Only 3 of 10 nodes were needed, and the
dependency graph (`nelder-mead` → `vec-ops`, `result-types`) was respected. No
references to line-search, finite-diff, or gradient-based methods leaked in.
