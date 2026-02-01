# Special: A Claude Code Plugin for Modular Code Generation

## What this is

A Claude Code plugin marketplace hosting **special skills** — self-contained code
generation recipes backed by verified TypeScript reference implementations. Each skill
translates a tested reference into native code in any target language, generating only
the subset of nodes you need with zero external dependencies.

## Repository structure

```
.claude-plugin/
  plugin.json               — Plugin manifest (name: "special")
skills/
  optimization/
    SKILL.md                — Skill entry point with frontmatter
    reference/              — TypeScript reference (10 nodes, 191 tests, 100% coverage)
      src/<node>.ts         — Implementation with @node structured comments
      src/<node>.test.ts    — Behavioral contract
    nodes/<node>/
      spec.md               — Behavioral spec with test vectors and provenance
      to-python.md          — Python translation hints
      to-rust.md            — Rust translation hints
      to-go.md              — Go translation hints
  math-expression-parser/
    SKILL.md
    reference/              — TypeScript reference (6 nodes, 96 tests, 100% coverage)
    nodes/<node>/           — Per-node specs and translation hints
  when-words/
    SKILL.md
    reference/              — TypeScript reference (5 nodes, 124 tests, 100% coverage)
    nodes/<node>/           — Per-node specs and translation hints
  create-special-skill/
    SKILL.md                — Meta-skill: create a new special skill
    templates/              — SKILL-template.md, spec-template.md, to-lang-template.md
  propose-special-skill/
    SKILL.md                — Meta-skill: package and propose via GitHub issue
experiments/
  <library>-skill-<lang>/   — Generated translation outputs and results
  optimize-skill-nelder-mead-experiment.md
docs/
  decisions/                — Architecture Decision Records
  draft-issues/             — Spec improvements from translation feedback
  evaluation-methodology.md
  research-note-skill-architecture.md
  optimization-library-survey.md
tasks/
  *.md                      — Durable tasks for deferred work
```

## Skills

| Skill | Nodes | Tests | Coverage | Cross-validated |
|-------|-------|-------|----------|-----------------|
| optimization | 10 | 209 | 100% | scipy v1.17.0, Optim.jl v2.0.0 |
| math-expression-parser | 6 | 96 | 100% | — |
| when-words | 5 | 124 | 100% | — |

## Canonical skill format

Each skill uses **progressive disclosure** — four layers read in order:

1. **SKILL.md** — Overview: node graph, subset extraction, design decisions, YAML frontmatter
2. **nodes/\<name\>/spec.md** — Per-node behavioral spec with test vectors and `@provenance`
3. **nodes/\<name\>/to-\<lang\>.md** — Language-specific translation hints
4. **reference/src/\<name\>.ts** — TypeScript source (consulted only if spec is ambiguous)

Skills accept arguments: `<nodes> [--lang <language>]` (default language: TypeScript).

## Key commands

```bash
# Run tests for a skill's reference (must be 100% coverage)
cd skills/<skill-name>/reference && bun test --coverage

# Run a specific test file
bun test skills/<skill-name>/reference/src/<node>.test.ts

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

- Skill names use whole-word kebab-case nouns: `optimization`, `math-expression-parser`, `when-words`
- Node IDs use kebab-case: `nelder-mead`, `parse-duration`, `token-types`
- One test file per node, linked via `@contract`
- **100% line and function coverage required — no exceptions.** Tests are the behavioral
  contract; uncovered code is unverifiable after translation.
- Reference implementations prioritize clarity over performance
- No metaprogramming or dynamic dispatch in reference code
- All functions are pure where possible; state and I/O are explicit
- Test vectors include `@provenance` annotations documenting source and validation
- Cross-library validation against established implementations where applicable
