# Special: A Claude Code Plugin for Modular Code Generation

## What this is

A Claude Code plugin marketplace hosting **special skills** — self-contained code
generation recipes backed by verified TypeScript reference implementations. Each skill
translates a tested reference into native code in any target language, generating only
the subset of nodes you need with zero external dependencies.

For the project thesis, see `docs/thesis.md`. For how skills work, see `docs/how-it-works.md`.

## Plugin architecture

This repository is a **Claude Code plugin** (manifest at `.claude-plugin/plugin.json`).
Skills within the plugin are designed to be **fully self-contained** — they must operate
without any help from this project's CLAUDE.md. When installed via a plugin marketplace,
users get only the skill directories; they do not get the host project's CLAUDE.md,
research/.

**Implications for skill authors:**
- All conventions, structured comment format docs, and process instructions must live
  inside each skill's own SKILL.md (or in the `create-special-skill` meta-skill)
- The canonical reference for creating skills is `skills/create-special-skill/SKILL.md`
- This CLAUDE.md is for contributors working on the repository itself, not for plugin consumers

## Repository structure

```
.claude-plugin/
  plugin.json               — Plugin manifest (name: "special")
skills/
  optimization/
    SKILL.md                — Skill entry point with frontmatter
    reference/              — TypeScript reference (21 nodes, 539 tests, 100% coverage)
      src/<node>.ts         — Implementation with @node structured comments
      src/<node>.test.ts    — Behavioral contract
    nodes/
      to-<lang>.md          — Skill-level translation hints (optional, per language)
      <node>/
        spec.md             — Behavioral spec with test vectors and provenance
        to-<lang>.md        — Node-level translation hints (optional, per language)
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
research/
  README.md                 — Research summary and reading order
  hypothesis.md             — Core hypothesis and motivation
  evaluation-methodology.md — Experimental design and metrics
  skill-architecture.md     — From format comparison to skill design
  optimization-library-survey.md — Algorithm survey across 11 libraries
  decisions/                — Architecture Decision Records
  results/                  — Detailed experiment results by stage
  experiments/              — Raw experiment outputs (historical)
```

## Skills

| Skill | Nodes | Tests | Coverage | Cross-validated |
|-------|-------|-------|----------|-----------------|
| optimization | 21 | 539 | 100% | scipy v1.17.0, Optim.jl v2.0.0 |
| math-expression-parser | 6 | 96 | 100% | — |
| when-words | 5 | 124 | 100% | — |

## Canonical skill format

Each skill uses **progressive disclosure** — four layers read in order:

1. **SKILL.md** — Overview: node graph, subset extraction, design decisions, YAML frontmatter
2. **nodes/\<name\>/spec.md** — Per-node behavioral spec with test vectors and `@provenance`
3. **nodes/to-\<lang\>.md** and **nodes/\<name\>/to-\<lang\>.md** — Optional translation hints (skill-level and node-level)
4. **reference/src/\<name\>.ts** — TypeScript source (consulted only if spec is ambiguous)

Skills accept arguments: `<nodes> [--lang <language>]` (default language: TypeScript).

## Key commands

```bash
# Run tests for a skill's reference (must be 100% coverage)
cd skills/<skill-name>/reference && bun test --coverage

# Run a specific test file
bun test skills/<skill-name>/reference/src/<node>.test.ts

# Run Python translation tests
cd research/experiments/<lib>-skill-python && python -m pytest -v

# Run Rust translation tests
cd research/experiments/<lib>-skill-rust && cargo test

# Run Go translation tests
cd research/experiments/<lib>-skill-go && go test -v ./...
```

## Structured comment format

> **Canonical reference**: `skills/create-special-skill/SKILL.md` § "Structured comment format".
> That is the authoritative source — it ships with the plugin and is available to skill
> authors who do not have access to this CLAUDE.md. The summary below is for contributors.

Node metadata is declared via JSDoc-style comments on exported functions:

```typescript
/**
 * @node kebab-case-id
 * @depends-on other-node-a, other-node-b
 * @contract this-node.test.ts
 * @hint category: Translation guidance for the agent
 * @provenance source-library vX.Y.Z, verified YYYY-MM-DD
 */
export function myFunction(...): ReturnType { ... }
```

### @depends-on syntax

- **All required**: `@depends-on a, b, c` — node needs all of a, b, and c
- **At least one of**: `@depends-on any-of(a, b, c)` — node needs at least one from the group
- **Mixed**: `@depends-on base-node, any-of(alg-a, alg-b, alg-c)` — base-node is always
  required; at least one algorithm from the group is required

The `any-of()` modifier is for dispatcher/aggregator nodes (like `minimize`) that import
multiple implementations but only require one at translation time. When translating a
subset, include only the `any-of` members you need.

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
