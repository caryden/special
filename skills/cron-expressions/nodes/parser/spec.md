# parser — Spec

Depends on: `cron-types`, `field-range`, `tokenizer`

## Purpose

Parse a cron expression string into a structured CronExpression AST.
Handles all standard cron syntax plus Vixie/Quartz extensions.

## Function

`parseCron(expression: string) → CronExpression`

## Behavior

@provenance Vixie cron 4.1, POSIX.1-2017 crontab(5)

1. Tokenize into 5 fields via `tokenize()`
2. For each field, parse comma-separated parts
3. Each part is one of:
   - `*` → range from field min to max (wildcard)
   - `N` → single value (number or name alias)
   - `N-M` → range from N to M
   - `X/S` → step: X can be `*`, `N-M`, or `N` (which becomes `N-max`)
   - `L` → last day (dayOfMonth only)
   - `NL` → last Nth weekday (dayOfWeek only)
   - `N#M` → Mth occurrence of weekday N (dayOfWeek only, M must be 1-5)
   - `NW` → nearest weekday to Nth day (dayOfMonth only)

### Name aliases

- Month field: JAN-DEC (case-insensitive) → 1-12
- Day-of-week field: SUN-SAT (case-insensitive) → 0-6

### Sunday normalization

@provenance Vixie cron 4.1

Day-of-week value `7` is normalized to `0` (both mean Sunday).

## Test Vectors

@provenance Vixie cron 4.1, POSIX.1-2017

| Input | minute | hour | dayOfMonth | month | dayOfWeek |
|-------|--------|------|-----------|-------|-----------|
| `"* * * * *"` | range(0,59) | range(0,23) | range(1,31) | range(1,12) | range(0,6) |
| `"0 12 15 6 3"` | value(0) | value(12) | value(15) | value(6) | value(3) |
| `"*/15 * * * *"` | step(range(0,59), 15) | ... | ... | ... | ... |
| `"10-20/3 * * * *"` | step(range(10,20), 3) | ... | ... | ... | ... |
| `"0,15,30,45 * * * *"` | [value(0), value(15), value(30), value(45)] | ... | ... | ... | ... |
| `"* * * JAN *"` | ... | ... | ... | value(1) | ... |
| `"* * * * MON-FRI"` | ... | ... | ... | ... | range(1,5) |
| `"* * * * 7"` | ... | ... | ... | ... | value(0) |
| `"0 0 L * *"` | ... | ... | last() | ... | ... |
| `"0 0 * * 5L"` | ... | ... | ... | ... | lastWeekday(5) |
| `"0 0 * * 5#3"` | ... | ... | ... | ... | nthWeekday(5, 3) |
| `"0 0 15W * *"` | ... | ... | nearestWeekday(15) | ... | ... |

## Error Cases

| Input | Error |
|-------|-------|
| `"60 * * * *"` | Value out of range for minute |
| `"0 24 * * *"` | Value out of range for hour |
| `"0 0 32 * *"` | Value out of range for dayOfMonth |
| `"0 0 * 13 *"` | Value out of range for month |
| `"0 0 * * 8"` | Value out of range for dayOfWeek |
| `"*/0 * * * *"` | Invalid step value |
| `"0 0 * * 5#0"` | Invalid nth value (must be 1-5) |
| `"0 0 * * 5#6"` | Invalid nth value (must be 1-5) |
