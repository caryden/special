# Research

This directory contains the research that informed the design of special skills.
The project began as a hypothesis about AI-native code distribution and was
validated through staged experiments comparing source formats, target languages,
and model capabilities.

## Hypothesis

AI agents can translate verified reference implementations into correct,
dependency-free native code. The optimal source format is not a single
representation but a **progressive disclosure** of complementary layers:
natural language overview, behavioral specs with test vectors, per-language
translation hints, and reference code as a validation oracle.

Full hypothesis statement: [hypothesis.md](hypothesis.md)

## Key Findings

### 1. Test vectors are the critical disambiguation mechanism

When desired behavior involves arbitrary design decisions (off-policy), test
vectors prevent divergence. Natural language prompts alone produce reasonable
but incorrect implementations — the agent fills in plausible defaults that
don't match intended behavior.

- Whenwords PROMPT diverged on 6/116 test vectors (thresholds, unit choices)
- Mathexpr PROMPT achieved 100% — but only because the domain is mathematically
  unambiguous (on-policy)
- Sonnet's PROMPT diverged on `-2 ** 2` precedence, proving even "on-policy"
  tasks have off-policy corners

### 2. The skill format is the optimal representation

Progressive disclosure (spec + hints + reference) outperforms any single format:

| Format | Correctness | Avg Tokens | Architecture Fidelity |
|--------|-------------|------------|----------------------|
| REF    | 100%        | 337K (1.0x) | Exact               |
| SPEC   | 100%        | 205K (0.6x) | Close               |
| PROMPT | ~95–100%    | 129K (0.4x) | Variable            |
| SKILL  | 100%        | 136K (0.4x) | Close               |

The skill format matches REF correctness at PROMPT-level cost, with high
architectural fidelity. It also used the fewest API calls of any format (5.7 avg).

### 3. On-policy vs off-policy determines format value

- **On-policy** (behavior matches model priors): any format works, PROMPT is cheapest
- **Off-policy** (arbitrary design decisions): test vectors or reference code essential

The value of structured reference material is proportional to how far desired
behavior diverges from the model's training distribution.

### 4. De-bundling works

A subset (3 of 21 optimization nodes) was extracted and translated independently
to Python, Rust, and Go — 108/108 tests passed. The `@depends-on` node graph
cleanly delineates subset boundaries.

### 5. Cross-library validation builds trust

Test vectors verified against scipy v1.17.0 and Optim.jl v2.0.0 give consumers
confidence in the reference. The optimization skill has 539 tests with
`@provenance` annotations documenting source and validation date.

## Research Timeline

| Stage | Library | Design | Result | Documents |
|-------|---------|--------|--------|-----------|
| 0 | — | Choose donor language | TypeScript + Bun selected | [ADR-0001](decisions/0001-type-o-language-csharp.md), [ADR-0002](decisions/0002-type-o-language-typescript-bun.md) |
| 1 | whenwords | 3 formats × 3 languages (9 runs, opus) | REF/SPEC 100%; PROMPT 95% | [results](results/whenwords-experiment-results.md) |
| 2a | mathexpr | 3 formats × 3 languages × 3 models (27 runs) | On-policy confound identified | [results](results/mathexpr-experiment-results.md) |
| 2b | mathexpr | SKILL format × 3 languages (3 runs) | Skill format validated | [results](results/mathexpr-experiment-results.md) |
| 3 | optimization | SKILL × 3 languages (NM subset, 3 runs) | 108/108 tests, de-bundling confirmed | [results](results/optimize-nelder-mead-results.md) |
| 3+ | optimization | Expand to 21 nodes, cross-validate scipy + Optim.jl | 539 tests, 100% coverage | [survey](optimization-library-survey.md) |

## Directory Structure

```
research/
  README.md                              — This file
  hypothesis.md                          — Core hypothesis and motivation
  evaluation-methodology.md              — Experimental design, metrics, rubric
  skill-architecture.md                  — From format comparison to skill design
  optimization-library-survey.md         — Algorithm survey across 11 libraries
  decisions/                             — Architecture Decision Records
    0001-type-o-language-csharp.md       — Initial C# choice (superseded)
    0002-type-o-language-typescript-bun.md — TypeScript + Bun (accepted)
  results/                               — Detailed experiment results
    whenwords-experiment-results.md      — Stage 1: whenwords 3×3
    mathexpr-experiment-results.md       — Stage 2: mathexpr 3×3×3 + skill
    optimize-nelder-mead-results.md      — Stage 3: optimization subset
  draft-issues/                          — Spec improvements from translation feedback
    001-convergence-strict-less-than.md
    002-std-dev-population-variance.md
    003-contraction-acceptance-asymmetry.md
  experiments/                           — Raw experiment outputs (historical)
    README.md                            — Naming conventions and index
    ...                                  — 45+ directories of generated translations
```

## Reading Order

For someone new to the project:

1. **[hypothesis.md](hypothesis.md)** — Why this project exists and what it tests
2. **[skill-architecture.md](skill-architecture.md)** — How experiments shaped the skill format
3. **[results/whenwords-experiment-results.md](results/whenwords-experiment-results.md)** — Stage 1 results (the clearest signal)
4. **[results/mathexpr-experiment-results.md](results/mathexpr-experiment-results.md)** — Stage 2 results (on-policy/off-policy insight)
5. **[evaluation-methodology.md](evaluation-methodology.md)** — Full experimental design and metrics
