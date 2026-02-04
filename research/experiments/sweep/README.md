# Language Sweep Experiment

## What This Is

A systematic evaluation of the SKILL format's ability to translate verified TypeScript
reference implementations into native code across 8 programming languages, 4 subgraph
sizes, 3 skills, and 2 models. The experiment ran 30 independent translation tasks
using Claude Code Task agents, each producing a complete implementation with tests
from scratch — no scaffolding, no templates, no human intervention.

The core question: **does spec-driven translation scale?** Specifically, can an LLM
produce correct, zero-dependency code in an unfamiliar language from behavioral specs
and test vectors alone — and does this hold as the codebase grows from 150 lines
(3 nodes) to 3,000+ lines (21 nodes)?

**Full results:** [results/summary.md](results/summary.md)

---

## Experiment Design

### Matrix: 30 runs across 6 tiers

| Tier | Focus | Runs | Subgraph | Nodes | Languages | Model |
|------|-------|------|----------|-------|-----------|-------|
| 1 | Language sweep | 8 | Nelder-Mead | 3 | Py, Rs, Go, C#, Kt, C++, Swift, TS | Sonnet 4.5 |
| 2 | Medium subgraph | 6 | BFGS | 5 | Py, Rs, Go, C#, Kt, C++ | Sonnet 4.5 |
| 3 | Large subgraph | 4 | Constrained | 9 | Py, Rs, Go, C# | Sonnet 4.5 |
| 4 | Cross-skill | 6 | mathexpr + when-words | 5-6 | C#, Kt, C++ | Sonnet 4.5 |
| 5 | Opus quality ceiling | 3 | BFGS | 5 | Py, C#, C++ | Opus 4.5 |
| 6 | Full optimization | 3 | All | 21 | Py, Rs, C# | Sonnet 4.5 |

### Skills tested

| Skill | Nodes | Tests | Nature |
|-------|-------|-------|--------|
| optimization | 21 | 539 | Numerical algorithms with floating-point edge cases |
| math-expression-parser | 6 | 96 | Pure transformations, parsing, AST manipulation |
| when-words | 5 | 124 | String processing, pluralization, time formatting |

### Variables

- **Languages:** Python, Rust, Go, C#, Kotlin, C++, Swift, TypeScript
- **Subgraph sizes:** 3 nodes (~150 impl lines) → 5 → 9 → 21 (~3,000+ lines)
- **Hint availability:** Python, Rust, Go have `to-<lang>.md` hints; C#, Kotlin,
  C++, Swift do not (natural ablation)
- **Models:** Sonnet 4.5 (27 runs) vs Opus 4.5 (3 runs on identical tasks)

### Methodology

Each run followed the same workflow:
1. Read the SKILL.md for the target skill
2. For each node in dependency order: read spec.md, read to-<lang>.md hints if
   available, consult the TypeScript reference only when the spec was ambiguous
3. Generate implementation and tests in the target language
4. Run tests; if failures, iterate (up to 10 iterations)
5. Record first-pass rate, iteration count, and failure details

Constraint: **zero external dependencies** — only the language's standard library
plus a test framework.

---

## Results

### Headline Numbers

| Metric | Value |
|--------|-------|
| Runs reaching 100% tests | **30/30** |
| Perfect first pass (100% on first try) | 10/30 |
| Average first-pass rate | 92.2% |
| Average iterations to green | 1.8 |
| External dependencies introduced | 0 |

Every translation eventually passes all tests. No run was abandoned.

### By Language (Sonnet 4.5 only)

| Language | Runs | Avg 1st-Pass | Avg Iters | Notes |
|----------|------|-------------|-----------|-------|
| Go | 3 | **98.3%** | **1.3** | Best overall — 100% on medium |
| TypeScript | 1 | 97.6% | 2.0 | Same-language baseline |
| Kotlin | 4 | 96.8% | 2.0 | Strong despite no hints |
| C++ | 4 | 94.0% | 1.8 | Solid across all 3 skills |
| Python | 4 | 94.5% | 1.8 | Good with hints |
| Rust | 4 | 93.8% | 2.0 | Good with hints |
| Swift | 1 | 92.3% | 2.0 | Only small subgraph tested |
| C# | 6 | 80.9%* | 1.8 | *Dragged down by one compile-error outlier |

*Excluding the C# outlier (0% due to `??` on method group compile error), C# averages 97.1%.

### By Subgraph Size (Optimization, Sonnet only)

| Size | Nodes | Runs | Avg 1st-Pass | Avg Iters |
|------|-------|------|-------------|-----------|
| Small | 3 | 8 | 96.3% | 2.1 |
| Medium | 5 | 6 | 73.8%* | 2.3 |
| Large | 9 | 4 | **99.2%** | **1.0** |
| Full | 21 | 3 | 96.3% | 2.0 |

*Medium includes the C# compile-error outlier. Excluding it: 88.6%.

### Sonnet 4.5 vs Opus 4.5 (Same Tasks)

| Language | Sonnet 1st-Pass | Opus 1st-Pass | Delta |
|----------|----------------|---------------|-------|
| Python | 85.2% | **96.9%** | +11.7 |
| C# | 0.0% | **86.2%** | +86.2 |
| C++ | 79.2% | **96.5%** | +17.3 |

Opus consistently outperforms on first-pass rate, but both reach 100% after iteration.

---

## Conclusions

### 1. Spec-driven translation scales

This is the central finding. First-pass rates do not degrade with codebase size:

- 3-node translations (150 lines): 96.3% first-pass
- 21-node translations (3,000+ lines): 96.3% first-pass

The SKILL format's layered architecture — SKILL.md → spec.md → to-lang.md → reference
source — gives the model enough context to produce correct code at scale. Dependency
ordering ensures each node can be translated in isolation, and behavioral specs with
test vectors provide unambiguous contracts.

### 2. Sonnet 4.5 is sufficient for production use

Every Sonnet run reaches green. The average first-pass rate of 92.2% means most
translations need only 1-2 fix iterations — typically relaxing a tolerance or fixing
a platform-specific constant. Opus improves first-pass quality (+10-86%) but at 67%
higher cost, and the improvement only saves 1-2 iterations that Sonnet would have
caught anyway. The practical recommendation: **use Sonnet as the default, reserve
Opus as a fallback for runs that fail outright** (e.g., compile errors).

### 3. Hints help but aren't required

The experiment includes a natural ablation: Python, Rust, and Go have `to-<lang>.md`
translation hints; C#, Kotlin, C++, and Swift do not. Unhinted languages achieve
comparable first-pass rates (C# outlier aside). The spec alone is sufficient for
correct translation. Hints primarily prevent known platform-specific pitfalls
(like C#'s `double.Epsilon`) rather than providing essential algorithmic guidance.

### 4. Language choice matters less than expected

Go is the best target (98.3%), and the gap between Go and the median language is
only ~4 percentage points. Every tested language — including C++ and Swift, which
have no translation hints — produces working code within 1-3 iterations. The SKILL
format is genuinely language-agnostic.

### 5. Failure patterns are systematic, not random

The same 5-6 issues recur across independent runs:

| Pattern | Frequency | Root Cause |
|---------|-----------|------------|
| Floating-point tolerance | Most common | Platform-specific `cbrt(epsilon)` rounding |
| C# `double.Epsilon` | Every C# run | C# constant is `5e-324`, not machine epsilon |
| Beale gradient vectors | 4+ runs | Spec had wrong test vector at `[1,1]` |
| Goldstein-Price start | Several L-BFGS runs | `[0, -0.5]` hits local minimum |
| Fminbox boundary convergence | Every fminbox run | Log-barrier doesn't reach exact boundary |
| C# `??` on method group | 1 run | Requires lambda wrapping |

These are **fixable in the specs and hints**, not fundamental limitations. After this
experiment, corrections have been applied to the affected specs (`finite-diff/spec.md`,
`test-functions/spec.md`, `fminbox/spec.md`) and C# translation hints have been created.
Future translations should see higher first-pass rates.

### 6. Cross-skill consistency validates the format

C#, Kotlin, and C++ were tested across all three skills:

| Language | Optimization | Math-Expression-Parser | When-Words |
|----------|-------------|----------------------|------------|
| C# | 80.9%* | 100% | 87.7% |
| Kotlin | 93.7% | 100% | 100% |
| C++ | 87.9% | 100% | 100% |

Math-expression-parser achieves 100% across all three languages — pure transformations
with no floating-point edge cases are trivially translatable. The SKILL format works
across different problem domains, not just numerical optimization.

### 7. Zero external dependencies is achievable at scale

All 30 runs — including 21-node full-library translations with matrix operations,
Cholesky decomposition, and interior-point methods — produce zero-dependency code.
The only imports are the language's standard library and a test framework. This
validates the skill's design principle that reference implementations should avoid
metaprogramming and dynamic dispatch.

---

## Output Structure

```
runs/<run-id>/
  test-results.json  — Standardized test metrics
  test-output.txt    — Raw test runner output
  src/               — Generated source files

results/
  summary.md         — Full results table and analysis
```

### Run ID Convention

```
{skill-abbrev}-{subgraph}-{language}-{model}
```

Examples: `opt-small-python-sonnet45`, `mathexpr-full-kotlin-sonnet45`, `opt-medium-csharp-opus45`

## Execution

Individual runs were executed as Claude Code Task agents, 3-4 in parallel per batch.
Each agent received the skill name, node list, target language, and output directory,
then followed the skill's translation workflow autonomously.
