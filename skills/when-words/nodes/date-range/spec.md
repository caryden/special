# date-range

Formats two timestamps as a smart date range, collapsing redundant information.

## Function signature

```
dateRange(start: integer, end: integer) -> string
```

- `start` — Unix epoch seconds (range start)
- `end` — Unix epoch seconds (range end)

Returns a formatted date range string. If `start > end`, the inputs are auto-swapped.

## Behavior

All date math uses **UTC**. Uses en-dash (U+2013) not hyphen for range separators.

### Format rules

| Condition | Format | Example |
|---|---|---|
| Same day | "{Month} {Day}, {Year}" | "January 15, 2024" |
| Same month & year | "{Month} {StartDay}--{EndDay}, {Year}" | "January 15--22, 2024" |
| Same year, different month | "{Month} {Day} -- {Month} {Day}, {Year}" | "January 15 -- February 15, 2024" |
| Different years | "{Month} {Day}, {Year} -- {Month} {Day}, {Year}" | "December 28, 2023 -- January 15, 2024" |

**Important:** Same-month ranges use en-dash with **no spaces** around it. Cross-month and cross-year ranges use en-dash with **spaces** on both sides.

Note: `--` in the table above represents the en-dash character U+2013 (`\u2013`).

### Algorithm

1. If `start > end`, swap them.
2. Convert both to UTC Date objects; extract year, month, day.
3. Check conditions in order: same day, same month, same year, different years.
4. Format accordingly using month names (January, February, ..., December).

### Month names

January, February, March, April, May, June, July, August, September, October, November, December.

## Error cases

None. This is a total function. Swapped inputs are auto-corrected.

## Test vectors

@provenance SPEC.md whenwords, verified against reference implementation

| start | end | expected |
|---|---|---|
| 1705276800 | 1705276800 | "January 15, 2024" |
| 1705276800 | 1705320000 | "January 15, 2024" |
| 1705276800 | 1705363200 | "January 15\u201316, 2024" |
| 1705276800 | 1705881600 | "January 15\u201322, 2024" |
| 1705276800 | 1707955200 | "January 15 \u2013 February 15, 2024" |
| 1703721600 | 1705276800 | "December 28, 2023 \u2013 January 15, 2024" |
| 1704067200 | 1735603200 | "January 1 \u2013 December 31, 2024" |
| 1705881600 | 1705276800 | "January 15\u201322, 2024" |
| 1672531200 | 1735689600 | "January 1, 2023 \u2013 January 1, 2025" |

(Note: `\u2013` is the en-dash character.)

## Edge cases

- Same timestamp: returns single date, not a range
- Same day but different times: treated as same day (single date output)
- Swapped inputs: auto-corrected, produces same result as correct order
- En-dash spacing: no spaces for same-month ranges, spaces for cross-month/cross-year
