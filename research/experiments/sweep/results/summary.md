# Language Sweep Experiment: Results Summary

**Date:** 2026-02-03
**Total runs:** 30 (27 Sonnet 4.5, 3 Opus 4.5)
**Skills tested:** optimization, math-expression-parser, when-words
**Languages tested:** Python, Rust, Go, C#, Kotlin, C++, Swift, TypeScript

---

## Overall Results

- **30/30 runs reached 100% test pass** (all tests green after iteration)
- **10/30 achieved perfect first pass** (100% on first attempt)
- **Average first-pass rate:** 92.2%
- **Average iterations to green:** 1.8
- **External dependencies introduced:** 0 (across all 30 runs)

---

## Full Results Table

| Run | Skill | Size | Lang | Model | Tests | 1st Pass | Rate | Iters | Hints |
|-----|-------|------|------|-------|-------|----------|------|-------|-------|
| opt-small-python | opt | small | Python | S4.5 | 38 | 37/38 | 97.4% | 2 | Y |
| opt-small-rust | opt | small | Rust | S4.5 | 33 | 32/33 | 97.0% | 3 | Y |
| opt-small-go | opt | small | Go | S4.5 | 51 | 50/51 | 98.0% | 2 | Y |
| opt-small-csharp | opt | small | C# | S4.5 | 35 | 35/35 | 100.0% | 1 | N |
| opt-small-kotlin | opt | small | Kotlin | S4.5 | 35 | 32/35 | 91.4% | 2 | N |
| opt-small-cpp | opt | small | C++ | S4.5 | 30 | 29/30 | 96.7% | 3 | N |
| opt-small-swift | opt | small | Swift | S4.5 | 39 | 36/39 | 92.3% | 2 | N |
| opt-small-typescript | opt | small | TS | S4.5 | 42 | 41/42 | 97.6% | 2 | N |
| opt-medium-python | opt | medium | Python | S4.5 | 54 | 46/54 | 85.2% | 2 | Y |
| opt-medium-rust | opt | medium | Rust | S4.5 | 52 | 43/52 | 82.7% | 2 | Y |
| opt-medium-go | opt | medium | Go | S4.5 | 62 | 62/62 | 100.0% | 1 | Y |
| opt-medium-csharp | opt | medium | C# | S4.5 | 60 | 0/60 | 0.0% | 4 | N |
| opt-medium-kotlin | opt | medium | Kotlin | S4.5 | 49 | 47/49 | 95.9% | 3 | N |
| opt-medium-cpp | opt | medium | C++ | S4.5 | 48 | 38/48 | 79.2% | 2 | N |
| opt-large-python | opt | large | Python | S4.5 | 100 | 100/100 | 100.0% | 1 | Y |
| opt-large-rust | opt | large | Rust | S4.5 | 93 | 93/93 | 100.0% | 1 | Y |
| opt-large-go | opt | large | Go | S4.5 | 93 | 90/93 | 96.8% | 1 | Y |
| opt-large-csharp | opt | large | C# | S4.5 | 41 | 41/41 | 100.0% | 1 | N |
| opt-full-python | opt | full | Python | S4.5 | 182 | 174/182 | 95.6% | 2 | Y |
| opt-full-rust | opt | full | Rust | S4.5 | 161 | 154/161 | 95.7% | 2 | Y |
| opt-full-csharp | opt | full | C# | S4.5 | 126 | 123/126 | 97.6% | 2 | N |
| mathexpr-csharp | mathexpr | full | C# | S4.5 | 83 | 83/83 | 100.0% | 1 | N |
| mathexpr-kotlin | mathexpr | full | Kotlin | S4.5 | 83 | 83/83 | 100.0% | 2 | N |
| mathexpr-cpp | mathexpr | full | C++ | S4.5 | 25 | 25/25 | 100.0% | 1 | N |
| whenwords-csharp | whenwords | full | C# | S4.5 | 122 | 107/122 | 87.7% | 2 | N |
| whenwords-kotlin | whenwords | full | Kotlin | S4.5 | 14 | 14/14 | 100.0% | 1 | N |
| whenwords-cpp | whenwords | full | C++ | S4.5 | 122 | 122/122 | 100.0% | 1 | N |
| opt-medium-python | opt | medium | Python | **O4.5** | 65 | 63/65 | 96.9% | 2 | Y |
| opt-medium-csharp | opt | medium | C# | **O4.5** | 58 | 50/58 | 86.2% | 2 | N |
| opt-medium-cpp | opt | medium | C++ | **O4.5** | 57 | 55/57 | 96.5% | 2 | N |

---

## Analysis: By Language

Average first-pass rate and iterations across all Sonnet 4.5 runs per language:

| Language | Runs | Avg 1st-Pass | Avg Iters | Notes |
|----------|------|-------------|-----------|-------|
| Go | 3 | **98.3%** | **1.3** | Best overall — 100% on medium |
| TypeScript | 1 | 97.6% | 2.0 | Degenerate case (same-language) |
| Kotlin | 4 | 96.8% | 2.0 | Strong despite no hints |
| C++ | 4 | 94.0% | 1.8 | Solid across skills |
| Python | 4 | 94.5% | 1.8 | Good with hints |
| Rust | 4 | 93.8% | 2.0 | Good with hints |
| Swift | 1 | 92.3% | 2.0 | Only small subgraph tested |
| C# | 6 | 80.9% | 1.8 | Dragged down by medium compile error |

**C# outlier:** The opt-medium-csharp Sonnet run had a 0% first pass due to a compilation error (`??` operator on method group). Excluding this outlier, C# averages 97.1% — competitive with all other languages.

---

## Analysis: By Subgraph Size (Optimization, Sonnet only)

| Size | Nodes | Runs | Avg 1st-Pass | Avg Iters |
|------|-------|------|-------------|-----------|
| Small (Nelder-Mead) | 3 | 8 | 96.3% | 2.1 |
| Medium (BFGS) | 5 | 6 | 73.8%* | 2.3 |
| Large (Constrained) | 9 | 4 | **99.2%** | **1.0** |
| Full | 21 | 3 | 96.3% | 2.0 |

*Medium average includes the C# compile-error outlier (0%). Excluding it: 88.6%.

**Key finding:** First-pass rate does NOT degrade with subgraph size. Large (9 nodes) and Full (21 nodes) perform as well or better than Small (3 nodes). The spec-driven translation approach scales.

---

## Analysis: Sonnet 4.5 vs Opus 4.5

Direct comparison on the same subgraph (medium BFGS, 5 nodes):

| Language | Sonnet 1st-Pass | Opus 1st-Pass | Sonnet Iters | Opus Iters | Sonnet Tests | Opus Tests |
|----------|----------------|---------------|-------------|------------|-------------|------------|
| Python | 85.2% | **96.9%** | 2 | 2 | 54 | 65 |
| C# | 0.0% | **86.2%** | 4 | 2 | 60 | 58 |
| C++ | 79.2% | **96.5%** | 2 | 2 | 48 | 57 |

**Opus 4.5 consistently outperforms Sonnet 4.5 on first-pass rate** by 10-86 percentage points on the same subgraph. The C# gap is extreme (compile error vs working). Opus also generates more tests (65 vs 54 for Python, 57 vs 48 for C++).

However, both models reach 100% after iteration, and Opus costs ~67% more per token.

---

## Analysis: Cross-Skill Consistency (C#, Kotlin, C++)

| Language | Optimization | Math-Expression-Parser | When-Words |
|----------|-------------|----------------------|------------|
| C# | 80.9% avg | 100% | 87.7% |
| Kotlin | 93.7% avg | 100% | 100% |
| C++ | 87.9% avg | 100% | 100% |

Math-expression-parser achieves 100% first-pass across all three languages — it's the most spec-friendly skill (pure transformations, no floating-point edge cases). When-words is also strong. Optimization is the hardest due to numerical tolerances.

---

## Common Failure Patterns

1. **Floating-point tolerances** (most common): Central difference tests at `1e-10` tolerance marginally fail due to platform-specific `cbrt(epsilon)` rounding. Fix: relax to `1e-9`.

2. **C# `double.Epsilon`**: C# `double.Epsilon` is `5e-324` (smallest subnormal), not IEEE machine epsilon `2.22e-16`. Every C# run that uses finite differences encounters this.

3. **Beale gradient test vectors**: The spec lists gradient at `[1,1]` as `[-1.5, 5.25]`, but the actual analytic gradient is `[0, 27.75]`. Multiple runs independently discovered and fixed this.

4. **Goldstein-Price starting point**: Starting at `[0, -0.5]` converges to a local minimum. Fix: use `[-0.1, -0.9]`. This is now documented in hints.

5. **Fminbox boundary convergence**: The log-barrier method approaches but doesn't precisely reach boundary solutions. Tests asserting `converged = true` at boundaries consistently fail. The TypeScript reference doesn't assert convergence at boundaries either.

6. **Compilation errors (C# only)**: Null-coalescing operator `??` on method groups requires wrapping in lambda. One-time fix but blocks all tests.

---

## Key Takeaways

1. **The SKILL format scales**: 21-node full translations achieve 95-98% first-pass rates, comparable to 3-node translations.

2. **All 30 runs reach green**: Every translation eventually passes all tests within 1-4 iterations. Zero runs were abandoned.

3. **Hints help but aren't required**: Unhinted languages (C#, Kotlin, C++) achieve comparable rates to hinted languages (Python, Rust, Go). The spec alone is sufficient.

4. **Go is the easiest target**: 98.3% average first-pass, 1.3 average iterations. Strong type system + simple semantics.

5. **Opus improves first-pass quality**: +10-86% vs Sonnet on the same task, but at 67% higher cost. Both reach 100% after iteration.

6. **Zero external dependencies**: All 30 runs produce zero-dependency translations (test frameworks excluded).
