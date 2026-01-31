# Skill: Translate from a Type-O Reference to a Target Language

## When to use

When the user wants to generate a native implementation of one or more nodes from a
Type-O reference library in their target language.

## Prerequisites

- A Type-O reference library (TypeScript source with `@node` structured comments)
- A target language and project for the output

## Process

### 1. Read the reference and build the graph

Read all `.ts` source files in the reference library. For each file, parse the
structured JSDoc comments to identify:
- Node IDs (`@node`)
- Dependencies (`@depends-on`)
- Test files (`@contract`)
- Translation hints (`@hint`)

Build the dependency graph mentally and identify the transitive closure for the
requested node(s).

### 2. Plan the translation order

Topologically sort the nodes in the closure — leaf nodes (no dependencies) first,
composite nodes after their dependencies. Present the plan to the user:

```
Translation Plan: <requested-node> → <target-language>
Source: reference/<library-name>/

1. <leaf-node-a> (pure — no dependencies)
2. <leaf-node-b> (pure — no dependencies)
3. <composite-node> (depends: leaf-node-a, leaf-node-b)
```

Confirm scope with the user before proceeding.

### 3. Execute the plan, node by node

For each node in topological order:

#### a. Translate tests first

Read the test file linked by `@contract`. Translate the test cases to the
target language's test framework:
- `test.each([...])` → parameterized tests in the target
- `expect(...).toBe(...)` → target assertion equivalent
- `expect(() => ...).toThrow()` → target error assertion
- Preserve test names and structure

The translated tests should be runnable but will initially fail (no implementation yet).

#### b. Translate the implementation

Read the TypeScript reference implementation for this node. Translate to the
target language:
- Preserve the behavioral contract exactly
- Use idiomatic target language patterns (don't write TypeScript in Python)
- Respect any `@hint` annotations on this node
- If a hint has category `adapt:`, ask the user how they want to handle it

#### c. Run tests for this node

Run only the tests for the node just translated. All must pass before proceeding.
If tests fail, fix the translation — do not modify the test expectations.

#### d. Move to the next node

The translated node's public interface is now available for subsequent nodes
that depend on it.

### 4. Final verification

After all nodes are translated:
- Run the complete test suite
- Report pass/fail count
- Flag any nodes where `adapt:` hints were resolved — document the user's choices

## Translation guidelines

### General rules
- Never modify test expectations to make them pass — if a test fails, the implementation is wrong
- Use the target language's native error handling (exceptions, Result types, error returns)
- Prefer the target language's standard library over adding dependencies
- Generated code should look like a human wrote it in the target language

### Common TypeScript → target patterns

| TypeScript pattern | Python | Rust | Go | C# |
|-------------------|--------|------|-----|-----|
| `export function` | module function | `pub fn` | exported function | `public static` method |
| `interface` / `type` | dataclass / TypedDict | struct | struct | record / class |
| `number` | int / float | i64 / f64 | int64 / float64 | long / double |
| `string` | str | String / &str | string | string |
| `throw new Error()` | raise ValueError | return Err() / panic | return error | throw Exception |
| `T \| null` | Optional[T] | Option<T> | pointer / ok pattern | T? |
| `Record<K, V>` | dict[K, V] | HashMap<K, V> | map[K]V | Dictionary<K, V> |

### Handling @hint categories

- **`pattern:`** — Adopt the suggested target idiom
- **`platform:`** — Use the target's native or best-in-class library
- **`perf:`** — Ensure the implementation meets the stated complexity/performance bound
- **`adapt:`** — Stop and ask the user. Present the hint and the available options
  in the target language. Use the ask user question tool if available.
