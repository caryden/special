# Whenwords Translation Experiment — Results

## Experiment: REF format (Type-O reference) to Python, Rust, Go

### Setup

- **Source format**: REF (annotated TypeScript reference + colocated tests)
- **Model**: claude-opus-4-5-20251101
- **Reference library**: whenwords (5 nodes, 124 test cases, 100% coverage)
- **Methodology**: Agent received full reference source (implementation + tests) and was
  instructed to translate to each target language with tests, then run tests to verify.
- **Context**: Single-shot per language (fresh agent per translation)

### Results Summary

| Metric | Python | Rust | Go |
|--------|--------|------|----|
| **M1: First-pass pass rate** | 100% (122/122) | 100% (24/24) | 100% (15/15) |
| **M2: Iterations to 100%** | 1 | 1 | 1 |
| **M5: Total tokens** | TBD | TBD | TBD |
| **M7: Test preservation** | 122 pytest cases | 24 test fns (~124 assertions in loops) | 15 test fns (table-driven) |
| **M8: External dependencies** | 0 | 0 | 0 |

### Detailed Observations

#### Python
- **Test framework**: pytest with `@pytest.mark.parametrize`
- **Test case count**: 122 individual parametrized test cases (vs 124 reference)
  - 2 fewer because some edge cases were folded into parametrize tuples
- **Naming**: Idiomatic snake_case (`time_ago`, `parse_duration`, `human_date`, `date_range`)
- **Imports**: `math`, `re`, `datetime` (stdlib only)
- **Error model**: `ValueError` for invalid inputs (idiomatic Python)
- **First-pass result**: 122/122 passed, 0 failures

#### Rust
- **Test framework**: `#[cfg(test)]` with `#[test]` functions
- **Test case count**: 24 test functions, each containing loops over test vectors
  - All 124 reference test vectors are present as assertions within loops
- **Naming**: Idiomatic snake_case (`time_ago`, `parse_duration`, `human_date`, `date_range`)
- **Dependencies**: Zero — empty `[dependencies]` in Cargo.toml
- **Error model**: `Result<u64, String>` for `parse_duration` (idiomatic Rust)
- **UTC date handling**: Implemented civil_from_days algorithm (no chrono crate)
- **First-pass result**: 24/24 passed, 0 failures

#### Go
- **Test framework**: `testing` package with table-driven tests
- **Test case count**: 15 test functions with table-driven subtests
  - All reference test vectors present in test tables
- **Naming**: Idiomatic PascalCase exports (`TimeAgo`, `ParseDuration`, `HumanDate`, `DateRange`)
- **Dependencies**: Zero — standard library only (`fmt`, `math`, `regexp`, `strconv`, `strings`, `time`)
- **Error model**: `(int, error)` tuple return for `ParseDuration` (idiomatic Go)
- **First-pass result**: 15/15 passed, 0 failures

### Key Findings

1. **100% first-pass correctness across all three languages.** The Type-O reference
   provided enough information for the agent to produce correct implementations on the
   first attempt — no iteration needed.

2. **Zero external dependencies in all translations.** The agent correctly used only
   standard library facilities for each language.

3. **Test structure adapted idiomatically.** Rather than 1:1 mapping of test functions,
   each translation used the target language's conventions:
   - Python: `@pytest.mark.parametrize` (each vector = separate test case)
   - Rust: loops over vector arrays within `#[test]` functions
   - Go: table-driven tests with struct slices

4. **Naming conventions translated correctly.** `timeAgo` → `time_ago` (Python/Rust),
   `TimeAgo` (Go). `parseDuration` → `parse_duration` / `ParseDuration`.

5. **Error handling adapted to each language.** TypeScript `throw new Error` became
   Python `raise ValueError`, Rust `Err(String)`, Go `error` return.

6. **Date/time handling varied.** Python used `datetime`, Go used `time` package,
   Rust implemented civil date calculation from scratch (no external crate).

### Limitations of This Run

- **Single run per language** — the methodology calls for 3 runs per combination to
  account for non-determinism. This is a pilot run.
- **Token counts not captured** — need API-level instrumentation to capture M3/M4/M5.
- **Idiomatic quality not scored** — M6 requires manual review with a rubric.
- **Not a clean "fresh context" experiment** — translations were done by sub-agents
  within a session that had access to the full reference. A proper experiment would
  use completely isolated sessions.

### Next Steps

- [ ] Run SPEC and PROMPT format experiments for comparison
- [ ] Capture token usage metrics (M3, M4, M5)
- [ ] Run 3x repetitions per combination
- [ ] Score idiomatic quality (M6)
- [ ] Add C# translation (once dotnet is available)
