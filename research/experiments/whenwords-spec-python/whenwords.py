"""Whenwords -- human-friendly date and time formatting (pure functions, stdlib only)."""

from datetime import datetime, timezone
import math
import re


# ---------------------------------------------------------------------------
# timeAgo
# ---------------------------------------------------------------------------

_TIME_AGO_THRESHOLDS = [
    # (upper_bound_exclusive, divisor, singular, plural_fmt)
    (45, None, "just now", "just now"),
    (90, None, "1 minute ago", "in 1 minute"),
    (2700, 60, "{n} minutes ago", "in {n} minutes"),
    (5400, None, "1 hour ago", "in 1 hour"),
    (79200, 3600, "{n} hours ago", "in {n} hours"),
    (129600, None, "1 day ago", "in 1 day"),
    (2246400, 86400, "{n} days ago", "in {n} days"),
    (3974400, None, "1 month ago", "in 1 month"),
    (27648000, 2592000, "{n} months ago", "in {n} months"),
    (47347200, None, "1 year ago", "in 1 year"),
    (float("inf"), 31536000, "{n} years ago", "in {n} years"),
]


def time_ago(timestamp: int, reference: int) -> str:
    """Return a relative-time string like '3 hours ago' or 'in 2 days'."""
    diff = reference - timestamp
    seconds = abs(diff)
    future = timestamp > reference

    for upper, divisor, past_fmt, future_fmt in _TIME_AGO_THRESHOLDS:
        if seconds < upper:
            fmt = future_fmt if future else past_fmt
            if divisor is None:
                return fmt
            n = round(seconds / divisor)
            return fmt.format(n=n)
    # unreachable
    return ""


# ---------------------------------------------------------------------------
# duration
# ---------------------------------------------------------------------------

_DURATION_UNITS = [
    (31536000, "year", "years", "y"),
    (2592000, "month", "months", "mo"),
    (86400, "day", "days", "d"),
    (3600, "hour", "hours", "h"),
    (60, "minute", "minutes", "m"),
    (1, "second", "seconds", "s"),
]


def duration(seconds: int, *, compact: bool = False, max_units: int = 2) -> str:
    """Format *seconds* as a human-readable duration string."""
    if seconds < 0:
        raise ValueError("seconds must be non-negative")
    if seconds == 0:
        return "0s" if compact else "0 seconds"

    parts: list[tuple[int, int]] = []  # (unit_index, value)
    remaining = seconds
    for i, (unit_secs, _, _, _) in enumerate(_DURATION_UNITS):
        if remaining >= unit_secs:
            value = remaining // unit_secs
            remaining %= unit_secs
            parts.append((i, value))

    # Apply max_units truncation with rounding on the last kept unit
    if len(parts) > max_units:
        # Calculate the remainder in seconds that would be truncated
        kept = parts[:max_units]
        truncated = parts[max_units:]
        # Total seconds represented by truncated parts
        truncated_secs = sum(v * _DURATION_UNITS[i][0] for i, v in truncated)
        # The last kept unit's divisor
        last_idx, last_val = kept[-1]
        last_unit_secs = _DURATION_UNITS[last_idx][0]
        # Round: if truncated seconds >= half the last unit, round up
        if truncated_secs >= last_unit_secs / 2:
            kept[-1] = (last_idx, last_val + 1)
        parts = kept

    # Format
    formatted: list[str] = []
    for idx, value in parts:
        _, singular, plural, compact_abbr = _DURATION_UNITS[idx]
        if compact:
            formatted.append(f"{value}{compact_abbr}")
        else:
            unit = singular if value == 1 else plural
            formatted.append(f"{value} {unit}")

    sep = " " if compact else ", "
    return sep.join(formatted)


# ---------------------------------------------------------------------------
# parseDuration
# ---------------------------------------------------------------------------

_UNIT_MAP: dict[str, int] = {}
_UNIT_ALIASES = {
    31536000: ["y", "yr", "yrs", "year", "years"],
    2592000: ["mo", "month", "months"],
    604800: ["w", "wk", "wks", "week", "weeks"],
    86400: ["d", "day", "days"],
    3600: ["h", "hr", "hrs", "hour", "hours"],
    60: ["m", "min", "mins", "minute", "minutes"],
    1: ["s", "sec", "secs", "second", "seconds"],
}
for _secs, _aliases in _UNIT_ALIASES.items():
    for _a in _aliases:
        _UNIT_MAP[_a] = _secs


def parse_duration(input_str: str) -> int:
    """Parse a human-written duration string into total seconds."""
    s = input_str.strip()
    if not s:
        raise ValueError("empty input")

    # Reject negative
    if s.startswith("-"):
        raise ValueError("negative duration")

    # Colon format: h:mm or h:mm:ss
    colon_match = re.fullmatch(r"(\d+):(\d{2})(?::(\d{2}))?", s)
    if colon_match:
        h = int(colon_match.group(1))
        m = int(colon_match.group(2))
        sec = int(colon_match.group(3)) if colon_match.group(3) else 0
        return h * 3600 + m * 60 + sec

    # Strip connectors
    cleaned = s.lower()
    cleaned = re.sub(r"\band\b", " ", cleaned)
    cleaned = re.sub(r",", " ", cleaned)
    cleaned = cleaned.strip()

    # Find all number-unit pairs
    pattern = r"(\d+(?:\.\d+)?)\s*([a-z]+)"
    matches = re.findall(pattern, cleaned)

    if not matches:
        raise ValueError(f"unrecognized input: {input_str!r}")

    # Check that the matches account for all meaningful content
    # Remove all matched portions and see if anything unexpected remains
    residual = re.sub(pattern, "", cleaned).strip()
    # residual should only contain spaces, commas, 'and'
    if residual and not re.fullmatch(r"[\s,]*(?:and[\s,]*)*", residual):
        raise ValueError(f"unrecognized input: {input_str!r}")

    total = 0.0
    for num_str, unit in matches:
        if unit not in _UNIT_MAP:
            raise ValueError(f"unrecognized unit: {unit!r}")
        total += float(num_str) * _UNIT_MAP[unit]

    return round(total)


# ---------------------------------------------------------------------------
# humanDate
# ---------------------------------------------------------------------------

_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
_MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _utc_date(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def human_date(timestamp: int, reference: int) -> str:
    """Return a contextual date string like 'Today', 'Last Wednesday', or 'March 5'."""
    ts_dt = _utc_date(timestamp)
    ref_dt = _utc_date(reference)

    ts_date = ts_dt.date()
    ref_date = ref_dt.date()

    day_diff = (ts_date - ref_date).days  # positive = future

    if day_diff == 0:
        return "Today"
    if day_diff == -1:
        return "Yesterday"
    if day_diff == 1:
        return "Tomorrow"
    if -6 <= day_diff <= -2:
        day_name = _DAY_NAMES[ts_date.weekday()]
        return f"Last {day_name}"
    if 2 <= day_diff <= 6:
        day_name = _DAY_NAMES[ts_date.weekday()]
        return f"This {day_name}"

    month = _MONTH_NAMES[ts_date.month]
    if ts_date.year == ref_date.year:
        return f"{month} {ts_date.day}"
    return f"{month} {ts_date.day}, {ts_date.year}"


# ---------------------------------------------------------------------------
# dateRange
# ---------------------------------------------------------------------------

def date_range(start: int, end: int) -> str:
    """Format two timestamps as a smart date range."""
    if start > end:
        start, end = end, start

    s = _utc_date(start)
    e = _utc_date(end)

    s_date = s.date()
    e_date = e.date()

    s_month = _MONTH_NAMES[s_date.month]
    e_month = _MONTH_NAMES[e_date.month]

    if s_date == e_date:
        return f"{s_month} {s_date.day}, {s_date.year}"

    if s_date.year == e_date.year and s_date.month == e_date.month:
        return f"{s_month} {s_date.day}\u2013{e_date.day}, {s_date.year}"

    if s_date.year == e_date.year:
        return f"{s_month} {s_date.day} \u2013 {e_month} {e_date.day}, {s_date.year}"

    return (
        f"{s_month} {s_date.day}, {s_date.year} \u2013 "
        f"{e_month} {e_date.day}, {e_date.year}"
    )
