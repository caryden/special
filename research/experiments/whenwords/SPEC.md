# Whenwords — Specification

A library of pure functions for human-friendly date and time formatting.
All functions are pure — they accept explicit timestamps, never access the system clock.

## Functions

### `timeAgo(timestamp, reference) → string`

Converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".

**Parameters:**
- `timestamp` — Unix epoch seconds (integer)
- `reference` — Unix epoch seconds to compare against (integer)

**Behavior:**

Compute `seconds = abs(reference - timestamp)`. If `timestamp > reference`, the event is in the future.

| Seconds range | Past output | Future output |
|---|---|---|
| 0–44 | "just now" | "just now" |
| 45–89 | "1 minute ago" | "in 1 minute" |
| 90–2640 (44 min) | "N minutes ago" | "in N minutes" |
| 2700–5340 (45–89 min) | "1 hour ago" | "in 1 hour" |
| 5400–75600 (90 min–21 hr) | "N hours ago" | "in N hours" |
| 79200–126000 (22–35 hr) | "1 day ago" | "in 1 day" |
| 129600–2160000 (36 hr–25 d) | "N days ago" | "in N days" |
| 2246400–3888000 (26–45 d) | "1 month ago" | "in 1 month" |
| 3974400–27561600 (46–319 d) | "N months ago" | "in N months" |
| 27648000–47260800 (320–547 d) | "1 year ago" | "in 1 year" |
| 47347200+ (548+ d) | "N years ago" | "in N years" |

N is computed as `round(seconds / divisor)` where divisors are: 60 (minutes), 3600 (hours), 86400 (days), 2592000 (months = 30×86400), 31536000 (years = 365×86400).

---

### `duration(seconds, options?) → string`

Formats a number of seconds as a human-readable duration string.

**Parameters:**
- `seconds` — Non-negative integer
- `options.compact` — Boolean, default false. Use abbreviated units ("2h 30m" vs "2 hours, 30 minutes")
- `options.max_units` — Integer, default 2. Maximum number of units to display.

**Units (in order):**

| Unit | Seconds | Verbose | Compact |
|---|---|---|---|
| year | 31536000 (365×86400) | "year"/"years" | "y" |
| month | 2592000 (30×86400) | "month"/"months" | "mo" |
| day | 86400 | "day"/"days" | "d" |
| hour | 3600 | "hour"/"hours" | "h" |
| minute | 60 | "minute"/"minutes" | "m" |
| second | 1 | "second"/"seconds" | "s" |

**Behavior:**
- Zero: returns "0 seconds" (or "0s" in compact mode)
- Negative: throws an error
- Shows the two largest non-zero units by default
- Normal mode separator: ", " (comma space)
- Compact mode separator: " " (space)
- **When `max_units` truncates, the last displayed unit is rounded (not floored)**

---

### `parseDuration(input) → number`

Parses a human-written duration string into total seconds.

**Parameters:**
- `input` — String

**Accepted formats:**
- Compact: "2h30m", "2h 30m", "45s", "1d 2h 30m"
- Verbose: "2 hours 30 minutes", "2 hours and 30 minutes"
- Decimal: "2.5 hours", "1.5h"
- Colon: "2:30" (h:mm), "1:30:00" (h:mm:ss), "0:05:30"
- Mixed: "1 day, 2 hours, and 30 minutes"

**Unit aliases (case insensitive):**

| Canonical | Aliases |
|---|---|
| year (365×86400s) | y, yr, yrs, year, years |
| month (30×86400s) | mo, month, months |
| week (604800s) | w, wk, wks, week, weeks |
| day (86400s) | d, day, days |
| hour (3600s) | h, hr, hrs, hour, hours |
| minute (60s) | m, min, mins, minute, minutes |
| second (1s) | s, sec, secs, second, seconds |

**Error cases:** empty string, unrecognized input, negative values, bare numbers without units, unrecognized unit names.

---

### `humanDate(timestamp, reference) → string`

Returns a contextual date string based on proximity.

**Parameters:**
- `timestamp` — Unix epoch seconds
- `reference` — Unix epoch seconds

**Behavior (all comparisons use UTC dates):**

Compute `dayDiff` as difference in calendar days (UTC midnight truncation).

| dayDiff | Output |
|---|---|
| 0 | "Today" |
| -1 | "Yesterday" |
| +1 | "Tomorrow" |
| -6 to -2 | "Last {DayName}" (e.g. "Last Wednesday") |
| +2 to +6 | "This {DayName}" (e.g. "This Wednesday") |
| Same year, outside ±6 | "{Month} {Day}" (e.g. "March 5") |
| Different year | "{Month} {Day}, {Year}" (e.g. "January 1, 2023") |

Day names: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.
Month names: January, February, ..., December.

---

### `dateRange(start, end) → string`

Formats two timestamps as a smart date range, collapsing redundant information.

**Parameters:**
- `start` — Unix epoch seconds
- `end` — Unix epoch seconds

**Behavior (all UTC):**
- If `start > end`, auto-swap them
- Uses en-dash (U+2013 `–`) not hyphen

| Condition | Format | Example |
|---|---|---|
| Same day | "{Month} {Day}, {Year}" | "January 15, 2024" |
| Same month | "{Month} {StartDay}–{EndDay}, {Year}" | "January 15–22, 2024" |
| Same year, diff month | "{Month} {Day} – {Month} {Day}, {Year}" | "January 15 – February 15, 2024" |
| Different years | "{Month} {Day}, {Year} – {Month} {Day}, {Year}" | "December 28, 2023 – January 15, 2024" |

Note: Same-month ranges use en-dash with no spaces; cross-month ranges use en-dash with spaces.

---

## Test Vectors

### timeAgo

Reference timestamp: 1704067200 (2024-01-01 00:00:00 UTC)

**Past:**
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

**Future:**
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

### duration

| input seconds | options | expected |
|---|---|---|
| 0 | — | "0 seconds" |
| 1 | — | "1 second" |
| 45 | — | "45 seconds" |
| 60 | — | "1 minute" |
| 90 | — | "1 minute, 30 seconds" |
| 120 | — | "2 minutes" |
| 3600 | — | "1 hour" |
| 3661 | — | "1 hour, 1 minute" |
| 5400 | — | "1 hour, 30 minutes" |
| 9000 | — | "2 hours, 30 minutes" |
| 86400 | — | "1 day" |
| 93600 | — | "1 day, 2 hours" |
| 604800 | — | "7 days" |
| 2592000 | — | "1 month" |
| 31536000 | — | "1 year" |
| 36720000 | — | "1 year, 2 months" |
| 0 | compact | "0s" |
| 45 | compact | "45s" |
| 3661 | compact | "1h 1m" |
| 9000 | compact | "2h 30m" |
| 93600 | compact | "1d 2h" |
| 3661 | max_units: 1 | "1 hour" |
| 93600 | max_units: 1 | "1 day" |
| 93661 | max_units: 3 | "1 day, 2 hours, 1 minute" |
| 9000 | compact, max_units: 1 | "3h" |
| -100 | — | ERROR |

### parseDuration

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
| "2 hours 30 minutes" | 9000 |
| "2 hours and 30 minutes" | 9000 |
| "2 hours, and 30 minutes" | 9000 |
| "2.5 hours" | 9000 |
| "90 minutes" | 5400 |
| "2 days" | 172800 |
| "1 week" | 604800 |
| "1 day, 2 hours, and 30 minutes" | 95400 |
| "45 seconds" | 45 |
| "2:30" | 9000 |
| "1:30:00" | 5400 |
| "0:05:30" | 330 |
| "2H 30M" | 9000 |
| "  2 hours   30 minutes  " | 9000 |
| "" | ERROR |
| "hello world" | ERROR |
| "-5 hours" | ERROR |
| "42" | ERROR |
| "5 foos" | ERROR |

### humanDate

Reference timestamp: 1705276800 (2024-01-15 Monday 00:00 UTC)

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

### dateRange

| start | end | expected |
|---|---|---|
| 1705276800 | 1705276800 | "January 15, 2024" |
| 1705276800 | 1705320000 | "January 15, 2024" |
| 1705276800 | 1705363200 | "January 15–16, 2024" |
| 1705276800 | 1705881600 | "January 15–22, 2024" |
| 1705276800 | 1707955200 | "January 15 – February 15, 2024" |
| 1703721600 | 1705276800 | "December 28, 2023 – January 15, 2024" |
| 1704067200 | 1735603200 | "January 1 – December 31, 2024" |
| 1705881600 | 1705276800 | "January 15–22, 2024" |
| 1672531200 | 1735689600 | "January 1, 2023 – January 1, 2025" |
