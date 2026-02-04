---
name: create-special-skill
description: Create a new special skill — a modular, tested TypeScript reference that agents translate into any target language
argument-hint: "<library-name> — kebab-case noun, e.g. 'date-formatter' or 'graph-traversal'"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Task"]
---

# Create a Special Skill

Build a new special skill from a spec, RFC, API doc, or behavioral description.
A special skill is a self-contained folder with a tested TypeScript reference
implementation and layered translation guidance.

## Input

The user provides `$ARGUMENTS` — the kebab-case library name (e.g. `date-formatter`).
They should also provide or point to the source material: a spec, RFC, existing library,
or behavioral description.

## Steps

### 1. Create the skill directory

```
skills/$ARGUMENTS/
  SKILL.md              ← you will generate this (use template below)
  HELP.md               ← interactive guide for node/language selection
  reference/
    package.json
    tsconfig.json
    src/
      <node>.ts         ← one per node
      <node>.test.ts    ← one per node
  nodes/
    to-<lang>.md        ← skill-level translation hints (optional, per language)
    <node>/
      spec.md           ← behavioral spec with test vectors
      to-<lang>.md      ← node-level translation hints (optional, per language)
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

- [ ] All tests pass: `cd skills/$ARGUMENTS/reference && bun test --coverage`
- [ ] 100% line and function coverage
- [ ] Every exported function has `@node`, `@contract`, `@depends-on` (if deps exist)
- [ ] No circular dependencies
- [ ] SKILL.md node graph matches actual code
- [ ] Each node has spec.md
- [ ] HELP.md exists with decision tree and node recipes
- [ ] Zero dead code in reference implementation
