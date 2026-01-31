# Skill: Build a Type-O Reference Library

## When to use

When the user wants to create a new Type-O reference implementation from an existing
library spec, API documentation, RFC, or behavioral description.

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)

## Process

### 1. Understand the source material

Read the spec, documentation, or existing library code. Identify:
- The discrete functions/types to implement
- Dependencies between them (what calls what)
- Edge cases, error conditions, and behavioral rules
- Any existing test vectors or examples

### 2. Create the reference project

```bash
mkdir -p reference/<library-name>
cd reference/<library-name>
bun init -y
```

### 3. Design the node graph

Before writing code, list the nodes and their dependencies:

```
node-id          | depends-on       | description
-----------------|------------------|---------------------------
<function-a>     | (pure)           | ...
<function-b>     | function-a       | ...
```

Granularity guidance:
- Each public function that a consumer might want independently = a node
- Shared helper functions that are only internal = part of the nearest node, not separate
- Data types/interfaces shared across nodes = their own node (often a leaf)
- Error handling types = their own node (leaf)

### 4. Implement with structured comments

For each node, write the reference implementation in TypeScript and annotate it
with structured JSDoc comments:

```typescript
/**
 * One-line description of what this does.
 *
 * @node my-function
 * @depends-on helper-a, helper-b
 * @contract my-function.test.ts
 * @hint pattern: Pure function, no platform concerns
 */
export function myFunction(input: ParamType): ReturnType {
  // Clear, straightforward implementation
}
```

#### Structured comment tags

| Tag | Required | Description |
|-----|----------|-------------|
| `@node <id>` | Yes | Unique kebab-case identifier for this node |
| `@depends-on <ids>` | If deps exist | Comma-separated node IDs this node requires |
| `@contract <file>` | Yes | Test file that defines the behavioral contract |
| `@hint [category]: <text>` | Optional | Translation guidance for the agent |

#### Hint categories

- `pattern:` — suggest target-language idiom
- `platform:` — use native platform capabilities
- `perf:` — performance expectation or complexity bound
- `adapt:` — requires user decision (agent should ask)

### 5. Write comprehensive tests

For each node, create a colocated test file (`<node>.test.ts`) with:
- Happy-path cases covering normal behavior
- Edge cases from the spec
- Error cases (invalid input, boundary conditions)
- Any test vectors from the source material (RFCs, specs, etc.)

Use `describe` / `test` blocks and parameterized patterns where possible:

```typescript
import { describe, test, expect } from "bun:test";
import { myFunction } from "./my-function";

describe("my-function", () => {
  test.each([
    { input: ..., expected: ... },
    { input: ..., expected: ... },
  ])("$input → $expected", ({ input, expected }) => {
    expect(myFunction(input)).toBe(expected);
  });

  test("throws on invalid input", () => {
    expect(() => myFunction(badInput)).toThrow();
  });
});
```

### 6. Verify

```bash
cd reference/<library-name>
bun test
```

All tests must pass. The reference implementation must be correct — it's the source of truth.

### 7. Validate the graph

Review the structured comments and verify:
- Every exported function has a `@node` tag
- `@depends-on` edges match the actual call graph
- Every node has a `@contract` pointing to an existing test file
- No circular dependencies

## File organization

```
reference/<library-name>/
  package.json
  tsconfig.json
  src/
    <node-a>.ts           — implementation
    <node-a>.test.ts      — tests (contract)
    <node-b>.ts
    <node-b>.test.ts
    index.ts              — re-exports (optional)
```

## Quality checklist

- [ ] Every exported function has a `@node` tag with unique kebab-case ID
- [ ] Every node has a `@contract` pointing to its test file
- [ ] `@depends-on` edges accurately reflect the call graph
- [ ] No circular dependencies
- [ ] Tests cover happy path, edge cases, and errors
- [ ] Reference implementation builds and all tests pass (`bun test`)
- [ ] Code is clear and straightforward — no metaprogramming, no clever abstractions
