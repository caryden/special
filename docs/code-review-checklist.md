# Code Review Checklist

Criteria checked during CI code review. Contributors should self-review against this
checklist before opening a PR.

## Test coverage

- [ ] **100% line and function coverage required — no exceptions**
- [ ] Run `cd skills/<skill>/reference && bun test --coverage` to verify
- [ ] Tests are the behavioral contract; uncovered code is unverifiable after translation

## Structured comment format

Every exported function in a node must have JSDoc-style metadata:

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

### Required tags

- [ ] `@node` — kebab-case identifier matching the file name
- [ ] `@contract` — links to the test file (one test file per node)

### Dependency tags

- [ ] `@depends-on a, b, c` — node needs all listed dependencies
- [ ] `@depends-on any-of(a, b, c)` — node needs at least one from the group
- [ ] Mixed: `@depends-on base, any-of(alg-a, alg-b)` — base always required, one algorithm required

The `any-of()` modifier is for dispatcher nodes that import multiple implementations
but only require one at translation time.

### Optional tags

- [ ] `@hint` — translation guidance for specific languages or patterns
- [ ] `@provenance` — documents source library and validation date

## Naming conventions

- [ ] Skill names: whole-word kebab-case nouns (`optimization`, `math-expression-parser`)
- [ ] Node IDs: kebab-case (`nelder-mead`, `parse-duration`, `token-types`)
- [ ] Node ID matches filename: `foo-bar.ts` exports node `@node foo-bar`

## Code quality

- [ ] Reference implementations prioritize clarity over performance
- [ ] No metaprogramming or dynamic dispatch in reference code
- [ ] All functions are pure where possible; state and I/O are explicit
- [ ] No external dependencies in reference implementations

## Test vectors

- [ ] Test vectors include `@provenance` annotations documenting source and validation
- [ ] Cross-library validation against established implementations where applicable
- [ ] Edge cases and error conditions are covered

## Spec files

Each node in `nodes/<name>/` should have:

- [ ] `spec.md` — behavioral spec with test vectors and provenance
- [ ] `to-<lang>.md` — optional translation hints for specific languages

## Dependency graph

- [ ] All `@depends-on` references point to existing nodes
- [ ] No circular dependencies
- [ ] Dependency graph in SKILL.md matches actual `@depends-on` declarations
