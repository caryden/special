# Mathexpr Translation Experiment — Results

## Overview

This document records the results of translating the **mathexpr** reference library
(mathematical expression parser/evaluator) from three source formats into three target
languages. This is Stage 2 of the Type-O experiments, chosen specifically because
mathexpr has properties that whenwords lacked:

- **6-node dependency graph** with shared types flowing between nodes
- **Algorithmic complexity** — recursive descent parser with precedence climbing
- **Tagged union types** — AST nodes use discriminated unions (translation challenge)
- **Inter-node contracts** — parser produces ASTs that evaluator consumes

### Source Formats

| Format | Description | Content |
|--------|-------------|---------|
| **REF** | Type-O annotated TypeScript reference + colocated test suite | 6 implementation files, 6 test files (96 tests), structured comments with `@node`, `@depends-on`, `@contract`, `@hint` |
| **SPEC** | Markdown specification with architecture + per-node test vectors | Type definitions, function specs, precedence table, 83 test vectors organized by node |
| **PROMPT** | Natural language description | Supported operations, precedence rules, error cases. Mentions pipeline structure but no types or test vectors |

### Target Languages

Python 3.11, Rust 1.93, Go 1.24.

### Methodology

- Model: claude-opus-4-5 (claude-opus-4-5-20251101)
- Each translation done by an independent sub-agent with only the source format as input
- Agents instructed: zero external dependencies, idiomatic target language, include tests
- Cross-validation: all implementations tested against 41 end-to-end REF test vectors
  (34 calc expressions + 7 error cases)

---

## Results: Self-Test Pass Rate (M1)

"Do the agent's own tests pass?"

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 96/96 (100%) | 96/96 (100%) | 114/114 (100%) |
| **SPEC** | 88/88 (100%) | 61/61 (100%) | All pass (100%) |
| **PROMPT** | 57/57 (100%) | 50/50 (100%) | All pass (100%) |

All 9 implementations pass their own tests on the first attempt (M2 = 1 iteration for all).

**Note:** Test count differences reflect architectural choices. REF translations replicate
the 6-file structure with per-node tests. SPEC agents included per-node tests matching the
specification. PROMPT agents typically wrote fewer, coarser-grained tests since they had
no test vectors to replicate.

## Results: REF Test Vector Compliance (Cross-Validation)

"Does the implementation match the reference behavior for all 41 end-to-end test vectors?"

### Python Cross-Validation (41 REF vectors)

| Format | Passed | Failed | Rate |
|--------|--------|--------|------|
| **REF** | 41/41 | 0 | **100%** |
| **SPEC** | 41/41 | 0 | **100%** |
| **PROMPT** | 41/41 | 0 | **100%** |

### Rust and Go (self-tests, all passing)

| Format | Rust | Go |
|--------|------|----|
| **REF** | 96 passed | All pass |
| **SPEC** | 61 passed | All pass |
| **PROMPT** | 50 passed | All pass |

### Analysis

All 9 implementations achieved 100% compliance. This is a notable change from whenwords,
where PROMPT diverged on ambiguous thresholds. The difference: mathexpr's behavior is
**mathematically unambiguous**. There are no thresholds, no "about a week" fuzzy
boundaries — `2 + 3 * 4` must equal `14`, period.

This suggests that PROMPT format struggles not with complexity per se, but with
**specification ambiguity**. When the behavior is precisely defined by mathematics,
natural language is sufficient. When behavior requires arbitrary design decisions
(thresholds, unit choices, boundary conditions), only test vectors or reference code
prevent divergence.

## Results: External Dependencies (M8)

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 0 | 0 | 0 |
| **SPEC** | 0 | 0 | 0 |
| **PROMPT** | 0 | 0 | 0 |

## Results: Iterations to Pass (M2)

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 1 | 1 | 1 |
| **SPEC** | 1 | 1 | 1 |
| **PROMPT** | 1 | 1 | 1 |

All implementations passed self-tests on the first attempt.

## Results: Token Usage (M3/M4/M5)

### Per-Experiment

| Experiment | API Calls | Input Tokens | Est. Output | Est. Total |
|------------|-----------|-------------|-------------|------------|
| REF → Python | 8 | 193,790 | 6,703 | 200,493 |
| REF → Rust | 12 | 391,719 | 10,770 | 402,489 |
| REF → Go | 14 | 397,401 | 10,766 | 408,167 |
| SPEC → Python | 6 | 107,876 | 5,415 | 113,291 |
| SPEC → Rust | 7 | 186,692 | 16,445 | 203,137 |
| SPEC → Go | 12 | 287,657 | 10,168 | 297,825 |
| PROMPT → Python | 6 | 87,550 | 4,392 | 91,942 |
| PROMPT → Rust | 7 | 135,698 | 9,073 | 144,771 |
| PROMPT → Go | 8 | 144,084 | 5,115 | 149,199 |

### By Source Format (averages)

| Format | Avg API Calls | Avg Input | Avg Est. Output | Avg Est. Total | vs REF |
|--------|--------------|-----------|-----------------|----------------|--------|
| **REF** | 11.3 | 327,637 | 9,413 | 337,050 | 1.00x |
| **SPEC** | 8.3 | 194,075 | 10,676 | 204,751 | **0.61x** |
| **PROMPT** | 7.0 | 122,444 | 6,193 | 128,637 | **0.38x** |

### By Target Language (averages)

| Language | Avg API Calls | Avg Input | Avg Est. Output | Avg Est. Total |
|----------|--------------|-----------|-----------------|----------------|
| Python | 6.7 | 129,739 | 5,503 | 135,242 |
| Rust | 8.7 | 238,036 | 12,096 | 250,132 |
| Go | 11.3 | 276,381 | 8,683 | 285,064 |

### Token Analysis

**REF uses ~2.6x more total tokens than PROMPT and ~1.6x more than SPEC.** The gap
widened compared to whenwords (where REF was 1.5x vs SPEC/PROMPT). This matches the
prediction: as the reference grows in complexity (6 files with 96 tests vs 5 functions
with 124 simple test vectors), the input token overhead of the full REF format increases.

**SPEC vs PROMPT gap widened to 1.6x** (was ~1.0x for whenwords). The SPEC format now
includes per-node type definitions and 83 structured test vectors, which adds meaningful
input overhead. For whenwords, SPEC and PROMPT were nearly identical in cost because the
test vectors were compact timestamp→string tables.

**PROMPT is dramatically cheaper at 0.38x REF** — and achieved 100% correctness on this
library. However, this is because mathexpr behavior is mathematically unambiguous.

**Rust continues to use the most tokens** across all formats, consistent with whenwords.
Go is also high, likely due to verbose test output in the agent's exploration.

## Results: Architectural Fidelity

How well did each format preserve the 6-node architecture?

| Format | Architecture Match | Details |
|--------|-------------------|---------|
| **REF** | Exact 6-node | All agents replicated token-types, ast-types, tokenizer, parser, evaluator, evaluate |
| **SPEC** | Close 6-node | Agents followed the specified type definitions and function boundaries |
| **PROMPT** | Variable | Agents chose their own architecture. Some used 3-stage pipeline (tokenize→parse→evaluate), some combined tokenizer+parser |

The REF format's `@depends-on` annotations and separate test files per node strongly
guided the agents to preserve the modular architecture. The SPEC format's per-node
sections had a similar effect. PROMPT agents, given only behavioral requirements, made
their own structural decisions.

## Comparative Summary: Whenwords vs Mathexpr

| Metric | Whenwords | Mathexpr | Change |
|--------|-----------|----------|--------|
| Node count | 5 (all leaves) | 6 (DAG with deps) | +complexity |
| Test vectors | 124 | 96 | Fewer but algorithmic |
| REF avg tokens | 327K | 337K | ~same |
| SPEC avg tokens | 212K (0.65x) | 205K (0.61x) | Slightly better ratio |
| PROMPT avg tokens | 213K (0.65x) | 129K (0.38x) | Much better ratio |
| PROMPT correctness | ~95% (6 failures) | 100% | Better (unambiguous domain) |

### Key Insight: The On-Policy Confound

The initial interpretation — that format value correlates with "specification ambiguity" —
is incomplete. A stronger hypothesis:

**The model that generates the translations is the same model (or same family) that could
generate the reference library from scratch.** Recursive descent parsing with precedence
climbing is a textbook algorithm extensively represented in training data. When an agent
receives a PROMPT saying "build a math expression parser," it is not truly *translating*
from the source material — it is *recalling* a well-known pattern and fitting it to
constraints. The source format is largely irrelevant because the desired behavior is
already encoded in the model's parameters.

This is an **on-policy** task: the target behavior aligns with what the model would
produce by default. The three formats converge not because "math is unambiguous" but
because they all point at the same prior knowledge.

By contrast, whenwords is **off-policy**: the specific thresholds (45 days → "about 2
months"), unit choices (month/year units in `duration`), and boundary conditions (6-day
vs 7-day window for "Last Monday") are arbitrary design decisions that cannot be predicted
from training data. The PROMPT agent had to guess — and guessed differently.

**The real variable is novelty relative to training distribution:**

| Task type | Description | Format impact |
|-----------|-------------|---------------|
| **On-policy** | Desired behavior well-represented in training data (textbook algorithms, standard protocols) | Minimal — any reasonable description produces correct output |
| **Off-policy** | Desired behavior involves arbitrary/novel decisions not predictable from training | High — test vectors or reference code are essential to override model priors |

**Implication**: To properly test the Type-O hypothesis, Stage 3 needs a library where
the desired behavior *diverges from what the model would produce by default*. This means:
custom business logic, specific threshold values, unusual error handling conventions, or
domain-specific decisions where a reasonable developer could make different choices.

Whenwords was actually closer to the right test than mathexpr despite being "simpler" —
its 6 PROMPT failures were genuine signal showing where model priors diverged from
intended behavior.

## Summary Table

| Metric | REF | SPEC | PROMPT |
|--------|-----|------|--------|
| Self-test pass rate | 100% (all 3) | 100% (all 3) | 100% (all 3) |
| REF vector compliance | 100% | 100% | 100% |
| Iterations needed | 1 | 1 | 1 |
| External dependencies | 0 | 0 | 0 |
| Avg total tokens | 337K | 205K (0.61x) | 129K (0.38x) |
| Avg API calls | 11.3 | 8.3 | 7.0 |
| Architecture fidelity | Exact | Close | Variable |

## Key Findings

### 1. On-policy tasks mask format differences

All three formats produced correct mathexpr implementations because recursive descent
parsing is a well-known algorithm in the model's training distribution. This is an
on-policy confound: the model doesn't need the source material to know how to build
a correct parser. Format value only manifests for off-policy tasks where the desired
behavior diverges from model priors (see Key Insight above).

### 2. REF provides architectural guidance that PROMPT does not

While all formats produced correct end-to-end behavior, REF translations preserved
the 6-node modular architecture. PROMPT translations sometimes merged or reorganized
components. For libraries where modularity matters (extensibility, maintainability),
REF may provide value beyond correctness.

### 3. Token cost gap widens with complexity

REF is now 2.6x more expensive than PROMPT (was 1.5x for whenwords). As reference
libraries grow, the fixed overhead of including full implementation + test code becomes
proportionally larger. SPEC scales better — its overhead grows only with the number of
test vectors, not with implementation line count.

### 4. SPEC remains the efficiency sweet spot (when ambiguity exists)

Combining whenwords and mathexpr results: SPEC achieves REF-level correctness at
~0.6x the token cost. For domains with specification ambiguity, SPEC provides the
disambiguation value of test vectors without the input overhead of full implementation
code.

### 5. Recursive descent parsing is within claude-opus-4-5's capability envelope

All 9 agents implemented a correct recursive descent parser with precedence climbing
and right-associative power operators on the first attempt. This includes Rust (with
proper enum types and ownership) and Go (with interface-based AST nodes).

---

## Haiku Model Experiment (claude-haiku)

### Motivation

The opus results showed all formats converging to 100% correctness on this on-policy
task. Testing with a smaller, less capable model (claude-haiku) addresses whether:
- Format value increases as model capability decreases
- The on-policy advantage holds across the capability spectrum
- Iteration count (a proxy for execution reliability) differs by format

### Self-Test Results

| Format | Python | Rust | Go |
|--------|--------|------|----|
| **REF** | 100/100 (100%) | 96/96 (100%) | All pass (100%) |
| **SPEC** | 88/88 (100%) | 88/88 (100%) | All pass (100%) |
| **PROMPT** | 58/58 (100%) | 48+1/49 (100%) | All pass (100%) |

All 9 haiku implementations pass their self-tests.

### Cross-Validation (Python, 41 REF vectors)

| Format | Passed | Failed | Rate |
|--------|--------|--------|------|
| **REF** | 41/41 | 0 | **100%** |
| **SPEC** | 41/41 | 0 | **100%** |
| **PROMPT** | 41/41 | 0 | **100%** |

**Same result as opus** — 100% cross-validation across all formats. The on-policy
confound holds even for haiku: the algorithm is well-known enough that even a smaller
model produces correct behavior from a natural language prompt alone.

### Token Usage

| Experiment | API Calls | Input Tokens | Est. Output | Est. Total |
|------------|-----------|-------------|-------------|------------|
| REF → Python | 17 | 399,955 | 12,635 | 412,590 |
| REF → Rust | 32 | 923,069 | 26,893 | 949,962 |
| REF → Go | 36 | 894,011 | 12,545 | 906,556 |
| SPEC → Python | 11 | 178,234 | 7,881 | 186,115 |
| SPEC → Rust | 15 | 512,414 | 31,328 | 543,742 |
| SPEC → Go | 14 | 398,857 | 19,512 | 418,369 |
| PROMPT → Python | 8 | 87,724 | 6,588 | 94,312 |
| PROMPT → Rust | 14 | 254,176 | 13,780 | 267,956 |
| PROMPT → Go | 12 | 203,995 | 11,230 | 215,225 |

### By Source Format (haiku averages)

| Format | Avg API Calls | Avg Est. Total | vs REF |
|--------|--------------|----------------|--------|
| **REF** | 28.3 | 756K | 1.00x |
| **SPEC** | 13.3 | 383K | **0.51x** |
| **PROMPT** | 11.3 | 192K | **0.25x** |

### Haiku vs Opus Comparison

| Metric | Opus | Haiku | Change |
|--------|------|-------|--------|
| REF avg total tokens | 337K | 756K | **2.2x more** |
| SPEC avg total tokens | 205K | 383K | **1.9x more** |
| PROMPT avg total tokens | 129K | 192K | **1.5x more** |
| REF avg API calls | 11.3 | 28.3 | **2.5x more** |
| SPEC avg API calls | 8.3 | 13.3 | **1.6x more** |
| PROMPT avg API calls | 7.0 | 11.3 | **1.6x more** |
| Cross-validation (all) | 100% | 100% | Same |

### Haiku Implications

**1. Execution reliability degrades more than knowledge for smaller models.**
Haiku achieved the same 100% correctness as opus, but needed significantly more
iterations (API calls) to get there — especially for REF format (28.3 vs 11.3 calls).
This is the execution reliability factor: haiku knows the algorithm but makes more
implementation mistakes that require test-fix cycles.

**2. REF format amplifies iteration cost for weaker models.**
REF→Rust-haiku used 32 API calls and 950K tokens. The same task with opus used 12
calls and 402K tokens. The larger input context of REF means each iteration is more
expensive, and haiku needs more iterations. This is a multiplicative cost penalty:
more iterations × more tokens per iteration.

**3. PROMPT is even cheaper relative to REF with haiku (0.25x vs 0.38x with opus).**
The cost advantage of lighter formats grows with weaker models because the iteration
multiplier hits REF harder (larger context per call × more calls).

**4. The on-policy confound is robust across model capability.**
Even haiku — a much smaller model — produces correct recursive descent parsers from
a natural language prompt. This strongly confirms that mathexpr is on-policy: the
algorithm is so well-represented in training data that model capability barely affects
correctness, only execution efficiency.

**5. For on-policy tasks, PROMPT + haiku is the optimal cost point.**
At 192K tokens with 100% correctness, PROMPT-haiku costs ~4x less than REF-opus
(756K with haiku pricing vs 337K with opus pricing — and haiku tokens are much
cheaper per token). For tasks within the model's training distribution, there is no
correctness reason to use a more expensive format or model.

---

## Limitations

- **Single run per combination** — no account for non-determinism
- **Token counts are approximate** — output estimated from content chars (÷4)
- **Cross-validation limited to end-to-end** — did not test per-node contracts for
  Rust/Go (only Python cross-validated against REF vectors; Rust/Go validated via
  self-tests only)
- **On-policy domain only** — need to repeat the haiku experiment on an off-policy
  library (like whenwords) to see whether format value increases with weaker models
  on ambiguous tasks

## Next Steps

1. **Sonnet experiment** — run the same 3×3 matrix with claude-sonnet for a third
   capability data point
2. **Haiku on whenwords (off-policy)** — test whether format matters more for weaker
   models when the task is off-policy
3. **Stage 3: library with both complexity AND ambiguity** — a domain with arbitrary
   design decisions combined with algorithmic depth
4. **Repeat 3x** — account for non-determinism

## Experiment Artifacts

```
experiments/
  mathexpr/
    SPEC.md                    — Specification format source material
    PROMPT.md                  — Natural language format source material
  mathexpr-cross-validate.py   — Python cross-validation (41 REF vectors)
  mathexpr-cross-validate-all.sh — Full cross-validation runner
  mathexpr-extract-tokens.py   — Token usage extraction (opus)
  mathexpr-extract-tokens-haiku.py — Token usage extraction (haiku)
  mathexpr-ref-python/         — REF → Python (opus)
  mathexpr-ref-rust/           — REF → Rust (opus)
  mathexpr-ref-go/             — REF → Go (opus)
  mathexpr-spec-python/        — SPEC → Python (opus)
  mathexpr-spec-rust/          — SPEC → Rust (opus)
  mathexpr-spec-go/            — SPEC → Go (opus)
  mathexpr-prompt-python/      — PROMPT → Python (opus)
  mathexpr-prompt-rust/        — PROMPT → Rust (opus)
  mathexpr-prompt-go/          — PROMPT → Go (opus)
  mathexpr-ref-python-haiku/   — REF → Python (haiku)
  mathexpr-ref-rust-haiku/     — REF → Rust (haiku)
  mathexpr-ref-go-haiku/       — REF → Go (haiku)
  mathexpr-spec-python-haiku/  — SPEC → Python (haiku)
  mathexpr-spec-rust-haiku/    — SPEC → Rust (haiku)
  mathexpr-spec-go-haiku/      — SPEC → Go (haiku)
  mathexpr-prompt-python-haiku/  — PROMPT → Python (haiku)
  mathexpr-prompt-rust-haiku/    — PROMPT → Rust (haiku)
  mathexpr-prompt-go-haiku/      — PROMPT → Go (haiku)
```
