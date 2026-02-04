# next-occurrence — Spec

Depends on: `cron-types`, `matcher`

## Purpose

Find the next (or previous) UTC datetime that matches a parsed cron expression,
starting from a given reference time.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `nextOccurrence` | `(expr: CronExpression, after: Date) → Date \| null` | Find next match after the given time |
| `prevOccurrence` | `(expr: CronExpression, before: Date) → Date \| null` | Find previous match before the given time |

## Algorithm

@provenance cron-parser (npm), croniter (Python) — minute-scanning approach

1. Round `after` to the next whole minute (truncate seconds/ms, add 1 minute)
2. Test the candidate against the cron expression using `matchesCron`
3. If it matches, return it
4. Otherwise, advance by 1 minute and repeat
5. If no match found within ~1 year of minutes (526,960 iterations), return null

`prevOccurrence` works identically but decrements by 1 minute.

### Why minute-scanning

The minute-scanning approach is simpler and more correct than field-walking for
expressions with L/W/# modifiers. Performance is acceptable — worst case is
~500K iterations for an expression that only matches once per year.

## Test Vectors

@provenance cron-parser v5.0.0, verified 2025-01-20

| Expression | After (UTC) | Expected Next |
|------------|------------|---------------|
| `* * * * *` | 2024-01-01 00:00 | 2024-01-01 00:01 |
| `0 * * * *` | 2024-01-01 00:30 | 2024-01-01 01:00 |
| `0 0 * * *` | 2024-01-01 00:00 | 2024-01-02 00:00 (excludes start) |
| `0 0 * * 1` | 2024-01-01 00:00 | 2024-01-08 00:00 (next Monday) |
| `0 0 L * *` | 2024-01-01 00:00 | 2024-01-31 00:00 |
| `0 0 L 2 *` | 2024-01-01 00:00 | 2024-02-29 00:00 (leap year) |
| `0 0 L 2 *` | 2025-01-01 00:00 | 2025-02-28 00:00 (non-leap) |
| `0 0 * * 5#3` | 2024-01-01 00:00 | 2024-01-19 00:00 (third Friday) |

### prevOccurrence

| Expression | Before (UTC) | Expected Prev |
|------------|-------------|---------------|
| `* * * * *` | 2024-01-01 00:05 | 2024-01-01 00:04 |
| `0 0 * * *` | 2024-01-02 12:00 | 2024-01-02 00:00 |
| `0 0 * * 1` | 2024-01-03 00:00 | 2024-01-01 00:00 (previous Monday) |

## Edge Cases

- Start time with non-zero seconds is rounded to next minute
- Start time itself is always excluded
- Returns null for impossible expressions (e.g., `0 0 31 2 *`)
- Crosses year boundaries correctly
