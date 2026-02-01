"""
Whenwords: Human-friendly date and time formatting.

All functions are pure -- no side effects, no system clock access.
All dates are in UTC. Zero external dependencies.
"""

import math
import re
from datetime import datetime, timezone


def time_ago(timestamp: int, now: int) -> str:
    """
    Given a timestamp and a reference time, return a relative time string.
    Past: "3 hours ago". Future: "in 3 hours". Within ~45s: "just now".

    Uses natural-feeling thresholds with rounding.
    """
    diff = now - timestamp  # positive = past, negative = future
    abs_diff = abs(diff)

    # Thresholds (in seconds) and corresponding unit labels
    # (max_seconds_for_unit, unit_singular, unit_plural, divisor)
    thresholds = [
        (45, None, None, 1),                        # "just now"
        (90, "minute", "minutes", 60),               # 1 minute
        (45 * 60, "minute", "minutes", 60),          # N minutes (up to 45 min)
        (90 * 60, "hour", "hours", 3600),            # 1 hour
        (22 * 3600, "hour", "hours", 3600),          # N hours (up to 22 hours)
        (36 * 3600, "day", "days", 86400),           # 1 day
        (26 * 86400, "day", "days", 86400),          # N days (up to 26 days)
        (45 * 86400, "month", "months", 2592000),    # 1 month (~30 days)
        (320 * 86400, "month", "months", 2592000),   # N months
        (548 * 86400, "year", "years", 31536000),    # 1 year (~365 days)
        (float('inf'), "year", "years", 31536000),   # N years
    ]

    for max_secs, singular, plural, divisor in thresholds:
        if abs_diff < max_secs:
            if singular is None:
                return "just now"
            value = round(abs_diff / divisor)
            if value < 1:
                value = 1
            unit = singular if value == 1 else plural
            if diff > 0:
                return f"{value} {unit} ago"
            else:
                return f"in {value} {unit}"

    # Should not reach here, but just in case
    value = round(abs_diff / 31536000)
    if value < 1:
        value = 1
    unit = "year" if value == 1 else "years"
    if diff > 0:
        return f"{value} {unit} ago"
    else:
        return f"in {value} {unit}"


def duration(seconds: int, compact: bool = False, max_units: int = 2) -> str:
    """
    Format a number of seconds as a human-readable duration.

    Normal: "2 hours, 30 minutes"
    Compact: "2h 30m"

    Shows the `max_units` largest non-zero units (default 2).
    Rounds the last displayed unit rather than flooring.
    Raises ValueError on negative input.
    """
    if seconds < 0:
        raise ValueError("Duration cannot be negative")

    if seconds == 0:
        return "0s" if compact else "0 seconds"

    units = [
        ("day", "d", 86400),
        ("hour", "h", 3600),
        ("minute", "m", 60),
        ("second", "s", 1),
    ]

    # First pass: extract the largest units by flooring, then round the last one
    parts = []
    remaining = seconds

    for name, abbrev, divisor in units:
        if remaining >= divisor or (remaining > 0 and len(parts) > 0):
            value = remaining // divisor
            remaining -= value * divisor
            if value > 0 or len(parts) > 0:
                parts.append((name, abbrev, divisor, value))

    # If we have no parts (shouldn't happen for seconds > 0), fallback
    if not parts:
        return "0s" if compact else "0 seconds"

    # Now we need to select max_units and round the last one
    # Recalculate: pick the first max_units non-zero groups, rounding the last
    result_parts = []
    remaining = seconds

    for name, abbrev, divisor in units:
        value = remaining // divisor
        remaining -= value * divisor

        if value > 0 or len(result_parts) > 0:
            result_parts.append((name, abbrev, divisor, int(value), remaining))

    # Filter to only parts with non-zero values (initially)
    non_zero = [(n, a, d, v, r) for n, a, d, v, r in result_parts if v > 0]

    if not non_zero:
        # seconds was 0 but we already handled that
        return "0s" if compact else "0 seconds"

    # Take up to max_units
    selected = non_zero[:max_units]

    # Round the last selected unit based on the remaining seconds at that point
    if len(selected) > 0:
        last_name, last_abbrev, last_divisor, last_value, last_remaining = selected[-1]
        # Compute total remaining after this unit in original decomposition
        # We need to figure out how many seconds were left after the last unit
        # Recompute remaining after extracting selected units
        used = 0
        for n, a, d, v, r in selected:
            used += v * d
        leftover = seconds - used
        if leftover > 0 and leftover >= last_divisor / 2:
            last_value += 1
            selected[-1] = (last_name, last_abbrev, last_divisor, last_value, last_remaining)

    # Format
    if compact:
        return " ".join(f"{v}{a}" for _, a, _, v, _ in selected)
    else:
        formatted = []
        for name, _, _, value, _ in selected:
            unit = name if value == 1 else name + "s"
            formatted.append(f"{value} {unit}")
        return ", ".join(formatted)


def parse_duration(text: str) -> int:
    """
    Parse a human-written duration string back into seconds.

    Accepts compact ("2h30m"), verbose ("2 hours and 30 minutes"),
    colon notation ("2:30", "1:30:00"), decimals ("2.5 hours"),
    mixed with commas and "and".

    Case insensitive. Tolerates extra whitespace.
    Raises ValueError on empty strings, unrecognized input, negative values,
    and bare numbers without units.
    """
    if not isinstance(text, str):
        raise ValueError("Input must be a string")

    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Empty duration string")

    # Check for negative values
    if cleaned.startswith('-'):
        raise ValueError("Negative durations are not allowed")

    # Try colon notation first: H:MM or H:MM:SS
    colon_match = re.fullmatch(r'(\d+):(\d{1,2})(?::(\d{1,2}))?', cleaned)
    if colon_match:
        hours = int(colon_match.group(1))
        minutes = int(colon_match.group(2))
        secs = int(colon_match.group(3)) if colon_match.group(3) else 0
        return hours * 3600 + minutes * 60 + secs

    # Normalize: lowercase, strip extra whitespace
    normalized = cleaned.lower()
    # Remove "and", commas
    normalized = re.sub(r'\band\b', ' ', normalized)
    normalized = normalized.replace(',', ' ')
    # Collapse whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    # Unit mapping
    unit_map = {
        's': 1, 'sec': 1, 'secs': 1, 'second': 1, 'seconds': 1,
        'm': 60, 'min': 60, 'mins': 60, 'minute': 60, 'minutes': 60,
        'h': 3600, 'hr': 3600, 'hrs': 3600, 'hour': 3600, 'hours': 3600,
        'd': 86400, 'day': 86400, 'days': 86400,
        'w': 604800, 'wk': 604800, 'wks': 604800, 'week': 604800, 'weeks': 604800,
    }

    # Pattern to match number + unit pairs
    pattern = r'(\d+(?:\.\d+)?)\s*([a-z]+)'
    matches = re.findall(pattern, normalized)

    if not matches:
        # Check if it's just a bare number
        if re.fullmatch(r'\d+(?:\.\d+)?', normalized):
            raise ValueError("Bare number without units")
        raise ValueError(f"Unrecognized duration format: {text}")

    # Verify the entire string is consumed by our matches (plus separators)
    # Rebuild what we matched and compare
    rebuilt = normalized
    for num_str, unit_str in matches:
        rebuilt = rebuilt.replace(num_str + unit_str, '', 1)
        rebuilt = rebuilt.replace(num_str + ' ' + unit_str, '', 1)
    rebuilt = re.sub(r'[\s,]+', '', rebuilt)
    if rebuilt:
        raise ValueError(f"Unrecognized duration format: {text}")

    total = 0.0
    for num_str, unit_str in matches:
        if unit_str not in unit_map:
            raise ValueError(f"Unrecognized unit: {unit_str}")
        value = float(num_str)
        if value < 0:
            raise ValueError("Negative durations are not allowed")
        total += value * unit_map[unit_str]

    return round(total)


def human_date(timestamp: int, now: int) -> str:
    """
    Return a contextual date string.

    Today/yesterday/tomorrow use those words. Within ~a week: "Last Wednesday"
    or "This Friday". Same year: "March 5". Different year: "March 5, 2023".

    All date comparison based on calendar days in UTC.
    """
    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    now_dt = datetime.fromtimestamp(now, tz=timezone.utc)

    # Get calendar dates
    date_val = dt.date()
    now_date = now_dt.date()

    day_diff = (date_val - now_date).days  # positive = future, negative = past

    day_name = dt.strftime("%A")  # e.g., "Wednesday"
    month_name = dt.strftime("%B")  # e.g., "March"
    day_num = dt.day
    year = dt.year

    if day_diff == 0:
        return "Today"
    elif day_diff == -1:
        return "Yesterday"
    elif day_diff == 1:
        return "Tomorrow"
    elif -7 <= day_diff < -1:
        return f"Last {day_name}"
    elif 2 <= day_diff <= 7:
        return f"This {day_name}"
    elif dt.year == now_dt.year:
        return f"{month_name} {day_num}"
    else:
        return f"{month_name} {day_num}, {year}"


def date_range(start: int, end: int) -> str:
    """
    Format two timestamps as a smart date range string.

    Same day: single date. Same month: "January 15-22, 2024".
    Same year: "January 15 - February 15, 2024".
    Different years: "December 28, 2023 - January 15, 2024".

    Uses en-dash. Auto-swaps if start > end. All dates in UTC.
    """
    if start > end:
        start, end = end, start

    start_dt = datetime.fromtimestamp(start, tz=timezone.utc)
    end_dt = datetime.fromtimestamp(end, tz=timezone.utc)

    start_date = start_dt.date()
    end_date = end_dt.date()

    s_month = start_dt.strftime("%B")
    e_month = end_dt.strftime("%B")
    s_day = start_dt.day
    e_day = end_dt.day
    s_year = start_dt.year
    e_year = end_dt.year

    EN_DASH = "\u2013"

    if start_date == end_date:
        # Same day
        return f"{s_month} {s_day}, {s_year}"
    elif s_year == e_year and s_month == e_month:
        # Same month and year
        return f"{s_month} {s_day}{EN_DASH}{e_day}, {s_year}"
    elif s_year == e_year:
        # Same year, different months
        return f"{s_month} {s_day} {EN_DASH} {e_month} {e_day}, {s_year}"
    else:
        # Different years
        return f"{s_month} {s_day}, {s_year} {EN_DASH} {e_month} {e_day}, {e_year}"
