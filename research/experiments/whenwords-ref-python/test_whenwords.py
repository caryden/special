"""Tests for whenwords — human-friendly date/time formatting."""

import pytest

from whenwords import time_ago, duration, parse_duration, human_date, date_range


# ---------------------------------------------------------------------------
# time_ago
# ---------------------------------------------------------------------------

REF_TIME_AGO = 1704067200  # 2024-01-01 00:00:00 UTC


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1704067200, "just now"),       # identical
        (1704067170, "just now"),       # 30s ago
        (1704067156, "just now"),       # 44s ago
        (1704067155, "1 minute ago"),   # 45s ago
        (1704067111, "1 minute ago"),   # 89s ago
        (1704067110, "2 minutes ago"),  # 90s ago
        (1704065400, "30 minutes ago"), # 30 min ago
        (1704064560, "44 minutes ago"), # 44 min ago
        (1704064500, "1 hour ago"),     # 45 min ago
        (1704061860, "1 hour ago"),     # 89 min ago
        (1704061800, "2 hours ago"),    # 90 min ago
        (1704049200, "5 hours ago"),    # 5h ago
        (1703991600, "21 hours ago"),   # 21h ago
        (1703988000, "1 day ago"),      # 22h ago
        (1703941200, "1 day ago"),      # 35h ago
        (1703937600, "2 days ago"),     # 36h ago
        (1703462400, "7 days ago"),     # 7d ago
        (1701907200, "25 days ago"),    # 25d ago
        (1701820800, "1 month ago"),    # 26d ago
        (1700179200, "1 month ago"),    # 45d ago
        (1700092800, "2 months ago"),   # 46d ago
        (1688169600, "6 months ago"),   # ~6mo ago
        (1676505600, "11 months ago"),  # 319d ago
        (1676419200, "1 year ago"),     # 320d ago
        (1656806400, "1 year ago"),     # 547d ago
        (1656720000, "2 years ago"),    # 548d ago
        (1546300800, "5 years ago"),    # 5y ago
    ],
)
def test_time_ago_past(timestamp: int, expected: str) -> None:
    assert time_ago(timestamp, REF_TIME_AGO) == expected


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1704067230, "just now"),       # +30s
        (1704067260, "in 1 minute"),    # +1min
        (1704067500, "in 5 minutes"),   # +5min
        (1704070200, "in 1 hour"),      # +50min → 1 hour bucket
        (1704078000, "in 3 hours"),     # +3h
        (1704150000, "in 1 day"),       # +23h → 1 day bucket
        (1704240000, "in 2 days"),      # +2d
        (1706745600, "in 1 month"),     # +~31d
        (1735689600, "in 1 year"),      # +~366d
    ],
)
def test_time_ago_future(timestamp: int, expected: str) -> None:
    assert time_ago(timestamp, REF_TIME_AGO) == expected


# ---------------------------------------------------------------------------
# duration
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "seconds, expected",
    [
        (0, "0 seconds"),
        (1, "1 second"),
        (45, "45 seconds"),
        (60, "1 minute"),
        (90, "1 minute, 30 seconds"),
        (120, "2 minutes"),
        (3600, "1 hour"),
        (3661, "1 hour, 1 minute"),
        (5400, "1 hour, 30 minutes"),
        (9000, "2 hours, 30 minutes"),
        (86400, "1 day"),
        (93600, "1 day, 2 hours"),
        (604800, "7 days"),
        (2592000, "1 month"),
        (31536000, "1 year"),
        (36720000, "1 year, 2 months"),
    ],
)
def test_duration_normal(seconds: int, expected: str) -> None:
    assert duration(seconds) == expected


@pytest.mark.parametrize(
    "seconds, expected",
    [
        (0, "0s"),
        (45, "45s"),
        (3661, "1h 1m"),
        (9000, "2h 30m"),
        (93600, "1d 2h"),
    ],
)
def test_duration_compact(seconds: int, expected: str) -> None:
    assert duration(seconds, compact=True) == expected


@pytest.mark.parametrize(
    "seconds, max_u, expected",
    [
        (3661, 1, "1 hour"),
        (93600, 1, "1 day"),
        (93661, 3, "1 day, 2 hours, 1 minute"),
    ],
)
def test_duration_max_units(seconds: int, max_u: int, expected: str) -> None:
    assert duration(seconds, max_units=max_u) == expected


def test_duration_compact_max_units() -> None:
    assert duration(9000, compact=True, max_units=1) == "3h"


def test_duration_negative() -> None:
    with pytest.raises(ValueError):
        duration(-1)


# ---------------------------------------------------------------------------
# parse_duration
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "input_str, expected",
    [
        ("2h30m", 9000),
        ("2h 30m", 9000),
        ("2h, 30m", 9000),
        ("1.5h", 5400),
        ("90m", 5400),
        ("90min", 5400),
        ("45s", 45),
        ("45sec", 45),
        ("2d", 172800),
        ("1w", 604800),
        ("1d 2h 30m", 95400),
        ("2hr", 7200),
        ("2hrs", 7200),
        ("30mins", 1800),
    ],
)
def test_parse_duration_compact(input_str: str, expected: int) -> None:
    assert parse_duration(input_str) == expected


@pytest.mark.parametrize(
    "input_str, expected",
    [
        ("2 hours 30 minutes", 9000),
        ("2 hours and 30 minutes", 9000),
        ("2 hours, and 30 minutes", 9000),
        ("2.5 hours", 9000),
        ("90 minutes", 5400),
        ("2 days", 172800),
        ("1 week", 604800),
        ("1 day, 2 hours, and 30 minutes", 95400),
        ("45 seconds", 45),
    ],
)
def test_parse_duration_verbose(input_str: str, expected: int) -> None:
    assert parse_duration(input_str) == expected


@pytest.mark.parametrize(
    "input_str, expected",
    [
        ("2:30", 9000),
        ("1:30:00", 5400),
        ("0:05:30", 330),
    ],
)
def test_parse_duration_colon(input_str: str, expected: int) -> None:
    assert parse_duration(input_str) == expected


def test_parse_duration_case_insensitive() -> None:
    assert parse_duration("2H 30M") == 9000


def test_parse_duration_whitespace() -> None:
    assert parse_duration("  2 hours   30 minutes  ") == 9000


@pytest.mark.parametrize(
    "input_str",
    [
        "",
        "hello world",
        "-5 hours",
        "42",
        "5 foos",
    ],
)
def test_parse_duration_errors(input_str: str) -> None:
    with pytest.raises(ValueError):
        parse_duration(input_str)


# ---------------------------------------------------------------------------
# human_date
# ---------------------------------------------------------------------------

REF_HUMAN_DATE = 1705276800  # 2024-01-15 00:00:00 UTC (Monday)


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1705276800, "Today"),              # same timestamp
        (1705320000, "Today"),              # same day different time
        (1705190400, "Yesterday"),          # -1d
        (1705363200, "Tomorrow"),           # +1d
    ],
)
def test_human_date_nearby(timestamp: int, expected: str) -> None:
    assert human_date(timestamp, REF_HUMAN_DATE) == expected


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1705104000, "Last Saturday"),      # -2d
        (1705017600, "Last Friday"),        # -3d
        (1704931200, "Last Thursday"),      # -4d
        (1704844800, "Last Wednesday"),     # -5d
        (1704758400, "Last Tuesday"),       # -6d
    ],
)
def test_human_date_last(timestamp: int, expected: str) -> None:
    assert human_date(timestamp, REF_HUMAN_DATE) == expected


def test_human_date_7d_past() -> None:
    assert human_date(1704672000, REF_HUMAN_DATE) == "January 8"


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1705449600, "This Wednesday"),     # +2d
        (1705536000, "This Thursday"),      # +3d
        (1705795200, "This Sunday"),        # +6d
    ],
)
def test_human_date_this(timestamp: int, expected: str) -> None:
    assert human_date(timestamp, REF_HUMAN_DATE) == expected


def test_human_date_7d_future() -> None:
    assert human_date(1705881600, REF_HUMAN_DATE) == "January 22"


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1709251200, "March 1"),            # same year diff month
        (1735603200, "December 31"),        # same year diff month
    ],
)
def test_human_date_same_year(timestamp: int, expected: str) -> None:
    assert human_date(timestamp, REF_HUMAN_DATE) == expected


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        (1672531200, "January 1, 2023"),    # prior year
        (1736121600, "January 6, 2025"),    # next year
    ],
)
def test_human_date_diff_year(timestamp: int, expected: str) -> None:
    assert human_date(timestamp, REF_HUMAN_DATE) == expected


# ---------------------------------------------------------------------------
# date_range
# ---------------------------------------------------------------------------

EN_DASH = "\u2013"


@pytest.mark.parametrize(
    "start, end, expected",
    [
        (1705276800, 1705276800, "January 15, 2024"),
        (1705276800, 1705320000, "January 15, 2024"),
        (1705276800, 1705363200, f"January 15{EN_DASH}16, 2024"),
        (1705276800, 1705881600, f"January 15{EN_DASH}22, 2024"),
        (1705276800, 1707955200, f"January 15 {EN_DASH} February 15, 2024"),
        (1703721600, 1705276800, f"December 28, 2023 {EN_DASH} January 15, 2024"),
        (1704067200, 1735603200, f"January 1 {EN_DASH} December 31, 2024"),
        (1705881600, 1705276800, f"January 15{EN_DASH}22, 2024"),  # swapped
        (1672531200, 1735689600, f"January 1, 2023 {EN_DASH} January 1, 2025"),
    ],
)
def test_date_range(start: int, end: int, expected: str) -> None:
    assert date_range(start, end) == expected
