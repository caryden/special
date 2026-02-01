# Type-O: Modular Verified References for AI-Native Code Generation

## What this is

An experiment in using annotated TypeScript reference implementations as "universal donor"
libraries that AI agents translate into any target language. The **skill format** is the
canonical approach: progressive disclosure with spec, translation hints, and reference
source. See `requirements.md` for the full hypothesis and motivation.

## Repository structure

```
reference/
  <library-name>/
    src/
      <node>.ts           — Reference implementation with @node structured comments
      <node>.test.ts      — Behavioral contract (tests)
experiments/
  <library-name>-skill/
    skill.md              — Skill overview: node graph, subsets, design decisions
    nodes/<node>/
      spec.md             — Behavioral spec with test vectors and provenance
      to-python.md        — Python translation hints
      to-rust.md          — Rust translation hints
      to-go.md            — Go translation hints
  <library-name>-skill-<lang>/
    <impl>.<ext>          — Generated translation output
    <test>.<ext>          — Generated tests
    RESULTS.md            — Per-language experiment results
docs/
  decisions/              — Architecture Decision Records (ADR-NNNN-*.md)
  draft-issues/           — Spec improvement issues from translation feedback
  optimization-library-survey.md — Cross-library comparison
  evaluation-methodology.md      — Experimental design
  research-note-skill-architecture.md — Skill format design rationale
tasks/
  *.md                    — Durable tasks for deferred work (Julia, MATLAB, C++)
```

## Reference libraries

| Library | Nodes | Tests | Coverage | Cross-validated |
|---------|-------|-------|----------|-----------------|
| whenwords | 5 | 124 | 100% | — |
| mathexpr | 6 | ~100 | 100% | — |
| optimize | 10 | 191 | 100% | scipy v1.17.0, Optim.jl v2.0.0 |

## Skills

- **build-type-o-reference** — Repeatable process for creating a new Type-O reference
  library from a spec, RFC, or existing codebase. Covers project setup, node graph
  design, annotation via structured comments, testing, and validation.

- **translate-from-type-o** — Repeatable process for translating a Type-O reference
  (or subset) into a target language. Uses progressive disclosure: read skill.md →
  node specs → translation hints → consult TypeScript reference if needed.

## Canonical translation format: Skill

The **skill format** is the canonical approach for translations (confirmed by experiments).
It uses three layers of progressive disclosure:

1. **skill.md** — Overview: node graph, subset extraction, design decisions
2. **nodes/\<name\>/spec.md** — Per-node behavioral spec with test vectors and provenance
3. **nodes/\<name\>/to-\<lang\>.md** — Language-specific translation hints
4. **reference/\<lib\>/src/\<name\>.ts** — TypeScript source (consulted if spec is ambiguous)

Translation agents follow this order and consult the reference only when needed.
The nelder-mead experiment confirmed all three layers are necessary — the reference
was needed by all agents for specific ambiguities the spec didn't cover.

## Key commands

```bash
# Run tests with coverage for a reference library (must be 100%)
cd reference/<library-name> && bun test --coverage

# Run a specific test file
bun test reference/<library-name>/src/<node>.test.ts

# Run Python translation tests
cd experiments/<lib>-skill-python && python -m pytest -v

# Run Rust translation tests
cd experiments/<lib>-skill-rust && cargo test

# Run Go translation tests
cd experiments/<lib>-skill-go && go test -v ./...
```

## Structured comment format

Node metadata is declared via JSDoc-style comments on exported functions:

```typescript
/**
 * Description of what this function does.
 *
 * @node kebab-case-id
 * @depends-on other-node-a, other-node-b
 * @contract this-node.test.ts
 * @hint category: Translation guidance for the agent
 * @provenance source-library vX.Y.Z, verified YYYY-MM-DD
 */
export function myFunction(...): ReturnType { ... }
```

## Conventions

- Node IDs use kebab-case: `time-ago`, `parse-duration`, `human-date`
- One test file per node, linked via `@contract`
- **100% line and function coverage required — no exceptions.** Tests are the behavioral
  contract; uncovered code is unverifiable after translation. If a line can't be covered,
  remove it — zero dead code in reference libraries.
- Reference implementations prioritize clarity over performance
- No metaprogramming or dynamic dispatch in reference code
- All functions are pure where possible; state and I/O are explicit
- Test vectors include `@provenance` annotations documenting source and validation
- Cross-library validation against established implementations (scipy, Optim.jl, etc.)
  where applicable
