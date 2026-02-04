# cron-schedule — Spec

Depends on: `cron-types`, `parser`, `matcher`, `next-occurrence`, `iterator`

## Purpose

Public API entry point — a facade that combines parsing, matching, next/previous
occurrence finding, and iteration into a single object.

## Function

`cronSchedule(expression: string) → CronSchedule`

## CronSchedule Interface

| Method | Signature | Description |
|--------|-----------|-------------|
| `expression` | `CronExpression` (property) | The parsed cron expression |
| `matches` | `(date: Date) → boolean` | Does this date match the schedule? |
| `next` | `(after: Date) → Date \| null` | Next occurrence after the given time |
| `prev` | `(before: Date) → Date \| null` | Previous occurrence before the given time |
| `nextN` | `(after: Date, count: number) → Date[]` | Next N occurrences |
| `iterate` | `(after: Date) → Generator<Date>` | Lazy iterator of future occurrences |

## Behavior

1. Parse the expression string via `parseCron`
2. Return an object with methods bound to the parsed expression
3. Throw on invalid expressions (delegates to `parseCron`)

## Test Vectors

| Expression | Operation | Input | Expected |
|------------|----------|-------|----------|
| `"0 12 * * *"` | `matches` | 2024-06-15 12:00 UTC | true |
| `"0 12 * * *"` | `matches` | 2024-06-15 13:00 UTC | false |
| `"0 0 * * *"` | `next` | 2024-01-01 12:00 UTC | 2024-01-02 00:00 UTC |
| `"0 0 * * *"` | `prev` | 2024-01-02 12:00 UTC | 2024-01-02 00:00 UTC |
| `"0 0 * * *"` | `nextN(_, 3)` | 2024-01-01 00:00 UTC | Jan 2, 3, 4 midnight |

## Error Cases

| Input | Error |
|-------|-------|
| `""` | Empty cron expression |
| `"invalid"` | Expected 5 fields |
| `"60 * * * *"` | Value out of range |
