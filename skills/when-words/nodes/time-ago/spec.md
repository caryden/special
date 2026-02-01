# time-ago

Converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".

## Function signature

```
timeAgo(timestamp: integer, reference: integer) -> string
```

- `timestamp` — Unix epoch seconds (the event time)
- `reference` — Unix epoch seconds (the "now" time to compare against)

Returns a human-readable relative time string.

## Behavior

1. Compute `seconds = abs(reference - timestamp)`.
2. Determine direction: if `timestamp > reference`, the event is in the future.
3. Find the first matching threshold and format accordingly.

### Threshold table

| Seconds range | Past output | Future output |
|---|---|---|
| 0--44 | "just now" | "just now" |
| 45--89 | "1 minute ago" | "in 1 minute" |
| 90--2640 (up to 44 min) | "N minutes ago" | "in N minutes" |
| 2700--5340 (45--89 min) | "1 hour ago" | "in 1 hour" |
| 5400--75600 (90 min--21 hr) | "N hours ago" | "in N hours" |
| 79200--126000 (22--35 hr) | "1 day ago" | "in 1 day" |
| 129600--2160000 (36 hr--25 d) | "N days ago" | "in N days" |
| 2246400--3888000 (26--45 d) | "1 month ago" | "in 1 month" |
| 3974400--27561600 (46--319 d) | "N months ago" | "in N months" |
| 27648000--47260800 (320--547 d) | "1 year ago" | "in 1 year" |
| 47347200+ (548+ d) | "N years ago" | "in N years" |

### Rounding

N is computed as `round(seconds / divisor)` using standard half-up rounding.

Divisors: 60 (minutes), 3600 (hours), 86400 (days), 2592000 (months = 30 * 86400), 31536000 (years = 365 * 86400).

### Algorithm

The implementation uses a threshold array where each entry is `[maxSeconds, singularLabel, pluralLabel, divisor]`. Scan for the first entry where `seconds <= maxSeconds`. If the entry is "just now", return that regardless of direction. If divisor is 1, use the singular label directly. Otherwise compute `N = round(seconds / divisor)` and choose singular vs plural based on N.

## Error cases

None. This is a total function for all integer inputs.

## Test vectors

@provenance SPEC.md whenwords, verified against reference implementation

Reference timestamp: `1704067200` (2024-01-01 00:00:00 UTC)

### Past

| timestamp | expected |
|---|---|
| 1704067200 | "just now" |
| 1704067170 | "just now" |
| 1704067156 | "just now" |
| 1704067155 | "1 minute ago" |
| 1704067111 | "1 minute ago" |
| 1704067110 | "2 minutes ago" |
| 1704065400 | "30 minutes ago" |
| 1704064560 | "44 minutes ago" |
| 1704064500 | "1 hour ago" |
| 1704061860 | "1 hour ago" |
| 1704061800 | "2 hours ago" |
| 1704049200 | "5 hours ago" |
| 1703991600 | "21 hours ago" |
| 1703988000 | "1 day ago" |
| 1703941200 | "1 day ago" |
| 1703937600 | "2 days ago" |
| 1703462400 | "7 days ago" |
| 1701907200 | "25 days ago" |
| 1701820800 | "1 month ago" |
| 1700179200 | "1 month ago" |
| 1700092800 | "2 months ago" |
| 1688169600 | "6 months ago" |
| 1676505600 | "11 months ago" |
| 1676419200 | "1 year ago" |
| 1656806400 | "1 year ago" |
| 1656720000 | "2 years ago" |
| 1546300800 | "5 years ago" |

### Future

| timestamp | expected |
|---|---|
| 1704067230 | "just now" |
| 1704067260 | "in 1 minute" |
| 1704067500 | "in 5 minutes" |
| 1704070200 | "in 1 hour" |
| 1704078000 | "in 3 hours" |
| 1704150000 | "in 1 day" |
| 1704240000 | "in 2 days" |
| 1706745600 | "in 1 month" |
| 1735689600 | "in 1 year" |

## Edge cases

- Identical timestamps return "just now"
- Boundary values (44s/45s, 89s/90s, etc.) tested at exact thresholds
- "just now" is direction-neutral (same for past and future within 0--44s)
