# Experimental Hypothesis

> For the strategic argument (why unbundling matters), see [docs/thesis.md](../docs/thesis.md).
> For how skills work technically, see [docs/how-it-works.md](../docs/how-it-works.md).

## Core Hypothesis

There exists an optimal *form* for reference material — a "universal donor" representation — that AI agents can most efficiently and reliably translate into correct implementations in any target language. This form is somewhere on a spectrum:

```
Natural language prose
  → Markdown + YAML
    → Structured DSL
      → Reference implementation in a well-chosen real language
        → Formal specification (Lean/Dafny/TLA+)
```

The hypothesis is that the sweet spot is toward the "reference implementation in a real language" end — specifically, a **type-safe language with low ceremony, deep LLM training representation, and lightweight tooling** rather than a custom specification language or a natural language description.

The current choice is **TypeScript with Bun** (see [ADR-0002](decisions/0002-type-o-language-typescript-bun.md)). The graph metadata is declared via structured JSDoc comments rather than compiled attributes, and the agent reads source files directly rather than relying on reflection-based extraction tooling.

Rationale:

- AI agents have deep training data for real languages; a novel DSL has zero. TypeScript has arguably the deepest LLM training representation of any language.
- Real languages have real toolchains: the reference implementation *runs* and its tests *execute*. Bun provides a built-in test runner with zero configuration.
- The type system is tunable — strict where it helps, loose where it doesn't — and expresses logic without leaking platform-specific details.
- The reference captures both behavioral intent and structural architecture — not just *what* the code does, but how it's organized.
- Lightweight toolchain (Bun is a single binary) means the approach works in any environment including Claude Code Web, Codespaces, and sandboxes.

## Prior Art

- [A Software Library With No Code](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Drew Breunig, Jan 2026) — demonstrated the concept using markdown + YAML specs that an LLM consumes to generate implementations. Proved the idea works. Raised the question of whether markdown + YAML is the optimal format.

## Open Questions

### Answered by experiments

- **Single donor language or domain-dependent?** TypeScript works well across domains tested (string/date, parsing, numerical optimization). The optimize library (10 nodes, complex numerical algorithms) showed no limitations from TypeScript as donor. Numeric generics were not needed — `number[]` with explicit loops was clear and translatable. **Answer: TypeScript is sufficient for the domains tested.**

- **Comment vocabulary.** The `@node`, `@depends-on`, `@contract`, `@hint` tags are sufficient. We added `@provenance` for documenting where test vectors and defaults come from. The skill format (separate spec.md + to-{lang}.md files) supplements inline comments with richer context without changing the comment vocabulary. **Answer: minimal vocabulary works; provenance annotations are valuable.**

- **Granularity.** One exported function or cohesive type set per node works well. The optimize library's 10 nodes range from small (vec-ops: 10 functions) to medium (nelder-mead: 1 function + options type + internal helper). This granularity enables subset extraction (3 of 10 nodes for "Just Nelder-Mead"). **Answer: one function/type-set per node; the node graph handles composition.**

- **Empirical validation.** Done. Three reference libraries translated to 3 target languages across 4 formats. Key result: the skill format (progressive disclosure) is the canonical approach. All three layers (spec, hints, reference) are needed. See experiment results in `results/` and `experiments/`.

### Still open

- **Interface nodes.** Not yet tested — all current nodes are concrete implementations. The optimize library uses TypeScript interfaces (OptimizeOptions, OptimizeResult) but these are concrete types, not abstraction boundaries.
- **Performance annotations.** Not yet needed. The `@hint` vocabulary could support `perf:` tags but we haven't had a case where naive translation was unacceptable.
- **Versioning and evolution.** Untested. No node has been versioned or had its contract changed yet.
- **Agent-powered feedback loop.** Translation agents that hit spec ambiguities generate improvement signals. The mechanism for feeding these back (GitHub issues, PRs against a skills marketplace) is designed but not yet automated. See `draft-issues/` for examples.
- **Scale.** Current experiments use 5-10 node libraries. The approach needs testing with larger graphs (50+ nodes) and deeper dependency chains.

## Status

Three reference libraries implemented and tested:

| Library | Nodes | Tests | Coverage | Translations |
|---------|-------|-------|----------|-------------|
| [whenwords](../skills/when-words/reference/) | 5 | 124 | 100% | 9 (3 formats × 3 langs) |
| [mathexpr](../skills/math-expression-parser/reference/) | 6 | ~100 | 100% | 12 (4 formats × 3 langs) |
| [optimize](../skills/optimization/reference/) | 10 | 191 | 100% | 3 (skill × 3 langs, NM subset) |

Key milestones:
- **Skill format designed and validated** — progressive disclosure with spec + hints + reference
- **De-bundling confirmed** — subset extraction (3 of 10 nodes) produces correct, self-contained translations
- **Cross-library validation** — optimize library empirically validated against scipy v1.17.0
- **Translation feedback loop** — spec ambiguities detected by agents, documented as draft issues
- **11-library survey** — comprehensive comparison across scipy, Optim.jl, Ceres, NLopt, dlib, and others
