# duration

Formats a number of seconds as a human-readable duration string.

## Function signature

```
duration(seconds: integer, options?: { compact?: boolean, max_units?: integer }) -> string
```

- `seconds` — Non-negative integer (throws on negative)
- `options.compact` — Boolean, default false. Use abbreviated units ("2h 30m" vs "2 hours, 30 minutes")
- `options.max_units` — Integer, default 2. Maximum number of units to display.

Returns a formatted duration string.

## Behavior

### Units (in descending order)

| Unit | Seconds | Verbose singular/plural | Compact |
|---|---|---|---|
| year | 31536000 (365 * 86400) | "year" / "years" | "y" |
| month | 2592000 (30 * 86400) | "month" / "months" | "mo" |
| day | 86400 | "day" / "days" | "d" |
| hour | 3600 | "hour" / "hours" | "h" |
| minute | 60 | "minute" / "minutes" | "m" |
| second | 1 | "second" / "seconds" | "s" |

### Algorithm

1. If `seconds < 0`, throw an error.
2. If `seconds === 0`, return `"0 seconds"` (or `"0s"` in compact mode).
3. Iterate through units from largest to smallest. For each unit where `remaining >= unitSize`:
   - If this is the last unit slot (parts collected so far + 1 >= max_units), **round** `remaining / unitSize` instead of flooring.
   - Otherwise, floor the division and keep the remainder.
   - Format the count with the appropriate label.
4. Stop when `max_units` parts have been collected.
5. Join parts with `", "` (normal mode) or `" "` (compact mode).

### Key detail: rounding on last unit

When `max_units` truncates the output, the last displayed unit is **rounded** (not floored). This means `duration(9000, { compact: true, max_units: 1 })` returns `"3h"` (2.5 hours rounds to 3), not `"2h"`.

## Error cases

- Negative seconds: throws an error with message "Seconds must not be negative"

## Test vectors

@provenance SPEC.md whenwords, verified against reference implementation

### Normal mode (default)

| seconds | expected |
|---|---|
| 0 | "0 seconds" |
| 1 | "1 second" |
| 45 | "45 seconds" |
| 60 | "1 minute" |
| 90 | "1 minute, 30 seconds" |
| 120 | "2 minutes" |
| 3600 | "1 hour" |
| 3661 | "1 hour, 1 minute" |
| 5400 | "1 hour, 30 minutes" |
| 9000 | "2 hours, 30 minutes" |
| 86400 | "1 day" |
| 93600 | "1 day, 2 hours" |
| 604800 | "7 days" |
| 2592000 | "1 month" |
| 31536000 | "1 year" |
| 36720000 | "1 year, 2 months" |

### Compact mode

| seconds | expected |
|---|---|
| 0 | "0s" |
| 45 | "45s" |
| 3661 | "1h 1m" |
| 9000 | "2h 30m" |
| 93600 | "1d 2h" |

### max_units option

| seconds | max_units | expected |
|---|---|---|
| 3661 | 1 | "1 hour" |
| 93600 | 1 | "1 day" |
| 93661 | 3 | "1 day, 2 hours, 1 minute" |

### Combined compact + max_units

| seconds | options | expected |
|---|---|---|
| 9000 | compact, max_units: 1 | "3h" |

### Error cases

| seconds | expected |
|---|---|
| -100 | ERROR (throws) |

## Edge cases

- Zero returns the special-case string, not an empty string
- Single-unit results omit the separator entirely (e.g., "1 hour" not "1 hour, ")
- Rounding on last unit can bump the count up (9000s with max_units 1 -> "3h" not "2h")
- Singular vs plural: count of 1 uses singular ("1 hour"), anything else uses plural ("2 hours")
