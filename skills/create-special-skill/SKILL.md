---
name: create-special-skill
description: Create a new special skill — a modular, tested TypeScript reference that agents translate into any target language. Use when the user wants to create a skill for code generation from specs, RFCs, or behavioral descriptions.
argument-hint: "<library-name> — kebab-case noun, e.g. 'date-formatter' or 'graph-traversal'"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Task"]
---

# Create a Special Skill

Build a new special skill from a spec, RFC, API doc, or behavioral description.
A special skill is a self-contained folder with a tested TypeScript reference
implementation and layered translation guidance.

## Core Principles

### Context Efficiency

**"The context window is a public good."** Only add context Claude lacks. Challenge
each element: Does Claude need this explanation? Does this justify its token cost?
Prefer concise examples over verbose explanations.

- Keep SKILL.md under 500 lines
- Move variant-specific details to per-node spec files
- Reference files are loaded as-needed, not upfront

### Progressive Disclosure

Special skills use four-layer progressive disclosure:

1. **Frontmatter** (~100 words) — Always present in skill list; name + description
2. **SKILL.md body** (<5k words) — Loaded when skill triggers; node graph, design decisions
3. **nodes/\<name\>/spec.md** — Loaded per-node during translation; test vectors, provenance
4. **reference/src/\<name\>.ts** — Consulted only when spec is ambiguous

### Degrees of Freedom

Match specificity to task requirements:

- **High freedom** (spec only): Multiple valid implementations, language-idiomatic choices
- **Medium freedom** (spec + hints): Preferred patterns exist but variation acceptable
- **Low freedom** (exact algorithms): Numerical precision, cryptographic operations, protocol compliance

Special skills default to **low freedom** — the TypeScript reference and test vectors
define exact behavior. Translation hints guide idiom adaptation, not algorithm changes.

## Input

The user provides `$ARGUMENTS` — the kebab-case library name (e.g. `date-formatter`).
They should also provide or point to the source material: a spec, RFC, existing library,
or behavioral description.

## Anatomy of a Special Skill

```
skills/$ARGUMENTS/
├── SKILL.md              ← Entry point: node graph, design decisions, frontmatter
├── HELP.md               ← Interactive guide for node/language selection
├── reference/            ← TypeScript reference implementation
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── <node>.ts         ← One per node
│       └── <node>.test.ts    ← Behavioral contract (one per node)
└── nodes/
    ├── to-<lang>.md          ← Skill-level translation hints (optional)
    └── <node>/
        ├── spec.md           ← Behavioral spec with test vectors
        └── to-<lang>.md      ← Node-level translation hints (optional)
```

### What NOT to Include

- **README.md** — SKILL.md serves this purpose
- **CHANGELOG.md** — Skills are versioned with the repository
- **Installation guides** — Skills are self-contained
- **Auxiliary documentation** — Everything needed is in SKILL.md, HELP.md, or spec files
- **Dependencies** — Reference implementations have zero runtime dependencies

## Steps

### 1. Create the skill directory

```bash
mkdir -p skills/$ARGUMENTS/{reference/src,nodes}
```

Initialize the reference package:
```bash
cd skills/$ARGUMENTS/reference && bun init -y
```

### 2. Design the node graph

Identify discrete functions/types from the source material. Map dependencies.
Follow the granularity rules:
- Each public function a consumer might want independently = a node
- Shared internal helpers = part of the nearest node
- Shared data types across nodes = their own leaf node

### 3. Write the SKILL.md

Use the template at `skills/create-special-skill/templates/SKILL-template.md`.
The SKILL.md is the entry point — it provides:
- Frontmatter with name, description, argument-hint, allowed-tools
- Overview of what the skill does
- Full node graph (ASCII art + table)
- Subset extraction patterns
- Key design decisions with provenance
- Links to per-node specs and reference source

### 4. Implement the reference (TypeScript + Bun)

```bash
cd skills/$ARGUMENTS/reference
bun init -y
```

For each node in topological order (leaves first):
1. Write `src/<node>.ts` with structured JSDoc comments (see format below)
2. Write `src/<node>.test.ts` with comprehensive tests
3. Run `bun test src/<node>.test.ts` — must pass
4. After all nodes: `bun test --coverage` — must be **100% line and function coverage**

When translations are generated from this skill, every public function, class, type,
and interface must have idiomatic doc comments in the target language's standard format,
and each generated file must include a provenance header identifying the agent, model,
skill, and node. See the SKILL-template.md Process section for the full documentation
and provenance requirements.

The reference code and tests are in TypeScript. This is the authoritative source.
Translation agents consult it when specs are ambiguous.

#### Structured comment format

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

| Tag | Required | Purpose |
|-----|----------|---------|
| `@node` | yes | Unique kebab-case identifier for this node |
| `@depends-on` | if deps exist | Comma-separated list of node IDs this node requires |
| `@contract` | yes | Test file that defines the behavioral contract |
| `@hint` | optional | `category: guidance` pairs for translation agents |
| `@provenance` | optional | Source and verification date for algorithms/test vectors |

#### @depends-on syntax

- **All required**: `@depends-on a, b, c` — node needs all of a, b, and c
- **At least one of**: `@depends-on any-of(a, b, c)` — node needs at least one from the group
- **Mixed**: `@depends-on base-node, any-of(alg-a, alg-b, alg-c)` — base-node is always
  required; at least one from the group is required

The `any-of()` modifier is for dispatcher/aggregator nodes that import multiple
implementations but only require one at translation time. When translating a subset,
include only the `any-of` members you need.

Example — a `minimize` dispatcher that can dispatch to any algorithm:
```typescript
/**
 * @node minimize
 * @depends-on result-types, any-of(bfgs, l-bfgs, nelder-mead, newton)
 */
```

When computing the transitive closure for subset extraction, `any-of` members are
included only if explicitly requested. Plain (non-`any-of`) dependencies are always
included.

### 5. Write the HELP.md

Create `skills/$ARGUMENTS/HELP.md` using the template at
`skills/create-special-skill/templates/HELP-template.md`.

The help guide provides an interactive decision tree for consumers who don't know
which nodes they need. Include:
- Quick start recipes for common use cases
- A decision tree walking through key choices (what info is available, what constraints exist, etc.)
- Language/platform notes
- Pre-computed node recipes with dependency sets
- FAQ

See `skills/optimization/HELP.md` for a concrete reference example.

### 6. Write per-node specs

For each node, create `nodes/<node>/spec.md` using the template at
`skills/create-special-skill/templates/spec-template.md`.

Include:
- Purpose and dependencies
- Parameters with defaults and provenance
- Algorithm description (if applicable)
- Function signatures
- Test vectors with `@provenance` annotations

### 7. Write translation hints (optional)

Translation hints are an **optimization, not a requirement**. A well-built skill with
clear specs and 100% test coverage is translatable to any language the model knows.
Hints reduce iteration count by capturing friction encountered during real translations.

**Do not write speculative hints.** Add them as translations actually happen and you
discover patterns worth recording. There is no predefined set of languages — hints
accumulate for whatever languages are actually targeted.

#### Skill-level hints

When patterns repeat across all nodes in a skill (common type mappings, error handling
conventions, testing idioms), put them in `nodes/to-<lang>.md` — one file per language
at the skill level. Use the template at
`skills/create-special-skill/templates/to-lang-skill-level-template.md`.

#### Node-level hints

When a specific node has translation friction beyond what the skill-level hints cover,
add `nodes/<node>/to-<lang>.md` for that node. Use the template at
`skills/create-special-skill/templates/to-lang-template.md`.

Node-level hints are for genuinely node-specific concerns — e.g., a recursive data
structure needing `Box<>` in Rust, a specific numerical formula that needs care, or a
circular buffer pattern that maps differently across languages.

#### Hint content

Keep hints concise — 3-8 bullet points covering:
- Type mappings (TypeScript → target)
- Idiom differences
- Data structure choices
- Error handling patterns

### 8. Validate

#### Coverage and Tests
- [ ] All tests pass: `cd skills/$ARGUMENTS/reference && bun test --coverage`
- [ ] 100% line and function coverage — no exceptions
- [ ] Zero dead code (unused variables, unreachable branches, unused constants)
- [ ] Test assertions always execute (no `if` guards that silently skip expects)
- [ ] Round-trip tests use consistent precision (document why if precision varies)
- [ ] External test vectors have `@provenance` annotations in test files

#### Structured Comments
- [ ] Every exported function has `@node`, `@contract`
- [ ] `@depends-on` lists **every** module the file imports from (not just transitive)
- [ ] No circular dependencies

#### SKILL.md
- [ ] Node table matches actual source files (count, names, dependencies)
- [ ] Subset extraction claims are accurate (verify transitive dependency counts)
- [ ] ASCII graph accurately represents dependency relationships
- [ ] Key design decisions have `@provenance` citing authoritative sources

#### Spec Files
- [ ] Each node has `nodes/<name>/spec.md`
- [ ] Every spec has at least one `@provenance:` annotation (with colon)
- [ ] Section names match template (`## Parameters`, not `## Constants`)
- [ ] Factual claims match implementation (counts, names, behaviors)
- [ ] Edge cases document semantic gotchas (e.g., lossy conversions)

#### HELP.md
- [ ] Exists with decision tree and node recipes
- [ ] Node counts in recipes match actual transitive dependencies
- [ ] No false equivalences (e.g., `all` ≠ `convert` if they differ)

#### Project Integration
- [ ] CLAUDE.md skills table updated with correct node count, test count, coverage
- [ ] CLAUDE.md repository structure section includes new skill
- [ ] Cross-validation column is accurate (use `—` if none performed)

### 9. Iterate

Test the skill by generating translations for real use cases:

1. Generate a translation (e.g., `srgb-linear --lang python`)
2. Run the generated tests — they should pass first try
3. If tests fail or friction occurs, update:
   - Spec files for clearer wording
   - Translation hints for recurring patterns
   - Reference code comments for edge case clarification
4. Re-run validation checklist after changes

Translation hints accumulate from real experience, not speculation. A skill
is mature when translations pass tests on the first attempt across multiple
languages.
