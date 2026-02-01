# human-date

Returns a contextual date string based on proximity to a reference date.

## Function signature

```
humanDate(timestamp: integer, reference: integer) -> string
```

- `timestamp` — Unix epoch seconds (the date to describe)
- `reference` — Unix epoch seconds (the "now" reference point)

Returns a contextual date label string.

## Behavior

All comparisons use **UTC dates**. Calendar day difference is computed by truncating
both timestamps to UTC midnight and computing the integer day offset.

### Day difference rules

Compute `dayDiff` as the difference in UTC calendar days (timestamp date minus reference date):

| dayDiff | Output |
|---|---|
| 0 | "Today" |
| -1 | "Yesterday" |
| +1 | "Tomorrow" |
| -6 to -2 | "Last {DayName}" (e.g., "Last Wednesday") |
| +2 to +6 | "This {DayName}" (e.g., "This Wednesday") |
| Same year, outside +/-6 | "{Month} {Day}" (e.g., "March 5") |
| Different year | "{Month} {Day}, {Year}" (e.g., "January 1, 2023") |

### Day and month names

- Days: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
- Months: January, February, March, April, May, June, July, August, September, October, November, December

### Algorithm

1. Convert both timestamps to UTC Date objects.
2. Extract UTC year, month, day, and day-of-week for both.
3. Compute `dayDiff = round((tsMidnight - refMidnight) / 86400000)` where midnights are UTC.
4. Apply the rules in priority order: Today, Yesterday, Tomorrow, Last/This day, same year date, different year date.

## Error cases

None. This is a total function for all integer inputs.

## Test vectors

@provenance SPEC.md whenwords, verified against reference implementation

Reference timestamp: `1705276800` (2024-01-15 Monday 00:00 UTC)

| timestamp | expected |
|---|---|
| 1705276800 | "Today" |
| 1705320000 | "Today" |
| 1705190400 | "Yesterday" |
| 1705363200 | "Tomorrow" |
| 1705104000 | "Last Saturday" |
| 1705017600 | "Last Friday" |
| 1704931200 | "Last Thursday" |
| 1704844800 | "Last Wednesday" |
| 1704758400 | "Last Tuesday" |
| 1704672000 | "January 8" |
| 1705449600 | "This Wednesday" |
| 1705536000 | "This Thursday" |
| 1705795200 | "This Sunday" |
| 1705881600 | "January 22" |
| 1709251200 | "March 1" |
| 1735603200 | "December 31" |
| 1672531200 | "January 1, 2023" |
| 1736121600 | "January 6, 2025" |

## Edge cases

- Same timestamp returns "Today" (dayDiff = 0)
- Same calendar day but different clock time returns "Today" (e.g., midnight vs noon)
- "Last" prefix is used for 2--6 days in the past; "This" prefix for 2--6 days in the future
- Day-of-week name comes from the **timestamp** date, not the reference date
- Exactly 7 days apart falls through to the date format, not "Last/This"
