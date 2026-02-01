# Experiment: Nelder-Mead Subset Translation (Skill → 3 Languages)

## Hypothesis

The skill-based progressive disclosure format enables correct, dependency-free
translation of a de-bundled algorithm subset. This tests two properties:

1. **Translation correctness**: Can an AI agent produce working code from skill
   specs + translation hints + TypeScript reference?
2. **Modularity / de-bundling**: Can a subset (3 of 10 nodes) be extracted cleanly
   without leaking dependencies on the other 7 nodes?

## Design

- **Source**: `optimize-skill` (skill.md + per-node spec.md + to-{lang}.md)
- **Reference**: `reference/optimize/src/*.ts` (available via progressive disclosure)
- **Subset**: "Just Nelder-Mead" — `vec-ops` + `result-types` + `nelder-mead`
- **Targets**: Python, Rust, Go
- **Model**: claude-opus-4-5-20251101 (subagent via Task tool)
- **Format**: Skill (progressive disclosure) — the canonical format going forward

## Results Summary

| Language | Tests | Passed | Failed | Runtime | Dependencies |
|----------|-------|--------|--------|---------|-------------|
| Python | 39 | 39 | 0 | 0.11s | None (stdlib only) |
| Rust | 38 | 38 | 0 | 0.01s | None (no crates) |
| Go | 31 | 31 | 0 | 0.009s | None (stdlib only) |

**All 108 tests pass across all three languages. Zero failures.**

## Progressive Disclosure Usage

All three agents followed the same workflow: skill.md → node specs → translation
hints → TypeScript reference (if needed).

| Reference File | Python | Rust | Go |
|----------------|--------|------|-----|
| vec-ops.ts | Not needed | Not needed | Consulted |
| result-types.ts | Consulted | Consulted | Consulted |
| nelder-mead.ts | Consulted | Consulted | Consulted |

**Key finding**: All three agents needed the TypeScript reference. The spec alone
was insufficient for three specific ambiguities:

### Ambiguity 1: Convergence check operator
The spec says "gradient norm below tolerance" but doesn't specify strict `<` vs `<=`.
The reference uses strict `<`. This affects boundary behavior.

### Ambiguity 2: Population vs sample standard deviation
The spec says "std dev < funcTol" for simplex convergence but doesn't specify
whether to divide by n+1 (population) or n (sample). Reference uses population (÷ n+1).

### Ambiguity 3: Contraction acceptance asymmetry
Outside contraction accepts with `<=` (`fContracted <= fReflected`) while inside
contraction accepts with strict `<` (`fContracted < fWorst`). The spec's natural
language doesn't distinguish these.

## De-bundling Result

**Clean extraction confirmed.** All three translations:
- Included only the 3 required nodes (vec-ops, result-types, nelder-mead)
- Had zero references to line-search, finite-diff, gradient-descent, bfgs, l-bfgs, or minimize
- Produced self-contained, single-file implementations with no external dependencies
- Correctly implemented Nelder-Mead without any gradient infrastructure

The node graph in skill.md clearly delineated the subset boundary.

## Spec Improvement Opportunities

Based on the ambiguities all three agents encountered, the nelder-mead spec could be
improved with:

1. Explicit `<` in convergence criteria: "Converged when fStd < funcTol (strict less-than)"
2. Explicit variance formula: "population std dev: sqrt(sum((fᵢ - mean)²) / (n+1))"
3. Explicit acceptance operators: "Accept outside contraction if fContracted ≤ fReflected;
   accept inside contraction if fContracted < fWorst"

These are documentation-level fixes, not algorithm changes.

## Comparison with mathexpr Experiments

| Dimension | mathexpr (previous) | optimize nelder-mead |
|-----------|-------------------|---------------------|
| Nodes translated | 5 (full library) | 3 (subset of 10) |
| Algorithm complexity | Parser + evaluator | Numerical optimizer |
| Formats tested | 3 (ref, prompt, skill) | 1 (skill only) |
| Models tested | 3 (opus, haiku, sonnet) | 1 (opus) |
| Languages | 3 | 3 |
| De-bundling tested? | No (always full lib) | **Yes** (3 of 10 nodes) |
| Reference needed? | — | Yes (3 ambiguities) |

## Conclusion

The skill format with progressive disclosure successfully produced correct
Nelder-Mead implementations in all three target languages. The de-bundling
hypothesis is confirmed — a subset can be extracted and translated independently.

The TypeScript reference was consulted by all agents, validating the progressive
disclosure design: specs provide the "what", translation hints provide the "how
in this language", and the reference provides the precise "exactly this behavior"
when specs are ambiguous. All three layers were needed.

## Files

```
experiments/
  optimize-skill-python/
    nelder_mead.py          — Python implementation (39 tests)
    test_nelder_mead.py     — Python tests
    RESULTS.md              — Per-language results
  optimize-skill-rust/
    src/lib.rs              — Rust implementation (38 tests)
    tests/test_nelder_mead.rs — Rust tests
    RESULTS.md
  optimize-skill-go/
    optimize.go             — Go implementation (31 tests)
    optimize_test.go        — Go tests
    RESULTS.md
```
