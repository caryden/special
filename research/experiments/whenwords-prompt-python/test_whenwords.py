"""
Comprehensive tests for the whenwords library.
"""

import pytest
from datetime import datetime, timezone
from whenwords import time_ago, duration, parse_duration, human_date, date_range


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ts(year, month, day, hour=0, minute=0, second=0):
    """Create a UTC timestamp from components."""
    return int(datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).timestamp())


# A convenient "now" for many tests: 2024-06-15 12:00:00 UTC (a Saturday)
NOW = ts(2024, 6, 15, 12, 0, 0)


# ===========================================================================
# time_ago
# ===========================================================================

class TestTimeAgo:
    def test_just_now_zero_diff(self):
        assert time_ago(NOW, NOW) == "just now"

    def test_just_now_few_seconds_past(self):
        assert time_ago(NOW - 10, NOW) == "just now"

    def test_just_now_few_seconds_future(self):
        assert time_ago(NOW + 10, NOW) == "just now"

    def test_just_now_boundary_44s(self):
        assert time_ago(NOW - 44, NOW) == "just now"

    def test_one_minute_ago(self):
        result = time_ago(NOW - 60, NOW)
        assert "minute" in result and "ago" in result

    def test_minutes_ago(self):
        result = time_ago(NOW - 300, NOW)  # 5 minutes
        assert "5 minutes ago" == result

    def test_minutes_future(self):
        result = time_ago(NOW + 300, NOW)  # 5 minutes in future
        assert "in 5 minutes" == result

    def test_30_minutes_ago(self):
        result = time_ago(NOW - 1800, NOW)
        assert "30 minutes ago" == result

    def test_one_hour_threshold(self):
        # 45 minutes should cross into "1 hour ago"
        result = time_ago(NOW - 45 * 60, NOW)
        assert "hour" in result and "ago" in result

    def test_several_hours_ago(self):
        result = time_ago(NOW - 3 * 3600, NOW)
        assert "3 hours ago" == result

    def test_hours_future(self):
        result = time_ago(NOW + 3 * 3600, NOW)
        assert "in 3 hours" == result

    def test_one_day_threshold(self):
        # 22 hours should cross into "1 day ago"
        result = time_ago(NOW - 22 * 3600, NOW)
        assert "day" in result

    def test_several_days_ago(self):
        result = time_ago(NOW - 5 * 86400, NOW)
        assert "5 days ago" == result

    def test_days_future(self):
        result = time_ago(NOW + 5 * 86400, NOW)
        assert "in 5 days" == result

    def test_one_month(self):
        result = time_ago(NOW - 30 * 86400, NOW)
        assert "month" in result

    def test_several_months(self):
        result = time_ago(NOW - 90 * 86400, NOW)
        assert "month" in result and "ago" in result

    def test_one_year(self):
        result = time_ago(NOW - 400 * 86400, NOW)
        assert "year" in result

    def test_several_years(self):
        result = time_ago(NOW - 3 * 365 * 86400, NOW)
        assert "year" in result and "ago" in result

    def test_far_future(self):
        result = time_ago(NOW + 3 * 365 * 86400, NOW)
        assert "year" in result and "in " in result


# ===========================================================================
# duration
# ===========================================================================

class TestDuration:
    # --- Normal mode ---
    def test_zero_seconds(self):
        assert duration(0) == "0 seconds"

    def test_zero_compact(self):
        assert duration(0, compact=True) == "0s"

    def test_one_second(self):
        assert duration(1) == "1 second"

    def test_seconds_only(self):
        assert duration(45) == "45 seconds"

    def test_one_minute(self):
        assert duration(60) == "1 minute"

    def test_minutes_and_seconds(self):
        assert duration(90) == "1 minute, 30 seconds"

    def test_one_hour(self):
        assert duration(3600) == "1 hour"

    def test_hours_and_minutes(self):
        assert duration(3600 + 1800) == "1 hour, 30 minutes"

    def test_two_hours_thirty(self):
        assert duration(2 * 3600 + 30 * 60) == "2 hours, 30 minutes"

    def test_days_and_hours(self):
        result = duration(86400 + 7200)
        assert result == "1 day, 2 hours"

    def test_max_units_1(self):
        # 2h 30m 15s with max_units=1 -> should round 30m into hours
        result = duration(2 * 3600 + 30 * 60 + 15, max_units=1)
        assert "hour" in result
        # It should show 3 hours since 30 min >= 30 min (half of 3600)
        assert result == "3 hours"

    def test_max_units_3(self):
        result = duration(86400 + 3600 + 120 + 45, max_units=3)
        assert "day" in result and "hour" in result and "minute" in result

    def test_rounding_last_unit(self):
        # 1 hour, 59 minutes, 50 seconds with max_units=2
        # Should round minutes: 59 min + 50s -> 60 minutes
        result = duration(3600 + 59 * 60 + 50, max_units=2)
        # 59 minutes with 50 remaining seconds (>= 30), should round to 60 minutes
        assert "hour" in result

    # --- Compact mode ---
    def test_compact_hours_minutes(self):
        assert duration(2 * 3600 + 30 * 60, compact=True) == "2h 30m"

    def test_compact_seconds(self):
        assert duration(45, compact=True) == "45s"

    def test_compact_days_hours(self):
        assert duration(86400 + 7200, compact=True) == "1d 2h"

    # --- Error cases ---
    def test_negative_raises(self):
        with pytest.raises(ValueError):
            duration(-1)

    def test_negative_large_raises(self):
        with pytest.raises(ValueError):
            duration(-100)


# ===========================================================================
# parse_duration
# ===========================================================================

class TestParseDuration:
    # --- Compact format ---
    def test_compact_hours_minutes(self):
        assert parse_duration("2h30m") == 2 * 3600 + 30 * 60

    def test_compact_seconds(self):
        assert parse_duration("45s") == 45

    def test_compact_hours_only(self):
        assert parse_duration("3h") == 3 * 3600

    def test_compact_minutes_only(self):
        assert parse_duration("15m") == 15 * 60

    def test_compact_all_units(self):
        assert parse_duration("1d2h30m15s") == 86400 + 7200 + 1800 + 15

    # --- Verbose format ---
    def test_verbose_hours_minutes(self):
        assert parse_duration("2 hours and 30 minutes") == 2 * 3600 + 30 * 60

    def test_verbose_singular(self):
        assert parse_duration("1 hour") == 3600

    def test_verbose_seconds(self):
        assert parse_duration("10 seconds") == 10

    def test_verbose_mixed(self):
        assert parse_duration("1 day, 2 hours, and 30 minutes") == 86400 + 7200 + 1800

    # --- Colon notation ---
    def test_colon_hours_minutes(self):
        assert parse_duration("2:30") == 2 * 3600 + 30 * 60

    def test_colon_hms(self):
        assert parse_duration("1:30:00") == 1 * 3600 + 30 * 60

    def test_colon_hms_with_seconds(self):
        assert parse_duration("1:30:45") == 1 * 3600 + 30 * 60 + 45

    def test_colon_zero_hours(self):
        assert parse_duration("0:45") == 45 * 60

    # --- Decimals ---
    def test_decimal_hours(self):
        assert parse_duration("2.5 hours") == 2 * 3600 + 30 * 60

    def test_decimal_minutes(self):
        assert parse_duration("1.5 minutes") == 90

    # --- Abbreviations ---
    def test_hr_abbreviation(self):
        assert parse_duration("2hr") == 7200

    def test_hrs_abbreviation(self):
        assert parse_duration("2hrs") == 7200

    def test_min_abbreviation(self):
        assert parse_duration("30min") == 1800

    def test_mins_abbreviation(self):
        assert parse_duration("30mins") == 1800

    def test_sec_abbreviation(self):
        assert parse_duration("10sec") == 10

    def test_secs_abbreviation(self):
        assert parse_duration("10secs") == 10

    # --- Case insensitivity ---
    def test_uppercase(self):
        assert parse_duration("2H30M") == 2 * 3600 + 30 * 60

    def test_mixed_case(self):
        assert parse_duration("2 Hours And 30 Minutes") == 2 * 3600 + 30 * 60

    # --- Extra whitespace ---
    def test_leading_trailing_whitespace(self):
        assert parse_duration("  2h 30m  ") == 2 * 3600 + 30 * 60

    def test_extra_internal_whitespace(self):
        assert parse_duration("2  hours   30  minutes") == 2 * 3600 + 30 * 60

    # --- Weeks ---
    def test_weeks(self):
        assert parse_duration("2 weeks") == 2 * 604800

    def test_week_abbreviation(self):
        assert parse_duration("1w") == 604800

    # --- Error cases ---
    def test_empty_string(self):
        with pytest.raises(ValueError):
            parse_duration("")

    def test_whitespace_only(self):
        with pytest.raises(ValueError):
            parse_duration("   ")

    def test_bare_number(self):
        with pytest.raises(ValueError):
            parse_duration("42")

    def test_negative(self):
        with pytest.raises(ValueError):
            parse_duration("-5 hours")

    def test_unrecognized_units(self):
        with pytest.raises(ValueError):
            parse_duration("5 foos")

    def test_garbage(self):
        with pytest.raises(ValueError):
            parse_duration("hello world")


# ===========================================================================
# human_date
# ===========================================================================

class TestHumanDate:
    def test_today(self):
        assert human_date(NOW, NOW) == "Today"

    def test_today_different_time(self):
        # Same calendar day, different hours
        morning = ts(2024, 6, 15, 6, 0, 0)
        evening = ts(2024, 6, 15, 22, 0, 0)
        assert human_date(morning, evening) == "Today"

    def test_yesterday(self):
        yesterday = ts(2024, 6, 14, 15, 0, 0)
        assert human_date(yesterday, NOW) == "Yesterday"

    def test_tomorrow(self):
        tomorrow = ts(2024, 6, 16, 8, 0, 0)
        assert human_date(tomorrow, NOW) == "Tomorrow"

    def test_last_day_within_week(self):
        # NOW is Saturday June 15. 3 days ago is Wednesday June 12.
        wed = ts(2024, 6, 12, 10, 0, 0)
        result = human_date(wed, NOW)
        assert result == "Last Wednesday"

    def test_last_day_2_days_ago(self):
        # 2 days ago is Thursday June 13
        thu = ts(2024, 6, 13, 10, 0, 0)
        result = human_date(thu, NOW)
        assert result == "Last Thursday"

    def test_this_coming_day(self):
        # 3 days from Saturday June 15 is Tuesday June 18
        tue = ts(2024, 6, 18, 10, 0, 0)
        result = human_date(tue, NOW)
        assert result == "This Tuesday"

    def test_this_coming_day_2_days(self):
        # 2 days from Saturday June 15 is Monday June 17
        mon = ts(2024, 6, 17, 10, 0, 0)
        result = human_date(mon, NOW)
        assert result == "This Monday"

    def test_same_year_past(self):
        # March 5 same year (well beyond a week)
        march5 = ts(2024, 3, 5, 10, 0, 0)
        result = human_date(march5, NOW)
        assert result == "March 5"

    def test_same_year_future(self):
        # December 25 same year
        xmas = ts(2024, 12, 25, 10, 0, 0)
        result = human_date(xmas, NOW)
        assert result == "December 25"

    def test_different_year_past(self):
        old = ts(2023, 3, 5, 10, 0, 0)
        result = human_date(old, NOW)
        assert result == "March 5, 2023"

    def test_different_year_future(self):
        future = ts(2025, 1, 15, 10, 0, 0)
        result = human_date(future, NOW)
        assert result == "January 15, 2025"

    def test_exactly_7_days_ago(self):
        # 7 days ago = June 8 (Saturday), should be "Last Saturday"
        week_ago = ts(2024, 6, 8, 10, 0, 0)
        result = human_date(week_ago, NOW)
        assert result == "Last Saturday"

    def test_8_days_ago_no_last(self):
        # 8 days ago should be "June 7" (same year)
        eight_ago = ts(2024, 6, 7, 10, 0, 0)
        result = human_date(eight_ago, NOW)
        assert result == "June 7"

    def test_exactly_7_days_future(self):
        # 7 days from now = June 22 (Saturday), should be "This Saturday"
        week_ahead = ts(2024, 6, 22, 10, 0, 0)
        result = human_date(week_ahead, NOW)
        assert result == "This Saturday"

    def test_8_days_future(self):
        # 8 days ahead should show month + day
        eight_ahead = ts(2024, 6, 23, 10, 0, 0)
        result = human_date(eight_ahead, NOW)
        assert result == "June 23"


# ===========================================================================
# date_range
# ===========================================================================

class TestDateRange:
    def test_same_day(self):
        start = ts(2024, 1, 15, 10, 0, 0)
        end = ts(2024, 1, 15, 18, 0, 0)
        assert date_range(start, end) == "January 15, 2024"

    def test_same_month(self):
        start = ts(2024, 1, 15, 0, 0, 0)
        end = ts(2024, 1, 22, 0, 0, 0)
        result = date_range(start, end)
        assert result == "January 15\u201322, 2024"

    def test_same_year_different_months(self):
        start = ts(2024, 1, 15, 0, 0, 0)
        end = ts(2024, 2, 15, 0, 0, 0)
        result = date_range(start, end)
        assert result == "January 15 \u2013 February 15, 2024"

    def test_different_years(self):
        start = ts(2023, 12, 28, 0, 0, 0)
        end = ts(2024, 1, 15, 0, 0, 0)
        result = date_range(start, end)
        assert result == "December 28, 2023 \u2013 January 15, 2024"

    def test_auto_swap(self):
        start = ts(2024, 3, 1, 0, 0, 0)
        end = ts(2024, 1, 1, 0, 0, 0)
        result = date_range(start, end)
        # Should auto-swap so Jan comes first
        assert "January" in result
        assert result.index("January") < result.index("March")

    def test_en_dash_used(self):
        start = ts(2024, 1, 15, 0, 0, 0)
        end = ts(2024, 1, 22, 0, 0, 0)
        result = date_range(start, end)
        assert "\u2013" in result
        assert "-" not in result  # regular hyphen not used

    def test_same_day_auto_swap(self):
        # Same timestamps, reversed
        t = ts(2024, 5, 1, 12, 0, 0)
        assert date_range(t, t) == "May 1, 2024"

    def test_same_month_end_of_month(self):
        start = ts(2024, 3, 1, 0, 0, 0)
        end = ts(2024, 3, 31, 0, 0, 0)
        result = date_range(start, end)
        assert result == "March 1\u201331, 2024"

    def test_different_years_far_apart(self):
        start = ts(2020, 1, 1, 0, 0, 0)
        end = ts(2024, 12, 31, 0, 0, 0)
        result = date_range(start, end)
        assert "2020" in result and "2024" in result
