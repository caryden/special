# tokenizer — Spec

Depends on: none (leaf node)

## Purpose

Split a cron expression string into exactly 5 raw field strings by whitespace.
Does not parse field contents — that is the parser's responsibility.

## Function

`tokenize(expression: string) → [string, string, string, string, string]`

## Behavior

- Trim leading/trailing whitespace
- Split on one or more whitespace characters (space, tab, newline)
- Throw if empty or whitespace-only input
- Throw if result is not exactly 5 fields

## Test Vectors

| Input | Expected |
|-------|----------|
| `"0 12 * * 1-5"` | `["0", "12", "*", "*", "1-5"]` |
| `"0   12   *   *   1-5"` | `["0", "12", "*", "*", "1-5"]` |
| `"  0 12 * * 1-5  "` | `["0", "12", "*", "*", "1-5"]` |
| `"*/15 0,12 1-15 1,6 MON-FRI"` | `["*/15", "0,12", "1-15", "1,6", "MON-FRI"]` |

## Error Cases

| Input | Error |
|-------|-------|
| `""` | Empty cron expression |
| `"   \t  "` | Empty cron expression |
| `"0 12 * *"` | Expected 5 fields but got 4 |
| `"0 0 12 * * 1-5"` | Expected 5 fields but got 6 |
