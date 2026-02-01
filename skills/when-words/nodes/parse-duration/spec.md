# parse-duration

Parses a human-written duration string into total seconds.

## Function signature

```
parseDuration(input: string) -> integer
```

- `input` — A duration string in any supported format

Returns the total number of seconds (integer, rounded).

## Behavior

### Accepted formats

- **Compact:** `"2h30m"`, `"2h 30m"`, `"45s"`, `"1d 2h 30m"`
- **Verbose:** `"2 hours 30 minutes"`, `"2 hours and 30 minutes"`
- **Decimal:** `"2.5 hours"`, `"1.5h"`
- **Colon:** `"2:30"` (h:mm), `"1:30:00"` (h:mm:ss), `"0:05:30"`
- **Mixed:** `"1 day, 2 hours, and 30 minutes"`

### Algorithm

1. Trim input. If empty, throw.
2. If starts with `-`, throw (negative durations not supported).
3. Try colon notation first: match `^(\d+):(\d{1,2})(?::(\d{1,2}))?$`.
   If matched, compute `hours * 3600 + minutes * 60 + seconds`.
4. Otherwise, normalize: lowercase, replace commas with spaces, strip "and", collapse whitespace.
5. Match all `(\d+(?:\.\d+)?)\s*([a-z]+)` pairs.
6. For each pair, look up the unit in the alias map. If not found, throw.
7. Accumulate `value * unitSeconds`.
8. If no pairs matched, throw.
9. Round the total to the nearest integer and return.

### Unit aliases (case insensitive)

| Canonical | Seconds | Aliases |
|---|---|---|
| year | 31536000 (365 * 86400) | y, yr, yrs, year, years |
| month | 2592000 (30 * 86400) | mo, month, months |
| week | 604800 | w, wk, wks, week, weeks |
| day | 86400 | d, day, days |
| hour | 3600 | h, hr, hrs, hour, hours |
| minute | 60 | m, min, mins, minute, minutes |
| second | 1 | s, sec, secs, second, seconds |

## Error cases

| Input | Error reason |
|---|---|
| `""` | Empty string |
| `"hello world"` | No recognized number+unit pairs |
| `"-5 hours"` | Negative duration |
| `"42"` | Bare number without unit |
| `"5 foos"` | Unrecognized unit name |

## Test vectors

@provenance SPEC.md whenwords, verified against reference implementation

### Compact format

| input | expected |
|---|---|
| "2h30m" | 9000 |
| "2h 30m" | 9000 |
| "2h, 30m" | 9000 |
| "1.5h" | 5400 |
| "90m" | 5400 |
| "90min" | 5400 |
| "45s" | 45 |
| "45sec" | 45 |
| "2d" | 172800 |
| "1w" | 604800 |
| "1d 2h 30m" | 95400 |
| "2hr" | 7200 |
| "2hrs" | 7200 |
| "30mins" | 1800 |

### Verbose format

| input | expected |
|---|---|
| "2 hours 30 minutes" | 9000 |
| "2 hours and 30 minutes" | 9000 |
| "2 hours, and 30 minutes" | 9000 |
| "2.5 hours" | 9000 |
| "90 minutes" | 5400 |
| "2 days" | 172800 |
| "1 week" | 604800 |
| "1 day, 2 hours, and 30 minutes" | 95400 |
| "45 seconds" | 45 |

### Colon notation

| input | expected |
|---|---|
| "2:30" | 9000 |
| "1:30:00" | 5400 |
| "0:05:30" | 330 |

### Case and whitespace tolerance

| input | expected |
|---|---|
| "2H 30M" | 9000 |
| "  2 hours   30 minutes  " | 9000 |

## Edge cases

- Commas are stripped as filler (`"2h, 30m"` works)
- "and" is stripped as filler (`"2 hours and 30 minutes"` works)
- Decimal values are supported (`"1.5h"` = 5400)
- Result is always rounded to nearest integer
- Colon notation is tried before unit-based parsing
