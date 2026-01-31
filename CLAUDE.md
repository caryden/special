# Type-O: Modular Verified References for AI-Native Code Generation

## What this is

An experiment in using annotated TypeScript reference implementations as "universal donor"
libraries that AI agents translate into any target language. See `requirements.md`
for the full hypothesis and motivation.

## Repository structure

```
reference/
  <library-name>/
    src/
      <node>.ts           — Reference implementation with @node structured comments
      <node>.test.ts      — Behavioral contract (tests)
docs/
  decisions/              — Architecture Decision Records (ADR-NNNN-*.md)
```

## Skills

- **build-type-o-reference** — Repeatable process for creating a new Type-O reference
  library from a spec, RFC, or existing codebase. Covers project setup, node graph
  design, annotation via structured comments, testing, and validation.

- **translate-from-type-o** — Repeatable process for translating a Type-O reference
  (or subset) into a target language. Covers graph reading, step-by-step translation,
  test verification, and ambiguity resolution.

## Key commands

```bash
# Run tests for a reference library
cd reference/<library-name> && bun test

# Run a specific test file
bun test reference/<library-name>/src/<node>.test.ts
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
 */
export function myFunction(...): ReturnType { ... }
```

## Conventions

- Node IDs use kebab-case: `time-ago`, `parse-duration`, `human-date`
- One test file per node, linked via `@contract`
- Reference implementations prioritize clarity over performance
- No metaprogramming or dynamic dispatch in reference code
- All functions are pure where possible; state and I/O are explicit
