# Whenwords Translation Experiment — Results

## Overview

This document records the results of translating the **whenwords** reference library
from three source formats into three target languages, testing the core hypothesis of
the Type-O project: that annotated reference implementations produce better agent
translations than less-structured source formats.

### Source Formats

| Format | Description | Content |
|--------|-------------|---------|
| **REF** | Type-O annotated TypeScript reference + colocated test suite | Implementation code, structured comments (`@node`, `@contract`, `@hint`), 124 test cases |
| **SPEC** | Markdown specification with test vectors | Behavioral description, threshold tables, unit mappings, 124 test vectors with expected values |
| **PROMPT** | Natural language description | Behavioral description, design intent, no test vectors |

### Target Languages

Python 3.11, Rust 1.93, Go 1.24. All available pre-installed in the environment.

### Methodology

- Model: claude-opus-4-5 (claude-opus-4-5-20251101)
- Each translation done by an independent sub-agent with only the source format as input
- Agents instructed: zero external dependencies, idiomatic target language, include tests
- SPEC and REF agents given exact test vectors; PROMPT agents designed their own tests
- Cross-validation: PROMPT implementations tested against the REF test vectors to measure
  behavioral divergence from the reference

---

## Results: Self-Test Pass Rate (M1)

"Do the agent's own tests pass?"

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 122/122 (100%) | 24/24 (100%) | 15/15 (100%) |
| **SPEC** | 122/122 (100%) | 14/14 (100%) | 129/129 (100%) |
| **PROMPT** | 95/95 (100%) | 43/43 (100%) | 104/104 (100%) |

All 9 implementations pass their own tests on the first attempt (M2 = 1 iteration for all).

**Note:** Test counts vary because each agent structured tests differently — table-driven
tests with subtests (Go), parametrized tests (Python), or loop-based assertions (Rust).
The underlying test vectors are equivalent for REF and SPEC.

## Results: REF Test Vector Compliance (Cross-Validation)

"Does the implementation match the reference behavior for all 124 test vectors?"

This is the critical metric. Self-tests passing means the code is internally consistent.
Cross-validation against the REF vectors measures whether the code matches the *intended*
behavior.

### Python Cross-Validation (116 REF vectors)

| Format | Passed | Failed | Rate |
|--------|--------|--------|------|
| **REF** | 116/116 | 0 | **100%** |
| **SPEC** | 116/116 | 0 | **100%** |
| **PROMPT** | 110/116 | 6 | **94.8%** |

### PROMPT-Python Failures

| Function | Input | Expected (REF) | Got (PROMPT) | Root Cause |
|----------|-------|-----------------|--------------|------------|
| `time_ago` | ts=1700179200 | "1 month ago" | "2 months ago" | Different threshold for month boundary (45d vs 40d) |
| `duration` | 2592000s | "1 month" | "30 days" | No month/year units — only days, hours, minutes, seconds |
| `duration` | 31536000s | "1 year" | "365 days" | Same — no year unit |
| `duration` | 36720000s | "1 year, 2 months" | "425 days" | Same — no year unit |
| `human_date` | ts=1704672000 | "January 8" | "Last Monday" | Wider "Last X" window (7 days vs 6 days) |
| `human_date` | ts=1705881600 | "January 22" | "This Monday" | Wider "This X" window (7 days vs 6 days) |

### Analysis

The PROMPT format produced implementations that are **reasonable but divergent**.
The natural language description said "about a week" for the `humanDate` day-name
window — the agent interpreted this as 7 days (inclusive) while the reference uses
6 days (exclusive). For `duration`, the prompt didn't specify month/year units
explicitly, so the agent made a valid design choice to cap at days.

These are exactly the kind of ambiguities the Type-O hypothesis predicts: without
precise specifications or test vectors, the agent fills in reasonable defaults that
don't match the intended behavior.

## Results: External Dependencies (M8)

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 0 | 0 | 0 |
| **SPEC** | 0 | 0 | 0 |
| **PROMPT** | 0 | 0 | 0 |

All 9 implementations use only standard library. The agents consistently followed
the "zero external dependencies" instruction across all formats.

## Results: Iterations to Pass (M2)

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 1 | 1 | 1 |
| **SPEC** | 1 | 1 | 1 |
| **PROMPT** | 1 | 1 | 1 |

All implementations passed their self-tests on the first attempt. No iteration was
needed for any combination.

## Results: Token Usage (M3/M4/M5)

Token counts extracted from subagent JSONL session logs. Input tokens include
fresh input + prompt cache writes + cache reads (effective context processed).
Output tokens estimated from generated content character count (÷4 heuristic)
since the logs don't capture final output usage.

### Per-Experiment

| Experiment | API Calls | Input Tokens | Est. Output | Est. Total |
|------------|-----------|-------------|-------------|------------|
| REF → Python | 12 | 308,095 | 5,956 | 314,051 |
| REF → Rust | 16 | 348,327 | 8,631 | 356,958 |
| REF → Go | 15 | 304,012 | 6,224 | 310,236 |
| SPEC → Python | 6 | 114,422 | 4,902 | 119,324 |
| SPEC → Rust | 9 | 267,176 | 12,497 | 279,673 |
| SPEC → Go | 11 | 230,874 | 5,589 | 236,463 |
| PROMPT → Python | 10 | 179,090 | 7,828 | 186,918 |
| PROMPT → Rust | 9 | 273,850 | 15,452 | 289,302 |
| PROMPT → Go | 8 | 157,684 | 6,200 | 163,884 |

### By Source Format (averages)

| Format | Avg API Calls | Avg Input | Avg Est. Output | Avg Est. Total | vs REF |
|--------|--------------|-----------|-----------------|----------------|--------|
| **REF** | 14.3 | 320,145 | 6,937 | 327,082 | 1.00x |
| **SPEC** | 8.7 | 204,157 | 7,663 | 211,820 | **0.65x** |
| **PROMPT** | 9.0 | 203,541 | 9,827 | 213,368 | **0.65x** |

### By Target Language (averages)

| Language | Avg API Calls | Avg Input | Avg Est. Output | Avg Est. Total |
|----------|--------------|-----------|-----------------|----------------|
| Python | 9.3 | 200,536 | 6,229 | 206,764 |
| Rust | 11.3 | 296,451 | 12,193 | 308,644 |
| Go | 11.3 | 230,857 | 6,004 | 236,861 |

### Token Analysis

**REF uses ~1.5x more input tokens than SPEC or PROMPT.** This is expected — the
REF format includes full implementation code plus test files, while SPEC is a compact
markdown document and PROMPT is even shorter. The REF agents also made more API calls
(14.3 avg vs 8.7–9.0), likely because the larger input prompted more careful
step-by-step translation.

**SPEC and PROMPT are nearly identical in total token usage** despite SPEC including
124 precise test vectors. The test vectors are compact (timestamp → expected string
tables), adding minimal input overhead while providing critical disambiguation value.

**Rust consistently uses the most tokens** across all formats — likely because
implementing UTC date/time operations without an external crate requires significantly
more generated code (civil date algorithms from scratch).

**Output tokens are similar across formats** — the agent generates roughly the same
amount of code regardless of source format. The difference is overwhelmingly in
input tokens (how much context the agent needs to process).

## Results: Idiomatic Quality (M6, Qualitative)

All translations demonstrated idiomatic adaptation:

| Aspect | Python | Rust | Go |
|--------|--------|------|----|
| **Naming** | snake_case | snake_case | PascalCase exports |
| **Error model** | `raise ValueError` | `Result<T, String>` | `(T, error)` tuple |
| **Test framework** | pytest parametrize | `#[test]` + loops | table-driven subtests |
| **Date handling** | `datetime` stdlib | Manual civil date calc | `time` package |

The Rust translations are notable: without an external crate (chrono), the agent
implemented civil date calculations from scratch (days-from-epoch algorithms) —
correctly, on the first attempt.

## Summary Table

| Metric | REF | SPEC | PROMPT |
|--------|-----|------|--------|
| Self-test pass rate | 100% (all 3) | 100% (all 3) | 100% (all 3) |
| REF vector compliance | 100% | 100% | ~95% |
| Iterations needed | 1 | 1 | 1 |
| External dependencies | 0 | 0 | 0 |
| Avg total tokens | 327K | 212K (0.65x) | 213K (0.65x) |
| Avg API calls | 14.3 | 8.7 | 9.0 |
| Idiomatic quality | High | High | High |

## Key Findings

### 1. REF and SPEC produce identical correctness

Both the annotated reference (REF) and the specification with test vectors (SPEC)
achieved 100% compliance with the reference test vectors across all languages. The
test vectors are the critical ingredient — not the implementation code.

### 2. PROMPT produces reasonable but divergent implementations

The natural language prompt produced code that is internally consistent (passes its
own tests) but diverges from the reference in ambiguous edge cases. The 6 failures
in PROMPT-Python all stem from underspecified thresholds and unit choices — exactly
the places where a human developer would also ask clarifying questions.

### 3. All formats achieve zero dependencies

The "no external dependencies" constraint was followed perfectly regardless of source
format. This is likely because it was stated explicitly in all three formats.

### 4. First-pass success across all combinations

Every implementation passed its own tests on the first attempt. This suggests
whenwords (5 pure functions, no I/O, no state) is below the complexity threshold
where format differences cause generation failures. Harder libraries may show
more differentiation.

### 5. Test vectors are the disambiguation mechanism

The SPEC format and REF format both include test vectors. The PROMPT format does not.
The SPEC format achieved the same 100% compliance as REF, suggesting that for this
level of complexity, **test vectors alone may be sufficient** — the reference
implementation code may not add correctness value beyond what the test vectors provide.

This is a preliminary finding. Higher-complexity libraries with algorithmic subtlety,
state management, or error recovery may benefit more from having the reference
implementation available.

### 6. On-policy vs off-policy framing (added after mathexpr Stage 2)

The 6 PROMPT failures are better understood through the lens of **on-policy vs off-policy
tasks**. The whenwords thresholds and boundary conditions are arbitrary design decisions
not predictable from training data (off-policy). The PROMPT agent fell back on its priors
and guessed differently. By contrast, mathexpr (Stage 2) achieved 100% PROMPT correctness
because recursive descent parsing is a textbook algorithm well-represented in training data
(on-policy) — the model already "knows" the right answer regardless of format.

This reframes the Type-O hypothesis: **the value of structured reference material (REF/SPEC)
is proportional to how far the desired behavior diverges from the model's training
distribution.** For on-policy tasks, any format works. For off-policy tasks, test vectors
or reference code are essential to override model priors. See `mathexpr-experiment-results.md`
for the full analysis.

## Limitations

- **Single run per combination** — methodology calls for 3 runs to account for
  non-determinism. This is a pilot.
- **Token counts are approximate** — output tokens estimated from content chars (÷4),
  not from API usage response. Input tokens are from API usage fields but may be
  affected by prompt caching behavior.
- **Same model for all** — did not vary the model; results may differ for smaller models.
- **Whenwords is low complexity** — all pure functions, no dependencies between nodes,
  no state. Higher-complexity libraries are needed to stress-test the hypothesis.
- **Cross-validation only done for Python** — Go and Rust PROMPT implementations were
  not tested against REF vectors (would require writing cross-validation harnesses in
  those languages).
- **Not fully isolated sessions** — sub-agents within a session, not completely fresh
  context windows.

## Next Steps

1. **Run cross-validation for Go and Rust PROMPT** — write harnesses or use a polyglot
   test runner
2. **Repeat 3x** — account for non-determinism
3. **Stage 2: library with dependencies** — test a library where nodes depend on each
   other (the node graph becomes meaningful)
4. **Test with smaller models** — try claude-sonnet to see if format differences
   amplify with less capable models
5. **Improve token instrumentation** — capture exact output tokens from API responses
   rather than estimating from content chars

## Experiment Artifacts

```
experiments/
  whenwords/
    SPEC.md              — Specification format source material
    PROMPT.md            — Natural language format source material
    results.md           — Initial REF-only results (superseded by this document)
    cross-validate.py    — Python cross-validation script
  extract-tokens.py      — Token usage extraction from subagent JSONL logs
  whenwords-ref-python/  — REF → Python translation
  whenwords-ref-rust/    — REF → Rust translation
  whenwords-ref-go/      — REF → Go translation
  whenwords-spec-python/ — SPEC → Python translation
  whenwords-spec-rust/   — SPEC → Rust translation
  whenwords-spec-go/     — SPEC → Go translation
  whenwords-prompt-python/ — PROMPT → Python translation
  whenwords-prompt-rust/   — PROMPT → Rust translation
  whenwords-prompt-go/     — PROMPT → Go translation
```
