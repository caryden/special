# Whenwords

Build a library of 5 pure functions for human-friendly date and time formatting. All functions take Unix epoch timestamps as integers and never access the system clock — a reference timestamp is always passed explicitly.

## Functions to implement

### timeAgo

Given a timestamp and a reference time, return a relative time string. For past events: "3 hours ago", "2 days ago", etc. For future events: "in 3 hours", "in 2 days", etc. Very recent times (within about 45 seconds) should return "just now" regardless of direction.

Use natural-feeling thresholds — the boundaries between units should feel right (e.g., don't say "1 hour ago" until at least 45 minutes have passed; don't switch to days until at least 22 hours). Use rounding, not truncation.

### duration

Format a number of seconds as a human-readable duration. Support two modes:
- Normal: "2 hours, 30 minutes"
- Compact: "2h 30m"

By default, show the two largest non-zero units. Support a max_units option to control this. When truncating units, round the last displayed unit rather than flooring it. Throw on negative input.

### parseDuration

Parse a human-written duration string back into seconds. Accept flexible input formats:
- Compact: "2h30m", "45s"
- Verbose: "2 hours and 30 minutes"
- Colon notation: "2:30" (hours:minutes), "1:30:00" (h:m:s)
- Decimals: "2.5 hours"
- Mixed with commas and "and": "1 day, 2 hours, and 30 minutes"

Be case insensitive and tolerate extra whitespace. Support common unit abbreviations (h, hr, hrs, hour, hours, m, min, mins, minute, minutes, etc.). Throw on empty strings, unrecognized input, negative values, and bare numbers without units.

### humanDate

Return a contextual date string. For today, yesterday, and tomorrow, use those words. For dates within about a week, use "Last Wednesday" or "This Friday". For dates further out in the same year, use "March 5". For different years, use "March 5, 2023". All date comparison should be based on calendar days in UTC.

### dateRange

Format two timestamps as a smart date range string. Collapse redundant information:
- Same day: just show the single date
- Same month: "January 15–22, 2024"
- Same year but different months: "January 15 – February 15, 2024"
- Different years: "December 28, 2023 – January 15, 2024"

Use en-dash (–), not hyphen. If start is after end, auto-swap them. All dates in UTC.

## Requirements

- All functions must be pure (no side effects, no system clock)
- Zero external dependencies — standard library only
- Include comprehensive tests for all functions
