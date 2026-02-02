/// Whenwords: human-friendly date and time formatting.
/// All functions are pure — no system clock access.
/// All dates are in UTC.

// ──────────────────────────────────────────────
// Internal helpers for UTC date/time from epoch
// ──────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct DateTime {
    year: i64,
    month: u32,  // 1..=12
    day: u32,    // 1..=31
    hour: u32,
    minute: u32,
    second: u32,
}

fn timestamp_to_datetime(ts: i64) -> DateTime {
    // seconds since 1970-01-01 00:00:00 UTC
    let time_of_day = ts.rem_euclid(86400);

    let hour = (time_of_day / 3600) as u32;
    let minute = ((time_of_day % 3600) / 60) as u32;
    let second = (time_of_day % 60) as u32;

    // Civil days from epoch algorithm (Howard Hinnant)
    let z = ts.div_euclid(86400) + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    DateTime { year, month: m, day: d, hour, minute, second }
}

fn datetime_to_day_number(dt: &DateTime) -> i64 {
    // Returns days since 1970-01-01
    let y = if dt.month <= 2 { dt.year - 1 } else { dt.year };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u32;
    let m = dt.month;
    let d = dt.day;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe as i64 - 719468
}

fn day_of_week(dt: &DateTime) -> u32 {
    // 0=Sunday, 1=Monday, ..., 6=Saturday
    let dn = datetime_to_day_number(dt);
    // 1970-01-01 was Thursday (4)
    ((dn % 7 + 4 + 7) % 7) as u32
}

fn month_name(m: u32) -> &'static str {
    match m {
        1 => "January", 2 => "February", 3 => "March", 4 => "April",
        5 => "May", 6 => "June", 7 => "July", 8 => "August",
        9 => "September", 10 => "October", 11 => "November", 12 => "December",
        _ => panic!("invalid month"),
    }
}

fn weekday_name(dow: u32) -> &'static str {
    match dow {
        0 => "Sunday", 1 => "Monday", 2 => "Tuesday", 3 => "Wednesday",
        4 => "Thursday", 5 => "Friday", 6 => "Saturday",
        _ => panic!("invalid day of week"),
    }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/// Return a relative time string like "3 hours ago" or "in 2 days".
/// `timestamp` is the event time, `now` is the reference time (both Unix epoch seconds).
pub fn time_ago(timestamp: i64, now: i64) -> String {
    let diff = now - timestamp; // positive = past, negative = future
    let abs_diff = diff.unsigned_abs();

    if abs_diff <= 45 {
        return "just now".to_string();
    }

    let (value, unit) = if abs_diff < 45 * 60 {
        let minutes = (abs_diff as f64 / 60.0).round() as u64;
        (minutes, "minute")
    } else if abs_diff < 22 * 3600 {
        let hours = (abs_diff as f64 / 3600.0).round() as u64;
        (hours, "hour")
    } else if abs_diff < 26 * 86400 {
        let days = (abs_diff as f64 / 86400.0).round() as u64;
        (days, "day")
    } else if abs_diff < 345 * 86400 {
        let months = (abs_diff as f64 / (30.44 * 86400.0)).round() as u64;
        (months, "month")
    } else {
        let years = (abs_diff as f64 / (365.25 * 86400.0)).round() as u64;
        (years, "year")
    };

    let plural = if value == 1 { "" } else { "s" };
    if diff > 0 {
        format!("{} {}{} ago", value, unit, plural)
    } else {
        format!("in {} {}{}", value, unit, plural)
    }
}

/// Format a number of seconds as a human-readable duration.
/// `compact` selects between "2h 30m" and "2 hours, 30 minutes".
/// `max_units` controls how many units to show (default 2).
/// Panics on negative input.
pub fn duration(seconds: i64, compact: bool, max_units: Option<usize>) -> String {
    if seconds < 0 {
        panic!("duration: negative input");
    }
    let max_units = max_units.unwrap_or(2);

    if seconds == 0 || max_units == 0 {
        return if compact { "0s".to_string() } else { "0 seconds".to_string() };
    }

    let total_seconds = seconds as u64;
    let unit_secs: &[(u64, &str, &str)] = &[
        (86400, "day", "d"),
        (3600, "hour", "h"),
        (60, "minute", "m"),
        (1, "second", "s"),
    ];

    let mut parts: Vec<(u64, &str, &str)> = Vec::new();
    let mut remaining = total_seconds;

    for &(divisor, full, abbr) in unit_secs {
        if remaining >= divisor {
            let val = remaining / divisor;
            remaining %= divisor;
            parts.push((val, full, abbr));
        }
    }

    // If we need to truncate, round the last kept unit
    if parts.len() > max_units {
        let mut remainder_secs: u64 = 0;
        for i in max_units..parts.len() {
            let divisor = unit_secs.iter().find(|u| u.1 == parts[i].1).unwrap().0;
            remainder_secs += parts[i].0 * divisor;
        }
        let last_divisor = unit_secs.iter().find(|u| u.1 == parts[max_units - 1].1).unwrap().0;

        if remainder_secs * 2 >= last_divisor {
            parts[max_units - 1].0 += 1;
            // Handle carry
            let mut i = max_units - 1;
            while i > 0 {
                let curr_divisor = unit_secs.iter().find(|u| u.1 == parts[i].1).unwrap().0;
                let prev_divisor = unit_secs.iter().find(|u| u.1 == parts[i - 1].1).unwrap().0;
                let carry_threshold = prev_divisor / curr_divisor;
                if parts[i].0 >= carry_threshold {
                    parts[i].0 -= carry_threshold;
                    parts[i - 1].0 += 1;
                }
                i -= 1;
            }
        }
        parts.truncate(max_units);
    }

    // Remove trailing zero parts (can happen after carry)
    while parts.last().map_or(false, |p| p.0 == 0) {
        parts.pop();
    }

    if parts.is_empty() {
        return if compact { "0s".to_string() } else { "0 seconds".to_string() };
    }

    if compact {
        parts.iter()
            .map(|(val, _, abbr)| format!("{}{}", val, abbr))
            .collect::<Vec<_>>()
            .join(" ")
    } else {
        parts.iter()
            .map(|(val, full, _)| {
                let plural = if *val == 1 { "" } else { "s" };
                format!("{} {}{}", val, full, plural)
            })
            .collect::<Vec<_>>()
            .join(", ")
    }
}

/// Parse a human-written duration string into seconds.
/// Returns Err on empty, unrecognized, negative, or bare numbers.
pub fn parse_duration(input: &str) -> Result<i64, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("empty input".to_string());
    }

    if trimmed.starts_with('-') {
        return Err("negative values not allowed".to_string());
    }

    // Try colon notation: H:MM or H:MM:SS (no alphabetic chars)
    if trimmed.contains(':') && !trimmed.chars().any(|c| c.is_alphabetic()) {
        return parse_colon_notation(trimmed);
    }

    let lower = trimmed.to_lowercase();
    let cleaned = lower.replace(',', " ").replace(" and ", " ");

    let mut total_secs: f64 = 0.0;
    let mut found_any = false;
    let mut chars = cleaned.chars().peekable();

    while chars.peek().is_some() {
        // Skip whitespace
        while chars.peek().map_or(false, |c| c.is_whitespace()) {
            chars.next();
        }
        if chars.peek().is_none() {
            break;
        }

        // Parse number
        let mut num_str = String::new();
        while chars.peek().map_or(false, |c| c.is_ascii_digit() || *c == '.') {
            num_str.push(chars.next().unwrap());
        }

        if num_str.is_empty() {
            return Err(format!("unrecognized input: {}", trimmed));
        }

        let num: f64 = num_str.parse().map_err(|_| format!("invalid number: {}", num_str))?;

        // Skip whitespace between number and unit
        while chars.peek().map_or(false, |c| c.is_whitespace()) {
            chars.next();
        }

        // Parse unit
        let mut unit_str = String::new();
        while chars.peek().map_or(false, |c| c.is_alphabetic()) {
            unit_str.push(chars.next().unwrap());
        }

        if unit_str.is_empty() {
            return Err("bare number without unit".to_string());
        }

        let multiplier = unit_to_seconds(&unit_str)?;
        total_secs += num * multiplier;
        found_any = true;
    }

    if !found_any {
        return Err(format!("unrecognized input: {}", trimmed));
    }

    Ok(total_secs.round() as i64)
}

fn parse_colon_notation(s: &str) -> Result<i64, String> {
    let parts: Vec<&str> = s.split(':').collect();
    match parts.len() {
        2 => {
            let h: f64 = parts[0].trim().parse().map_err(|_| "invalid hours".to_string())?;
            let m: f64 = parts[1].trim().parse().map_err(|_| "invalid minutes".to_string())?;
            Ok((h * 3600.0 + m * 60.0).round() as i64)
        }
        3 => {
            let h: f64 = parts[0].trim().parse().map_err(|_| "invalid hours".to_string())?;
            let m: f64 = parts[1].trim().parse().map_err(|_| "invalid minutes".to_string())?;
            let s: f64 = parts[2].trim().parse().map_err(|_| "invalid seconds".to_string())?;
            Ok((h * 3600.0 + m * 60.0 + s).round() as i64)
        }
        _ => Err("invalid colon notation".to_string()),
    }
}

fn unit_to_seconds(unit: &str) -> Result<f64, String> {
    match unit {
        "s" | "sec" | "secs" | "second" | "seconds" => Ok(1.0),
        "m" | "min" | "mins" | "minute" | "minutes" => Ok(60.0),
        "h" | "hr" | "hrs" | "hour" | "hours" => Ok(3600.0),
        "d" | "day" | "days" => Ok(86400.0),
        "w" | "wk" | "wks" | "week" | "weeks" => Ok(604800.0),
        _ => Err(format!("unrecognized unit: {}", unit)),
    }
}

/// Return a contextual date string based on how far `timestamp` is from `now`.
/// Both are Unix epoch seconds. All comparisons in UTC calendar days.
pub fn human_date(timestamp: i64, now: i64) -> String {
    let ts_dt = timestamp_to_datetime(timestamp);
    let now_dt = timestamp_to_datetime(now);

    let ts_day = datetime_to_day_number(&ts_dt);
    let now_day = datetime_to_day_number(&now_dt);
    let diff_days = ts_day - now_day; // positive = future, negative = past

    if diff_days == 0 {
        return "Today".to_string();
    }
    if diff_days == -1 {
        return "Yesterday".to_string();
    }
    if diff_days == 1 {
        return "Tomorrow".to_string();
    }
    if diff_days >= 2 && diff_days <= 6 {
        let dow = day_of_week(&ts_dt);
        return format!("This {}", weekday_name(dow));
    }
    if diff_days >= -6 && diff_days <= -2 {
        let dow = day_of_week(&ts_dt);
        return format!("Last {}", weekday_name(dow));
    }
    if ts_dt.year == now_dt.year {
        return format!("{} {}", month_name(ts_dt.month), ts_dt.day);
    }
    format!("{} {}, {}", month_name(ts_dt.month), ts_dt.day, ts_dt.year)
}

/// Format two timestamps as a smart date range string.
/// Auto-swaps if start > end. Uses en-dash (\u{2013}).
pub fn date_range(start: i64, end: i64) -> String {
    let (start, end) = if start > end { (end, start) } else { (start, end) };

    let s = timestamp_to_datetime(start);
    let e = timestamp_to_datetime(end);

    let s_day = datetime_to_day_number(&s);
    let e_day = datetime_to_day_number(&e);

    if s_day == e_day {
        return format!("{} {}, {}", month_name(s.month), s.day, s.year);
    }
    if s.year == e.year && s.month == e.month {
        return format!("{} {}\u{2013}{}, {}", month_name(s.month), s.day, e.day, s.year);
    }
    if s.year == e.year {
        return format!(
            "{} {} \u{2013} {} {}, {}",
            month_name(s.month), s.day,
            month_name(e.month), e.day,
            s.year
        );
    }
    format!(
        "{} {}, {} \u{2013} {} {}, {}",
        month_name(s.month), s.day, s.year,
        month_name(e.month), e.day, e.year
    )
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_ts(year: i64, month: u32, day: u32, hour: u32, min: u32, sec: u32) -> i64 {
        let dt = DateTime { year, month, day, hour, minute: min, second: sec };
        let day_num = datetime_to_day_number(&dt);
        day_num * 86400 + hour as i64 * 3600 + min as i64 * 60 + sec as i64
    }

    // ── DateTime round-trip tests ──

    #[test]
    fn test_epoch() {
        let dt = timestamp_to_datetime(0);
        assert_eq!((dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second),
                   (1970, 1, 1, 0, 0, 0));
    }

    #[test]
    fn test_known_date_roundtrip() {
        let ts = make_ts(2024, 1, 15, 12, 30, 45);
        let dt = timestamp_to_datetime(ts);
        assert_eq!((dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second),
                   (2024, 1, 15, 12, 30, 45));
    }

    #[test]
    fn test_leap_year_feb29() {
        let ts = make_ts(2024, 2, 29, 0, 0, 0);
        let dt = timestamp_to_datetime(ts);
        assert_eq!((dt.year, dt.month, dt.day), (2024, 2, 29));
    }

    #[test]
    fn test_roundtrip_various_dates() {
        for (y, mo, d, h, mi, s) in [
            (1970, 1, 1, 0, 0, 0),
            (2000, 1, 1, 0, 0, 0),
            (2024, 2, 29, 23, 59, 59),
            (2024, 12, 31, 12, 0, 0),
            (1999, 12, 31, 23, 59, 59),
            (2100, 3, 1, 0, 0, 0),
        ] {
            let ts = make_ts(y, mo, d, h, mi, s);
            let dt = timestamp_to_datetime(ts);
            assert_eq!((dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second),
                       (y, mo, d, h, mi, s), "failed for {}-{}-{}", y, mo, d);
        }
    }

    #[test]
    fn test_day_of_week_epoch() {
        let dt = timestamp_to_datetime(0);
        assert_eq!(day_of_week(&dt), 4); // Thursday
    }

    #[test]
    fn test_day_of_week_known() {
        // 2024-01-15 is Monday
        let dt = timestamp_to_datetime(make_ts(2024, 1, 15, 0, 0, 0));
        assert_eq!(day_of_week(&dt), 1);
    }

    // ── time_ago tests ──

    #[test]
    fn test_time_ago_just_now() {
        let now = 1_000_000;
        assert_eq!(time_ago(now, now), "just now");
        assert_eq!(time_ago(now - 30, now), "just now");
        assert_eq!(time_ago(now + 30, now), "just now");
        assert_eq!(time_ago(now - 45, now), "just now");
    }

    #[test]
    fn test_time_ago_minutes_past() {
        let now = 1_000_000;
        assert_eq!(time_ago(now - 60, now), "1 minute ago");
        assert_eq!(time_ago(now - 120, now), "2 minutes ago");
        assert_eq!(time_ago(now - 44 * 60, now), "44 minutes ago");
    }

    #[test]
    fn test_time_ago_hours_past() {
        let now = 1_000_000;
        assert_eq!(time_ago(now - 45 * 60, now), "1 hour ago");
        assert_eq!(time_ago(now - 2 * 3600, now), "2 hours ago");
        assert_eq!(time_ago(now - 21 * 3600, now), "21 hours ago");
    }

    #[test]
    fn test_time_ago_days_past() {
        let now = 10_000_000;
        assert_eq!(time_ago(now - 22 * 3600, now), "1 day ago");
        assert_eq!(time_ago(now - 2 * 86400, now), "2 days ago");
        assert_eq!(time_ago(now - 25 * 86400, now), "25 days ago");
    }

    #[test]
    fn test_time_ago_months_past() {
        let now = 100_000_000;
        assert_eq!(time_ago(now - 30 * 86400, now), "1 month ago");
        assert_eq!(time_ago(now - 60 * 86400, now), "2 months ago");
    }

    #[test]
    fn test_time_ago_years() {
        let now = 100_000_000;
        assert_eq!(time_ago(now - 400 * 86400, now), "1 year ago");
        assert_eq!(time_ago(now - 800 * 86400, now), "2 years ago");
    }

    #[test]
    fn test_time_ago_future() {
        let now = 1_000_000;
        assert_eq!(time_ago(now + 120, now), "in 2 minutes");
        assert_eq!(time_ago(now + 2 * 3600, now), "in 2 hours");
        assert_eq!(time_ago(now + 3 * 86400, now), "in 3 days");
    }

    // ── duration tests ──

    #[test]
    fn test_duration_zero() {
        assert_eq!(duration(0, false, None), "0 seconds");
        assert_eq!(duration(0, true, None), "0s");
    }

    #[test]
    fn test_duration_basic() {
        assert_eq!(duration(45, false, None), "45 seconds");
        assert_eq!(duration(45, true, None), "45s");
        assert_eq!(duration(150, false, None), "2 minutes, 30 seconds");
        assert_eq!(duration(150, true, None), "2m 30s");
        assert_eq!(duration(9000, false, None), "2 hours, 30 minutes");
        assert_eq!(duration(9000, true, None), "2h 30m");
    }

    #[test]
    fn test_duration_singular() {
        assert_eq!(duration(1, false, None), "1 second");
        assert_eq!(duration(60, false, None), "1 minute");
        assert_eq!(duration(3600, false, None), "1 hour");
        assert_eq!(duration(86400, false, None), "1 day");
    }

    #[test]
    fn test_duration_max_units_rounding() {
        // 2h 30m 15s, max=1 → 30m15s=1815s, half of 3600=1800, round up → 3h
        assert_eq!(duration(9015, false, Some(1)), "3 hours");
        // 2h 10m, max=1 → 10m=600s < 1800 → 2h
        assert_eq!(duration(7800, false, Some(1)), "2 hours");
    }

    #[test]
    fn test_duration_rounding_carry() {
        // 1h 59m 50s, max=2. rem=50s, half of 60=30. round up 59→60 → carry → 2h
        assert_eq!(duration(3600 + 59 * 60 + 50, false, Some(2)), "2 hours");
    }

    #[test]
    fn test_duration_days_multi_unit() {
        let secs = 2 * 86400 + 3 * 3600 + 4 * 60 + 5;
        assert_eq!(duration(secs, false, Some(4)), "2 days, 3 hours, 4 minutes, 5 seconds");
        assert_eq!(duration(secs, true, Some(4)), "2d 3h 4m 5s");
        assert_eq!(duration(secs, false, None), "2 days, 3 hours"); // default max=2
    }

    #[test]
    #[should_panic]
    fn test_duration_negative() {
        duration(-1, false, None);
    }

    // ── parse_duration tests ──

    #[test]
    fn test_parse_compact() {
        assert_eq!(parse_duration("2h30m").unwrap(), 9000);
        assert_eq!(parse_duration("45s").unwrap(), 45);
        assert_eq!(parse_duration("1d12h").unwrap(), 129600);
    }

    #[test]
    fn test_parse_verbose() {
        assert_eq!(parse_duration("2 hours and 30 minutes").unwrap(), 9000);
        assert_eq!(parse_duration("1 day, 2 hours, and 30 minutes").unwrap(), 95400);
    }

    #[test]
    fn test_parse_colon() {
        assert_eq!(parse_duration("2:30").unwrap(), 9000);
        assert_eq!(parse_duration("1:30:00").unwrap(), 5400);
        assert_eq!(parse_duration("0:05").unwrap(), 300);
        assert_eq!(parse_duration("0:00:30").unwrap(), 30);
    }

    #[test]
    fn test_parse_decimal() {
        assert_eq!(parse_duration("2.5 hours").unwrap(), 9000);
        assert_eq!(parse_duration("1.5h").unwrap(), 5400);
        assert_eq!(parse_duration("0.5d").unwrap(), 43200);
    }

    #[test]
    fn test_parse_case_insensitive() {
        assert_eq!(parse_duration("2H30M").unwrap(), 9000);
        assert_eq!(parse_duration("2 HOURS").unwrap(), 7200);
    }

    #[test]
    fn test_parse_whitespace() {
        assert_eq!(parse_duration("  2 hours   30 minutes  ").unwrap(), 9000);
    }

    #[test]
    fn test_parse_abbreviations() {
        assert_eq!(parse_duration("1hr").unwrap(), 3600);
        assert_eq!(parse_duration("2hrs").unwrap(), 7200);
        assert_eq!(parse_duration("5min").unwrap(), 300);
        assert_eq!(parse_duration("5mins").unwrap(), 300);
        assert_eq!(parse_duration("10sec").unwrap(), 10);
        assert_eq!(parse_duration("10secs").unwrap(), 10);
    }

    #[test]
    fn test_parse_weeks() {
        assert_eq!(parse_duration("1 week").unwrap(), 604800);
        assert_eq!(parse_duration("2 weeks").unwrap(), 1209600);
        assert_eq!(parse_duration("1w").unwrap(), 604800);
    }

    #[test]
    fn test_parse_errors() {
        assert!(parse_duration("").is_err(), "empty");
        assert!(parse_duration("   ").is_err(), "whitespace");
        assert!(parse_duration("-5 hours").is_err(), "negative");
        assert!(parse_duration("42").is_err(), "bare number");
        assert!(parse_duration("hello").is_err(), "letters only");
        assert!(parse_duration("5 foos").is_err(), "unknown unit");
    }

    // ── human_date tests ──

    #[test]
    fn test_human_date_today() {
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2024, 6, 15, 8, 0, 0), now), "Today");
    }

    #[test]
    fn test_human_date_yesterday() {
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2024, 6, 14, 20, 0, 0), now), "Yesterday");
    }

    #[test]
    fn test_human_date_tomorrow() {
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2024, 6, 16, 8, 0, 0), now), "Tomorrow");
    }

    #[test]
    fn test_human_date_this_week_future() {
        // 2024-06-15 is Saturday. 2024-06-17 is Monday (2 days ahead).
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2024, 6, 17, 10, 0, 0), now), "This Monday");
    }

    #[test]
    fn test_human_date_last_week() {
        // 2024-06-15 is Saturday. 2024-06-10 is Monday (5 days ago).
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2024, 6, 10, 10, 0, 0), now), "Last Monday");
    }

    #[test]
    fn test_human_date_same_year_far() {
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2024, 3, 5, 10, 0, 0), now), "March 5");
        assert_eq!(human_date(make_ts(2024, 12, 25, 0, 0, 0), now), "December 25");
    }

    #[test]
    fn test_human_date_different_year() {
        let now = make_ts(2024, 6, 15, 14, 0, 0);
        assert_eq!(human_date(make_ts(2023, 3, 5, 10, 0, 0), now), "March 5, 2023");
        assert_eq!(human_date(make_ts(2025, 1, 1, 0, 0, 0), now), "January 1, 2025");
    }

    #[test]
    fn test_human_date_boundary_midnight() {
        let before = make_ts(2024, 6, 15, 23, 59, 59);
        let after = make_ts(2024, 6, 16, 0, 0, 0);
        assert_eq!(human_date(before, after), "Yesterday");
        assert_eq!(human_date(after, before), "Tomorrow");
    }

    // ── date_range tests ──

    #[test]
    fn test_date_range_same_day() {
        let a = make_ts(2024, 1, 15, 10, 0, 0);
        let b = make_ts(2024, 1, 15, 18, 0, 0);
        assert_eq!(date_range(a, b), "January 15, 2024");
    }

    #[test]
    fn test_date_range_same_month() {
        let a = make_ts(2024, 1, 15, 0, 0, 0);
        let b = make_ts(2024, 1, 22, 0, 0, 0);
        assert_eq!(date_range(a, b), "January 15\u{2013}22, 2024");
    }

    #[test]
    fn test_date_range_same_year_diff_months() {
        let a = make_ts(2024, 1, 15, 0, 0, 0);
        let b = make_ts(2024, 2, 15, 0, 0, 0);
        assert_eq!(date_range(a, b), "January 15 \u{2013} February 15, 2024");
    }

    #[test]
    fn test_date_range_different_years() {
        let a = make_ts(2023, 12, 28, 0, 0, 0);
        let b = make_ts(2024, 1, 15, 0, 0, 0);
        assert_eq!(date_range(a, b), "December 28, 2023 \u{2013} January 15, 2024");
    }

    #[test]
    fn test_date_range_auto_swap() {
        let a = make_ts(2024, 2, 15, 0, 0, 0);
        let b = make_ts(2024, 1, 15, 0, 0, 0);
        assert_eq!(date_range(a, b), "January 15 \u{2013} February 15, 2024");
    }

    #[test]
    fn test_date_range_uses_en_dash() {
        let a = make_ts(2024, 3, 1, 0, 0, 0);
        let b = make_ts(2024, 3, 5, 0, 0, 0);
        let result = date_range(a, b);
        assert!(result.contains('\u{2013}'), "should contain en-dash: {}", result);
        assert!(!result.contains('-'), "should not contain hyphen: {}", result);
    }
}
