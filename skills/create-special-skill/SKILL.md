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
  reference/
    package.json
    tsconfig.json
    src/
      <node>.ts         ← one per node
      <node>.test.ts    ← one per node
  nodes/
    <node>/
      spec.md           ← behavioral spec with test vectors
      to-python.md      ← Python translation hints
      to-rust.md        ← Rust translation hints
      to-go.md          ← Go translation hints
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
1. Write `src/<node>.ts` with structured JSDoc comments (`@node`, `@depends-on`, `@contract`, `@hint`)
2. Write `src/<node>.test.ts` with comprehensive tests
3. Run `bun test src/<node>.test.ts` — must pass
4. After all nodes: `bun test --coverage` — must be **100% line and function coverage**

The reference code and tests are in TypeScript. This is the authoritative source.
Translation agents consult it when specs are ambiguous.

### 5. Write per-node specs

For each node, create `nodes/<node>/spec.md` using the template at
`skills/create-special-skill/templates/spec-template.md`.

Include:
- Purpose and dependencies
- Parameters with defaults and provenance
- Algorithm description (if applicable)
- Function signatures
- Test vectors with `@provenance` annotations

### 6. Write translation hints

For each node × target language, create `nodes/<node>/to-<lang>.md` using
the template at `skills/create-special-skill/templates/to-lang-template.md`.

Keep hints concise — 3-8 bullet points covering:
- Type mappings (TypeScript → target)
- Idiom differences
- Data structure choices
- Error handling patterns

### 7. Validate

- [ ] All tests pass: `cd skills/$ARGUMENTS/reference && bun test --coverage`
- [ ] 100% line and function coverage
- [ ] Every exported function has `@node`, `@contract`, `@depends-on` (if deps exist)
- [ ] No circular dependencies
- [ ] SKILL.md node graph matches actual code
- [ ] Each node has spec.md + at least to-python.md, to-rust.md, to-go.md
- [ ] Zero dead code in reference implementation
