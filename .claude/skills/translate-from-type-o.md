# Skill: Translate from a Type-O Reference to a Target Language

## When to use

When the user wants to generate a native implementation of one or more nodes from a
Type-O reference library in their target language.

## Prerequisites

- A built Type-O reference library (compiled .dll/.jar with [Node] attributes)
- The TypeO.Extract tool at `src/TypeO.Extract/`
- A target language and project for the output

## Process

### 1. Extract the translation plan

Run the extraction tool for the requested node(s):

```bash
dotnet run --project src/TypeO.Extract/ -- \
    reference/<LibraryName>/bin/Debug/net8.0/<LibraryName>.dll \
    <requested-node-id> \
    --source-dir reference/<LibraryName>/
```

This produces a topologically sorted translation plan. Review it with the user
to confirm scope (they may want more or fewer nodes).

### 2. Execute the plan, node by node

For each task in the plan, in order:

#### a. Translate tests first

Read the C# test class linked by `[Contract]`. Translate the test cases to the
target language's test framework:
- `[Theory] + [InlineData]` → parameterized tests (pytest.mark.parametrize, #[test_case], etc.)
- `[Fact]` → individual test functions
- `Assert.Equal` → target equivalent
- `Assert.Throws<T>` → target equivalent for error cases

The translated tests must be runnable but will initially fail (no implementation yet).

#### b. Translate the implementation

Read the C# reference implementation for this node. Translate to the target language:
- Preserve the behavioral contract exactly
- Use idiomatic target language patterns (don't write C# in Python)
- Respect any `[TranslationHint]` annotations on this node
- If a hint has `Category = "adapt"`, ask the user how they want to handle it

#### c. Run tests for this node

Run only the tests for the node just translated. All must pass before proceeding.
If tests fail, fix the translation — do not modify the test expectations.

#### d. Move to the next node

The translated node's public interface is now available for subsequent nodes
that depend on it.

### 3. Final verification

After all nodes are translated:
- Run the complete test suite
- Report pass/fail count vs. expected from the translation plan
- Flag any nodes where hints with `Category = "adapt"` were resolved — document
  the user's choices for future reference

## Translation guidelines

### General rules
- Never modify test expectations to make them pass — if a test fails, the implementation is wrong
- Use the target language's native error handling (exceptions, Result types, error returns)
- Prefer the target language's standard library over adding dependencies
- Generated code should look like a human wrote it in the target language

### Common C# → target patterns

| C# pattern | Python | Rust | TypeScript | Go |
|------------|--------|------|------------|-----|
| `static method` | module function | `pub fn` | exported function | exported function |
| `record` | dataclass | struct | interface + factory | struct |
| `string` | str | String / &str | string | string |
| `long` (unix timestamp) | int | i64 | number | int64 |
| `TimeSpan` | timedelta | Duration | number (ms) | time.Duration |
| `ArgumentException` | ValueError | custom error / anyhow | Error / throw | error return |
| `[Flags] enum` | IntFlag | bitflags! | const enum | iota |

### Handling [TranslationHint] categories

- **"platform"**: Use the target's native or best-in-class library (e.g., NumPy for Python, nalgebra for Rust)
- **"pattern"**: Adopt the suggested target idiom
- **"perf"**: Ensure the implementation meets the stated complexity/performance bound
- **"adapt"**: Stop and ask the user. Present the hint and the available options in the target language.
  Use the ask user question tool if available.
