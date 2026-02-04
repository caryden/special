# ADR-0003: Cross-Skill Dependencies via `@depends-on` Syntax Extension

**Date:** 2026-02-03
**Status:** Proposed
**Deciders:** caryden

## Context

The robotics skill's `mpc` (Model Predictive Control) node requires an optimization solver
for its inner loop. The optimization skill already provides `bfgs` and `l-bfgs` nodes with
verified reference implementations and 539 tests.

Duplicating these nodes in the robotics skill violates the core thesis: skills should be
unbundled, and consumers should install only what they need. If MPC is the only robotics
algorithm that needs optimization, the robotics skill shouldn't ship its own optimizer.

This is not unique to MPC. Other identified cases:
- Pose graph optimization -> optimization:newton-trust-region (nonlinear least squares on manifolds)
- Advanced IK (Levenberg-Marquardt) -> optimization:bfgs (could reuse optimization infrastructure)

The current `@depends-on` syntax only supports intra-skill references:
```
@depends-on mat-ops, rotation-ops   // nodes within the same skill
```

We need a mechanism for nodes in one skill to depend on nodes in another skill.

## Decision

Extend the `@depends-on` syntax to support cross-skill references using `skill:node` notation:

```typescript
/**
 * @node mpc
 * @depends-on mat-ops, state-types, result-types    // intra-skill
 * @depends-on optimization:bfgs                      // cross-skill
 * @contract mpc.test.ts
 */
```

### Syntax

`@depends-on <skill-name>:<node-name>`

Where:
- `skill-name` is the kebab-case name of the dependency skill (matches the skill directory name)
- `node-name` is the kebab-case node ID within that skill
- Multiple cross-skill deps can appear on one line: `@depends-on optimization:bfgs, optimization:vec-ops`
- Cross-skill deps can be mixed with intra-skill deps on the same line (the colon disambiguates)
- `any-of()` works with cross-skill deps: `@depends-on any-of(optimization:bfgs, optimization:l-bfgs)`

### No Versioning

Skills are **spec-time generation inputs**, not runtime dependencies. When the agent translates
a node with a cross-skill dependency:

1. It reads the referenced node's spec from the other skill's directory
2. It includes the referenced node (and its transitive closure) in the translation
3. The generated code is self-contained -- no runtime dependency on the other skill

If the upstream skill later updates a node, previously generated code is unaffected.
The next generation simply uses the updated spec. This is fundamentally different from
package manager versioning (npm, cargo, pip) where version constraints prevent breaking changes
at install time.

**Consequence**: No `@version` or `@compatible-with` annotations needed. The skill format's
"generate once, run forever" model eliminates version compatibility concerns.

### Agent Workflow

When the agent encounters `@depends-on optimization:bfgs`:

1. **Parse**: Detect the colon separator -- cross-skill reference
2. **Resolve**: Look up `skills/optimization/` in the user's installed plugins
3. **Check availability**: If the optimization skill is not installed:
   - Prompt: "The `mpc` node depends on `bfgs` from the `optimization` skill. Install it?"
   - If declined, abort with clear error message
4. **Compute transitive closure**: Read `optimization/reference/src/bfgs.ts` for its `@depends-on`
   (e.g., bfgs -> vec-ops, line-search, strong-wolfe). Include all transitive deps.
5. **Read specs**: For each referenced node, read its spec.md, to-{lang}.md hints, and reference source
6. **Merge**: Combine nodes from both skills into a single translation. Name conflicts are impossible
   because the node IDs include the skill prefix in the generated module structure.
7. **Generate**: Translate all nodes (from both skills) into the target language as a single coherent output

### Plugin Manifest Extension

The `.claude-plugin/plugin.json` can optionally declare `peerDependencies`:

```json
{
  "name": "robotics",
  "skills": ["robotics"],
  "peerDependencies": {
    "optimization": {
      "nodes": ["bfgs", "l-bfgs", "vec-ops"],
      "reason": "Required by mpc node for inner NLP solve",
      "optional": true
    }
  }
}
```

This is **advisory** -- the agent discovers actual dependencies from `@depends-on` at generation time.
The manifest serves three purposes:
1. Documentation: Users can see what skills work together
2. Tooling: A marketplace could suggest installing optimization when robotics is installed
3. Validation: CI could verify that declared peer dependencies match actual `@depends-on` references

The `optional: true` flag means the robotics skill works without optimization -- only `mpc` needs it.

## Alternatives Considered

### Alternative 1: Duplicate Nodes

Copy the optimization nodes (bfgs, vec-ops, line-search, etc.) into the robotics skill.

**Rejected because:**
- Violates the unbundling thesis
- Creates maintenance burden (two copies of the same algorithm)
- Increases the robotics skill size for consumers who don't use MPC
- Test vectors and cross-validation would need duplication

### Alternative 2: Shared "foundation" skill

Create a `foundation` skill containing shared infrastructure (vec-ops, mat-ops, etc.) that both
optimization and robotics depend on.

**Rejected because:**
- Forces a third install for basic usage
- The overlap is actually small (only MPC + pose graph + advanced IK need optimization)
- Most robotics consumers don't need optimization at all
- Adds a layer of indirection that complicates the mental model

### Alternative 3: Runtime linking (import at generation time)

Instead of `@depends-on`, have the agent generate `import` statements that reference
the other skill's generated output.

**Rejected because:**
- Breaks the "generated code is self-contained" guarantee
- Requires both skills to be generated to the same target language simultaneously
- Introduces runtime dependency management (the thing we're trying to avoid)

### Alternative 4: Monorepo / single large skill

Put everything (optimization + robotics + future skills) in one giant skill.

**Rejected because:**
- Defeats the purpose of unbundling
- Node graph becomes unwieldy (50+ nodes)
- Consumers who want "just PID" shouldn't see optimization algorithms
- Different skills may have different maturity levels and update cadences

## Consequences

### Positive

- Skills remain independent and unbundled
- Consumers only install what they need
- Cross-validation and provenance remain with the originating skill
- No version management complexity
- Natural evolution: if cross-skill deps become common, the mechanism scales

### Negative

- Agent must handle multi-skill resolution (new code path)
- Users may be surprised by "install this other skill" prompts
- The transitive closure can span multiple skills, making it harder to predict total output size
- Testing cross-skill deps requires both skills to be present in CI

### Neutral

- No changes needed to the `@depends-on` parser for intra-skill deps (the colon is unambiguous)
- Existing skills are unaffected unless they add cross-skill references

## Validation Plan

The robotics skill's `mpc` node (Stage 4) will be the first test:

1. Implement `mpc` with `@depends-on optimization:bfgs`
2. Verify the agent correctly:
   - Detects the cross-skill reference
   - Computes transitive closure across both skills
   - Prompts for optimization skill installation if needed
   - Generates correct, self-contained code in the target language
3. Translate to Python, Rust, and Go (the same 3 languages used for optimization cross-validation)
4. Run MPC tests to verify the optimization solver works correctly in the robotics context

## References

- [ADR-0002](0002-type-o-language-typescript-bun.md) -- TypeScript + Bun as Type-O language
- [hypothesis.md](../hypothesis.md) -- project hypothesis and evaluation rubric
- [skill-architecture.md](../skill-architecture.md) -- skill format design
