"""whenwords — 5 pure functions for human-friendly date/time formatting."""

import math
import re
from datetime import datetime, timezone


def _js_round(x: float) -> int:
    """Round half-up (JavaScript-style), not half-to-even (Python default)."""
    return math.floor(x + 0.5)


def time_ago(timestamp: int, reference: int) -> str:
    """Return a human-friendly relative time string like '5 minutes ago' or 'in 3 hours'."""
    seconds = abs(reference - timestamp)
    is_future = timestamp > reference

    # (max_seconds, singular, plural, divisor)
    thresholds: list[tuple[float, str, str, int]] = [
        (44, "just now", "just now", 1),
        (89, "1 minute", "1 minute", 1),
        (44 * 60, "minute", "minutes", 60),
        (89 * 60, "1 hour", "1 hour", 1),
        (21 * 3600, "hour", "hours", 3600),
        (35 * 3600, "1 day", "1 day", 1),
        (25 * 86400, "day", "days", 86400),
        (45 * 86400, "1 month", "1 month", 1),
        (319 * 86400, "month", "months", 30 * 86400),
        (547 * 86400, "1 year", "1 year", 1),
        (math.inf, "year", "years", 365 * 86400),
    ]

    max_s, singular, plural, divisor = next(
        (m, s, p, d) for m, s, p, d in thresholds if seconds <= m
    )

    if singular == "just now":
        return "just now"

    if divisor == 1:
        return f"in {singular}" if is_future else f"{singular} ago"

    n = _js_round(seconds / divisor)
    label = singular if n == 1 else plural
    text = f"{n} {label}"
    return f"in {text}" if is_future else f"{text} ago"


def duration(seconds: int, *, compact: bool = False, max_units: int = 2) -> str:
    """Format a duration in seconds as a human-readable string."""
    if seconds < 0:
        raise ValueError("Seconds must not be negative")

    units: list[tuple[str, str, int]] = [
        ("year", "y", 365 * 86400),
        ("month", "mo", 30 * 86400),
        ("day", "d", 86400),
        ("hour", "h", 3600),
        ("minute", "m", 60),
        ("second", "s", 1),
    ]

    if seconds == 0:
        return "0s" if compact else "0 seconds"

    parts: list[str] = []
    remaining = seconds

    for name, abbr, size in units:
        if remaining >= size:
            is_last_unit = len(parts) + 1 >= max_units
            count = _js_round(remaining / size) if is_last_unit else remaining // size
            remaining = 0 if is_last_unit else remaining % size

            if count > 0:
                if compact:
                    parts.append(f"{count}{abbr}")
                else:
                    label = name if count == 1 else f"{name}s"
                    parts.append(f"{count} {label}")

        if len(parts) >= max_units:
            break

    return " ".join(parts) if compact else ", ".join(parts)


def parse_duration(input_str: str) -> int:
    """Parse a human-readable duration string into total seconds.

    Supports compact ('2h30m'), verbose ('2 hours 30 minutes'),
    colon ('2:30'), decimal ('2.5 hours'), and mixed formats.
    """
    text = input_str.strip()
    if not text:
        raise ValueError("Empty input")

    # Check for negatives
    if text.startswith("-"):
        raise ValueError("Negative durations are not allowed")

    # Try colon format first: H:MM or H:MM:SS
    colon_match = re.fullmatch(r"(\d+):(\d{1,2})(?::(\d{1,2}))?", text)
    if colon_match:
        hours = int(colon_match.group(1))
        minutes = int(colon_match.group(2))
        secs = int(colon_match.group(3)) if colon_match.group(3) else 0
        return hours * 3600 + minutes * 60 + secs

    unit_map: dict[str, int] = {
        "w": 604800, "week": 604800, "weeks": 604800,
        "d": 86400, "day": 86400, "days": 86400,
        "h": 3600, "hr": 3600, "hrs": 3600, "hour": 3600, "hours": 3600,
        "m": 60, "min": 60, "mins": 60, "minute": 60, "minutes": 60,
        "mo": 2592000, "month": 2592000, "months": 2592000,
        "s": 1, "sec": 1, "secs": 1, "second": 1, "seconds": 1,
    }

    # Match all number+unit pairs
    # Use lookahead instead of \b so "2h30m" works (no word boundary between "h" and "3")
    pattern = re.compile(
        r"(\d+(?:\.\d+)?)\s*(weeks?|w|months?|mo|days?|d|hrs?|hours?|h|mins?|minutes?|m|secs?|seconds?|s)(?=\s|,|\d|$)",
        re.IGNORECASE,
    )

    # Strip filler words for matching
    cleaned = re.sub(r"\b(and|,)\b", " ", text, flags=re.IGNORECASE)
    cleaned = re.sub(r",", " ", cleaned)

    matches = pattern.findall(cleaned)
    if not matches:
        raise ValueError(f"Unrecognized duration format: {input_str!r}")

    # Verify that we consumed the entire meaningful input (no bare numbers, no unknown units)
    consumed = pattern.sub("", cleaned).strip()
    # Remove commas, "and", whitespace from remainder
    remainder = re.sub(r"[,\s]+", "", consumed)
    remainder = re.sub(r"(?i)\band\b", "", remainder)
    if remainder:
        raise ValueError(f"Unrecognized duration format: {input_str!r}")

    total = 0.0
    for value_str, unit in matches:
        value = float(value_str)
        unit_lower = unit.lower()
        if unit_lower not in unit_map:
            raise ValueError(f"Unknown unit: {unit!r}")
        total += value * unit_map[unit_lower]

    return _js_round(total)


def human_date(timestamp: int, reference: int) -> str:
    """Return a human-friendly date label relative to a reference date.

    Returns 'Today', 'Yesterday', 'Tomorrow', 'Last Wednesday',
    'This Wednesday', 'March 5', or 'January 1, 2023'.
    """
    ts_dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    ref_dt = datetime.fromtimestamp(reference, tz=timezone.utc)

    ts_date = ts_dt.date()
    ref_date = ref_dt.date()

    diff_days = (ts_date - ref_date).days  # positive = future

    if diff_days == 0:
        return "Today"
    if diff_days == -1:
        return "Yesterday"
    if diff_days == 1:
        return "Tomorrow"

    day_names = [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday",
    ]

    # "Last <day>" for 2–6 days in the past
    if -6 <= diff_days <= -2:
        return f"Last {day_names[ts_date.weekday()]}"

    # "This <day>" for 2–6 days in the future
    if 2 <= diff_days <= 6:
        return f"This {day_names[ts_date.weekday()]}"

    # Different year
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    month_name = month_names[ts_date.month - 1]

    if ts_date.year != ref_date.year:
        return f"{month_name} {ts_date.day}, {ts_date.year}"

    # Same year
    return f"{month_name} {ts_date.day}"


def date_range(start: int, end: int) -> str:
    """Format a date range as a human-readable string.

    Uses en-dash for ranges. Auto-corrects swapped inputs.
    """
    if start > end:
        start, end = end, start

    start_dt = datetime.fromtimestamp(start, tz=timezone.utc)
    end_dt = datetime.fromtimestamp(end, tz=timezone.utc)

    start_date = start_dt.date()
    end_date = end_dt.date()

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    s_month = month_names[start_date.month - 1]
    e_month = month_names[end_date.month - 1]

    en_dash = "\u2013"

    # Same day
    if start_date == end_date:
        return f"{s_month} {start_date.day}, {start_date.year}"

    # Same month and year
    if start_date.year == end_date.year and start_date.month == end_date.month:
        return f"{s_month} {start_date.day}{en_dash}{end_date.day}, {start_date.year}"

    # Same year, different months
    if start_date.year == end_date.year:
        return (
            f"{s_month} {start_date.day} {en_dash} "
            f"{e_month} {end_date.day}, {start_date.year}"
        )

    # Different years
    return (
        f"{s_month} {start_date.day}, {start_date.year} {en_dash} "
        f"{e_month} {end_date.day}, {end_date.year}"
    )
