# Research Note: From Format Comparison to Skill Architecture

## Context

This note synthesizes findings from the whenwords and mathexpr experiments
(Stages 1–2) and reframes the Type-O hypothesis based on observed results.

## What the Experiments Showed

### Format comparison results (18 opus + 9 haiku + 9 sonnet translations)

| Finding | Implication |
|---------|-------------|
| PROMPT diverges on off-policy decisions (whenwords: 6/116 failures) | Natural language alone can't communicate arbitrary design choices |
| SPEC matches REF correctness at 0.6x token cost | Test vectors are the critical disambiguation mechanism |
| REF preserves modular architecture; PROMPT doesn't | Reference code guides structure, not just correctness |
| On-policy tasks (mathexpr) show no format advantage | The model's training data already encodes textbook algorithms |
| Haiku needs 2–3x more iterations but same correctness | Smaller models have execution reliability issues, not knowledge gaps (for on-policy) |
| Sonnet PROMPT diverged on `-2 ** 2` precedence | Even "on-policy" tasks have off-policy micro-decisions |

### The on-policy / off-policy framing

- **On-policy**: desired behavior matches model priors (textbook algorithms,
  standard protocols). Any format works. Token efficiency is the only differentiator.
- **Off-policy**: desired behavior involves arbitrary decisions not in training data
  (thresholds, defaults, conventions). Test vectors or reference code are essential.

**Key realization**: on-policy vs off-policy primarily affects token efficiency, not
correctness — *when test vectors are available*. With SPEC or REF, even off-policy
tasks converge to correct behavior. The format question is really about cost
optimization, not about whether correctness is achievable.

## The Hybrid Insight

The experiment design was artificially pure: each agent received exactly ONE format.
But the results show that the formats aren't competing — they're complementary layers:

| Layer | Role | When used |
|-------|------|-----------|
| **PROMPT** | Leverage on-policy knowledge; let the model use its training data efficiently | Always (cheapest path) |
| **SPEC** | Disambiguate off-policy decisions via test vectors and precise specs | When behavior has arbitrary design choices |
| **REF** | Validate correctness, preserve architecture, calibrate performance | When structure matters or as verification oracle |

This is **progressive disclosure** applied to AI code generation:
1. Start with the prompt (on-policy knowledge is free)
2. Escalate to spec when disambiguation is needed
3. Fall back to reference for validation and optimization

A smart agent would use all three layers, starting cheap and escalating only when
the cheap path produces ambiguity or test failures.

## From Reference Library to Skill

If prompt + spec + reference are layers of a single unit, that unit is a **skill** —
a packaged, distributable capability that an AI agent can consume to produce correct,
minimal, dependency-free native code.

### Skill anatomy

```
my-skill/
  PROMPT.md          — Natural language: what this does, when to use it
  SPEC.md            — Precise behavior: test vectors, type contracts, edge cases
  reference/         — Annotated implementation: validation oracle + architecture guide
    src/*.ts         — @node structured code with @depends-on graph
    src/*.test.ts    — Behavioral contracts (100% coverage)
  benchmarks/        — Performance targets (optional)
    bench.ts         — Reference timings for calibration
```

### How an agent uses a skill

1. Read PROMPT.md → understand intent, leverage on-policy knowledge
2. Generate initial implementation in target language
3. Run SPEC test vectors → catch off-policy divergences
4. If failures: consult SPEC.md for disambiguation, iterate
5. If architecture matters: consult reference/ for structural guidance
6. If performance matters: run benchmarks/, compare to reference timings,
   iterate on optimization (the Optim.jl pattern)

### The @depends-on graph enables unbundling

The node graph in reference/ isn't just documentation — it's the mechanism for
extracting subsets. Need only `debounce` from a utility skill? Extract the
`debounce` node and its transitive `@depends-on` closure. The skill is a menu,
not a monolith.

This directly addresses the supply chain bloat problem:
- **Current**: `npm install lodash` → 79 transitive deps, 39 maintainers
- **Skill**: translate just the `debounce` subgraph → zero deps, auditable code

## Distribution: Plugin Marketplace

Skills are self-contained, language-agnostic packages. Distribution options:

1. **Plugin marketplace** — curated repository of verified skills
2. **Version-controlled** — skills are just directories in a git repo
3. **Composable** — skills can depend on other skills (skill graph)
4. **Quality-gated** — 100% test coverage, cross-validation results, benchmark data

### What makes a good skill candidate?

Based on experiment results, skills provide the most value when:

- **High off-policy density** — many arbitrary design decisions that PROMPT alone
  would get wrong (thresholds, conventions, format codes, locale rules)
- **Natural node subgraph** — consumers typically need a subset, not the whole library
- **Cross-language demand** — the same functionality is needed in multiple languages
- **Supply chain risk** — the alternative is adding a dependency with a deep trust chain

Poor skill candidates:
- Textbook algorithms (on-policy — PROMPT alone works fine)
- Highly language-specific code (doesn't translate well)
- Libraries with no natural subset boundary (all-or-nothing)

### Candidate skill libraries (Stage 3)

| Candidate | Off-policy density | Unbundling potential | Supply chain value |
|-----------|-------------------|---------------------|-------------------|
| **date-fns subset** | High (locale rules, format tokens, edge cases) | High (200+ functions, most apps use 3–5) | High (common dep, deep tree) |
| **semver** | High (range parsing, pre-release ordering, `~` vs `^`) | Medium (8–10 nodes, natural graph) | Medium (every package manager needs it) |
| **Optim.jl subset** | Medium (algorithms on-policy, but defaults/interfaces off-policy) | High (want Nelder-Mead but not BFGS) | Low (Julia-specific) |
| **TOML parser** | High (escape sequences, multiline, type coercion) | Medium (parser is somewhat monolithic) | Medium (config files everywhere) |
| **lodash subset** | Low-Medium (utilities are mostly on-policy) | Very High (canonical bloat example) | Very High (most depended-on npm package) |

### The Optim.jl benchmark pattern

From prior work: extracting a reference from Optim.jl included creating benchmark
tests that timed optimization runs in Julia, then allowing the agent to iteratively
optimize the TypeScript translation using:
- Correctness tests (must match Julia output)
- Benchmark targets (Julia compiled times as performance floor)

This extends the skill concept: the reference isn't just a correctness oracle, it's
a **performance calibration target**. The agent can iterate on optimization because
it has a concrete number to beat.

## Revised Hypothesis

The original Type-O hypothesis: "Annotated reference implementations produce better
agent translations than less-structured source formats."

**Revised**: A skill (prompt + spec + reference) enables AI agents to produce correct,
minimal, dependency-free native code by leveraging progressive disclosure — using the
model's on-policy knowledge first, disambiguating with test vectors second, and
validating against reference code third. The reference serves as architecture guide
and performance oracle, not just a translation source.

The value of each layer:
- **PROMPT**: free (on-policy knowledge) — but insufficient for off-policy decisions
- **SPEC**: cheap (test vectors) — sufficient for correctness on all tested libraries
- **REF**: expensive (full implementation) — necessary for architecture preservation
  and performance calibration

## Open Questions

1. **Does the hybrid approach actually reduce total tokens?** We tested each layer
   in isolation. A progressive-disclosure agent might use fewer total tokens than
   any single format by starting cheap and escalating only when needed.

2. **Can skills be auto-extracted from existing libraries?** The Optim.jl experience
   suggests yes, but it requires: (a) the source language installed for test extraction,
   (b) good existing test coverage, (c) manual curation of the node graph.

3. **What's the marketplace economics?** Who creates skills? Who validates them?
   How are they versioned? Is this a community effort or a commercial product?

4. **Does the node graph actually enable useful unbundling?** We haven't tested
   extracting a subgraph and translating just that subset. This is a critical
   experiment for the modularity thesis.
