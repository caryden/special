# matcher — Spec

Depends on: `cron-types`, `field-range`

## Purpose

Test whether a given UTC datetime matches a parsed cron expression.
Implements Vixie cron matching semantics including the day-of-month / day-of-week
union rule.

## Function

`matchesCron(date: Date, expr: CronExpression) → boolean`

## Algorithm

@provenance Vixie cron 4.1, POSIX.1-2017 crontab(5)

1. Extract minute, hour, dayOfMonth, month, dayOfWeek from the UTC date
2. Check minute matches the minute field — if not, return false
3. Check hour matches the hour field — if not, return false
4. Check month matches the month field — if not, return false
5. Day matching (Vixie union rule):
   - If **both** dayOfMonth and dayOfWeek are restricted (not wildcard):
     return `dayOfMonth matches OR dayOfWeek matches` (union/OR)
   - Otherwise: both must match (wildcard fields always match)

### Detecting "restricted" fields

A field is a wildcard if it contains a single range entry spanning the field's
full range (e.g., dayOfMonth = `[range(1, 31)]`). Any other content means restricted.

### Entry matching rules

| Entry Kind | Matches When |
|------------|-------------|
| `value(n)` | `value === n` |
| `range(s, e)` where `s <= e` | `value >= s && value <= e` |
| `range(s, e)` where `s > e` | `value >= s \|\| value <= e` (wrap-around) |
| `step(range(s, e), n)` | value is in range AND `(value - s) % n === 0` |
| `last` | dayOfMonth equals last day of the current month |
| `nearest-weekday(d)` | dayOfMonth equals the nearest weekday to day `d` |
| `last-weekday(w)` | dayOfWeek equals `w` AND no later occurrence of `w` in month |
| `nth-weekday(w, n)` | dayOfWeek equals `w` AND `ceil(dayOfMonth / 7) === n` |

### Nearest weekday algorithm

@provenance Quartz scheduler W modifier semantics

Never crosses month boundaries:
- Saturday, not 1st → use Friday (day - 1)
- 1st is Saturday → use Monday the 3rd
- Sunday, not last day → use Monday (day + 1)
- Last day is Sunday → use Friday (day - 2)

## Test Vectors

@provenance Vixie cron 4.1, verified against cron-parser v5.0.0

### Vixie union rule

| Expression | Date (UTC) | Matches | Why |
|------------|-----------|---------|-----|
| `0 0 15 * 5` | 2024-03-15 (Fri) | true | Both match |
| `0 0 15 * 5` | 2024-03-22 (Fri) | true | DoW matches |
| `0 0 15 * 5` | 2024-04-15 (Mon) | true | DoM matches |
| `0 0 15 * 5` | 2024-04-16 (Tue) | false | Neither matches |

### Last day of month

| Expression | Date (UTC) | Matches |
|------------|-----------|---------|
| `0 0 L * *` | 2024-01-31 | true |
| `0 0 L * *` | 2024-02-29 | true (leap year) |
| `0 0 L * *` | 2023-02-28 | true (non-leap year) |
| `0 0 L * *` | 2024-02-28 | false (leap year, not last day) |

### Nearest weekday

| Expression | Date (UTC) | Matches | Why |
|------------|-----------|---------|-----|
| `0 0 15W * *` | 2024-06-14 (Fri) | true | 15th is Saturday, nearest weekday is Friday |
| `0 0 15W * *` | 2024-09-16 (Mon) | true | 15th is Sunday, nearest weekday is Monday |
| `0 0 1W * *` | 2024-06-03 (Mon) | true | 1st is Saturday, can't go to prev month |
| `0 0 31W * *` | 2024-03-29 (Fri) | true | 31st is Sunday (last day), can't go to next month |

## Edge Cases

- Wrap-around day-of-week range: `5-1` matches Fri, Sat, Sun, Mon
- Step with wrap-around: `5-1/2` matches every 2nd day starting from Friday
