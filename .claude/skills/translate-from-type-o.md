# Skill: Translate from a Type-O Reference to a Target Language

## When to use

When the user wants to generate a native implementation of one or more nodes from a
Type-O reference library in their target language.

## Prerequisites

- A Type-O reference library (TypeScript source with `@node` structured comments)
- A skill layer (preferred): `experiments/<lib>-skill/` with `skill.md`, per-node
  `spec.md`, and `to-<lang>.md` files
- A target language and project for the output

## Process

### 1. Progressive disclosure: read the skill layers

Follow this order, stopping at the layer that provides enough information:

**Layer 1 — Skill overview** (`experiments/<lib>-skill/skill.md`):
- Node graph and dependencies
- Subset extraction patterns (which nodes are needed)
- Design decisions and off-policy defaults

**Layer 2 — Node specs** (`experiments/<lib>-skill/nodes/<name>/spec.md`):
- Behavioral specification per node
- Test vectors with `@provenance` annotations
- Cross-library validated vectors (if available)
- Algorithm descriptions

**Layer 3 — Translation hints** (`experiments/<lib>-skill/nodes/<name>/to-<lang>.md`):
- Language-specific type mappings and idioms
- Implementation guidance for the target language

**Layer 4 — TypeScript reference** (`reference/<lib>/src/<name>.ts`):
- Consult only if the spec is ambiguous or unclear
- The reference is the authoritative source for exact behavior
- Track what you consulted and why (this generates improvement signals)

If no skill layer exists, fall back to reading `.ts` source files directly
(the original ref-only workflow described below).

### 2. Plan the translation order

Identify the nodes needed (subset or full library). Topologically sort them —
leaf nodes first, composite nodes after their dependencies:

```
Translation Plan: <requested-node> → <target-language>
Subset: <which nodes>

1. <leaf-node-a> (pure — no dependencies)
2. <leaf-node-b> (pure — no dependencies)
3. <composite-node> (depends: leaf-node-a, leaf-node-b)
```

Confirm scope with the user before proceeding.

### 3. Execute the plan, node by node

For each node in topological order:

#### a. Read the spec and translation hints

Read `spec.md` and `to-<lang>.md` for this node. If anything is ambiguous,
consult the TypeScript reference (`reference/<lib>/src/<name>.ts`).

**Important**: Track every time you consult the reference and why. This is
valuable feedback — it identifies spec ambiguities that should be fixed.

#### b. Generate implementation + tests

Generate both the implementation and tests together. Tests should cover:
- All test vectors from the spec
- Behavioral tests (edge cases, error conditions)
- Purity checks (vector operations don't mutate inputs)

#### c. Run tests for this node

Run the tests. All must pass before proceeding.
If tests fail, fix the implementation — do not modify the test expectations
(unless they don't match the spec).

#### d. Move to the next node

The translated node's public interface is now available for subsequent nodes.

### 4. Final verification

After all nodes are translated:
- Run the complete test suite
- Report pass/fail count
- Document which files were consulted (all four layers)
- Document whether the TypeScript reference was needed, and for what

### 5. Report translation feedback

If you consulted the TypeScript reference, report the ambiguities found.
Each ambiguity is a potential spec improvement. Format:

```
## Translation Feedback

### Ambiguity: <brief description>
- **Spec says**: <what the spec says>
- **Reference does**: <what the TypeScript code does>
- **Resolution**: <how you resolved it>
- **Suggested fix**: <how to improve the spec>
```

## Ref-only fallback (when no skill layer exists)

If there is no `experiments/<lib>-skill/` directory, fall back to reading
the TypeScript source files directly:

1. Read all `.ts` source files in the reference library
2. Parse `@node`, `@depends-on`, `@contract`, `@hint` from JSDoc comments
3. Build the dependency graph and compute transitive closure
4. Translate in topological order, tests first, then implementation
5. Run tests after each node

## Translation guidelines

### General rules
- Never modify test expectations to make them pass — if a test fails, the implementation is wrong
- Use the target language's native error handling (exceptions, Result types, error returns)
- Prefer the target language's standard library over adding dependencies
- Generated code should look like a human wrote it in the target language
- Zero external dependencies is the goal

### Common TypeScript → target patterns

| TypeScript pattern | Python | Rust | Go |
|-------------------|--------|------|-----|
| `export function` | module function | `pub fn` | exported function |
| `interface` / `type` | dataclass / TypedDict | struct | struct |
| `number` | int / float | i64 / f64 | int64 / float64 |
| `string` | str | String / &str | string |
| `throw new Error()` | raise ValueError | return Err() / panic | return error |
| `T \| null` | Optional[T] | Option<T> | pointer / ok pattern |
| `Record<K, V>` | dict[K, V] | HashMap<K, V> | map[K]V |

### Handling @hint categories

- **`pattern:`** — Adopt the suggested target idiom
- **`platform:`** — Use the target's native or best-in-class library
- **`perf:`** — Ensure the implementation meets the stated complexity/performance bound
- **`adapt:`** — Stop and ask the user. Present the hint and the available options
  in the target language.
