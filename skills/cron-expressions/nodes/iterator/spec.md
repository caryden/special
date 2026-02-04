# iterator — Spec

Depends on: `cron-types`, `next-occurrence`

## Purpose

Provide lazy iteration over successive datetimes matching a cron expression,
and a convenience function for getting the next N occurrences.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `cronIterator` | `(expr: CronExpression, after: Date) → Generator<Date>` | Lazy generator of matching datetimes |
| `nextN` | `(expr: CronExpression, after: Date, count: number) → Date[]` | Array of next `count` occurrences |

## Algorithm

### cronIterator

1. Start with `current = after`
2. Call `nextOccurrence(expr, current)` to find the next match
3. If null, stop (generator returns)
4. Yield the match
5. Set `current = match` and go to step 2

### nextN

1. Create a `cronIterator(expr, after)`
2. Pull `count` values from the iterator
3. Return as an array (fewer if generator exhausts early)

## Test Vectors

@provenance cron-parser v5.0.0

### cronIterator

| Expression | After | First 3 Yields |
|------------|-------|----------------|
| `* * * * *` | 2024-01-01 00:00 | 00:01, 00:02, 00:03 |
| `0 * * * *` | 2024-01-01 00:00 | 01:00, 02:00, 03:00 |
| `*/15 * * * *` | 2024-01-01 00:00 | 00:15, 00:30, 00:45 |
| `0 0 * * 5` | 2024-01-01 00:00 | Jan 5, Jan 12, Jan 19 (Fridays) |

### nextN

| Expression | After | Count | Result |
|------------|-------|-------|--------|
| `0 0 * * *` | 2024-01-01 00:00 | 5 | Jan 2-6 midnight |
| `0 0 L * *` | 2024-01-01 00:00 | 3 | Jan 31, Feb 29, Mar 31 |
| `0 0 31 2 *` | 2024-01-01 00:00 | 5 | [] (impossible) |

## Edge Cases

- Generator stops when `nextOccurrence` returns null (impossible expression)
- `nextN(expr, after, 0)` returns empty array
- Generator yields indefinitely for valid expressions (no built-in limit)
