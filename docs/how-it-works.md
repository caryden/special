# How Special Skills Work

## The Skill Format

Each skill uses **progressive disclosure** — four layers read in order, each adding detail only when needed:

1. **SKILL.md** — Overview: what the skill does, the node graph, subset extraction guidance, design decisions, YAML frontmatter
2. **nodes/\<name\>/spec.md** — Per-node behavioral specification with test vectors, edge cases, and `@provenance` annotations
3. **nodes/to-\<lang\>.md** and **nodes/\<name\>/to-\<lang\>.md** — Optional translation hints, accumulated from real translation experience. Skill-level hints capture patterns common across all nodes; node-level hints capture node-specific friction (e.g., "Rust: use `Box<>` for recursive children")
4. **reference/src/\<name\>.ts** — TypeScript source code, consulted only if the spec is ambiguous

The agent starts with the lightest layer and escalates only when disambiguation is needed. Experiments showed this matches full-reference correctness at a fraction of the token cost.

## Node Structure

Each node in a skill represents a discrete unit of functionality: a function, a data type, or a small cohesive module. One source file per node, one test file per node.

Each node carries:

- **Identity** — A unique kebab-case identifier (`@node nelder-mead`)
- **Reference implementation** — Working, executable TypeScript with 100% test coverage
- **Tests** — A linked test file (`@contract nelder-mead.test.ts`) defining the behavioral contract. 100% line and function coverage required — uncovered code is unverifiable after translation
- **Dependencies** — Declared edges to other nodes (`@depends-on`). Supports `any-of(a, b, c)` for dispatcher nodes that need at least one from a group
- **Metadata** — Translation hints (`@hint`), provenance (`@provenance`), descriptions

A node is either **pure** (no `@depends-on` — a leaf in the graph) or **composite** (depends on other nodes).

## Structured Comment Vocabulary

Node metadata is declared via JSDoc-style comments on exported functions:

```typescript
/**
 * L-BFGS optimization algorithm.
 *
 * @node l-bfgs
 * @depends-on line-search, convergence-check, vec-ops
 * @contract l-bfgs.test.ts
 * @hint platform: Target should use platform BLAS for vec-ops if available
 * @provenance optim-jl v2.0.0, verified 2026-01-15
 */
export function lbfgs(objective: (x: number[]) => number, x0: number[], opts?: MinOptions): MinResult {
  // ...
}
```

| Tag | Purpose |
|-----|---------|
| `@node` | Unique kebab-case identifier for this node |
| `@depends-on` | Dependency edges. `a, b` means all required; `any-of(a, b)` means at least one |
| `@contract` | Path to the test file that defines the behavioral contract |
| `@hint` | Translation guidance — platform concerns, performance expectations, adaptation strategies |
| `@provenance` | Source library and version used for cross-validation |

The code *is* the reference implementation. The comments *are* the graph. The agent reads `.ts` files directly — no compilation, no reflection, no tooling required.

## Selective Extraction

When a consumer requests a node, the agent computes its **transitive closure** from `@depends-on` tags — that node plus every node reachable through its dependency edges. Nothing else.

Example: requesting `nelder-mead` from the optimization skill yields:

```
nelder-mead → convergence-check
            → nelder-mead-state
            → types (shared type definitions)
```

The consumer gets 4 nodes. Not the 17 other optimization algorithms, not the line search variants, not the gradient utilities.

The `@depends-on` graph is the mechanism for extracting subsets. Need only `debounce` from a utility skill? Extract the `debounce` node and its transitive closure. The skill is a menu, not a monolith.

## Agent Translation Workflow

The agent reads the skill, builds the dependency graph, computes the transitive closure for the requested nodes, and produces a topologically sorted translation plan — leaf nodes first, composite nodes after their dependencies.

| Step | Done by | Input | Output |
|------|---------|-------|--------|
| **Read** skill overview | Agent | SKILL.md | Scope, node graph, design context |
| **Plan** translation order | Agent | Dependency graph | Topologically sorted task list (leaves first) |
| **Translate** each node | Agent | spec.md + to-{lang}.md for one node | Native implementation + tests |
| **Verify** at each step | Agent + test runner | Generated code + translated tests | Pass/fail per node |
| **Escalate** if needed | Agent | reference/src/{node}.ts | Disambiguation from reference |

Key properties:

- **Minimal context per step.** The agent works on one node at a time — just the current node's spec, translation hints, and the interfaces of previously-translated dependencies.
- **Topological ordering.** The agent never translates a node before its dependencies exist in the target language.
- **Verifiable at each step.** Tests run after each node translation, not just at the end. Failures are caught early and localized.
- **Translation hints are inline and optional.** When present, platform-specific guidance is attached at the skill level (`nodes/to-{lang}.md`) or per node (`nodes/{node}/to-{lang}.md`). Hints accumulate from real translation experience — they reduce iteration count but aren't required for correctness.

## Evaluation Criteria

The skill format was designed against a rubric validated through staged experiments:

### Agent Effectiveness

- **Translation accuracy** — Does the agent produce correct implementations on first pass? Measured by test pass rate.
- **Semantic transparency** — Does every token map to behavioral meaning? Metaprogramming and heavy abstraction reduce transparency.
- **Context efficiency** — How many tokens of input for correct output? Affects cost and context window pressure.
- **Training distribution alignment** — Does the representation match patterns the agent has seen in training?

### Reference Quality

- **Modularity** — Can individual nodes be extracted independently?
- **Test completeness** — Do tests fully specify the behavioral contract? 100% coverage required.
- **Executability** — Can the reference and its tests be run directly?
- **Type expressiveness** — Does the type system capture important structural constraints?

### Practical Viability

- **Authoring cost** — Can developers create and maintain skills using existing tooling?
- **Incremental adoption** — Can existing libraries be converted by adding structured comments?
- **Human reviewability** — Can a developer audit the reference to understand what they're asking an agent to build?

### Boundary Conditions

- **Performance-critical code** — Libraries whose value is the implementation itself (BLAS, FFmpeg) need performance annotations or platform bindings, not naive translation.
- **Security-sensitive code** — Constant-time execution and side-channel resistance can't be captured by behavioral tests alone.
- **The sweet spot** — Logic-heavy, platform-independent code: algorithms, protocols, data structures, transformations, business rules.

## Creating a Skill

The `create-special-skill` meta-skill automates skill creation. It guides you through defining nodes, writing specs, creating the reference implementation, and ensuring 100% test coverage.

```
/create-special-skill
```

See `skills/create-special-skill/SKILL.md` for the full process, including templates for `spec.md`, `to-{lang}.md`, and `SKILL.md` files.
