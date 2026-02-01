// whenwords — Human-friendly date/time formatting.
// Zero external dependencies. All functions are pure (no system clock).

// ---------------------------------------------------------------------------
// UTC date utilities
// ---------------------------------------------------------------------------

/// A simple UTC date representation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct UtcDate {
    year: i64,
    month: u32,  // 1..=12
    day: u32,    // 1..=31
    weekday: u32, // 0=Sunday .. 6=Saturday
}

/// Convert a count of days since Unix epoch (1970-01-01) to (year, month, day).
/// Uses Howard Hinnant's civil_from_days algorithm.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era: i64 = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe: u64 = (z - era * 146097) as u64; // 0..=146096
    let yoe: u64 =
        (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // 0..=399
    let y: i64 = yoe as i64 + era * 400;
    let doy: u64 = doe - (365 * yoe + yoe / 4 - yoe / 100); // 0..=365
    let mp: u64 = (5 * doy + 2) / 153; // 0..=11
    let d: u32 = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m: u32 = if mp < 10 { mp as u32 + 3 } else { mp as u32 - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

/// Day of week from days since epoch (0=Sunday).
fn weekday_from_days(days: i64) -> u32 {
    // 1970-01-01 was a Thursday (4).
    ((days % 7 + 4 + 7) % 7) as u32
}

/// Convert unix timestamp (seconds) to UtcDate.
fn utc_date_from_timestamp(ts: i64) -> UtcDate {
    let days = ts.div_euclid(86400);
    let (year, month, day) = civil_from_days(days);
    let weekday = weekday_from_days(days);
    UtcDate { year, month, day, weekday }
}

/// Day number since epoch for a given timestamp (floored to start of UTC day).
fn day_number(ts: i64) -> i64 {
    ts.div_euclid(86400)
}

const DAY_NAMES: [&str; 7] = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const MONTH_NAMES: [&str; 12] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// ---------------------------------------------------------------------------
// time_ago
// ---------------------------------------------------------------------------

/// Returns a human-friendly relative time string like "5 minutes ago" or "in 3 hours".
///
/// Both `timestamp` and `reference` are unix timestamps in seconds.
pub fn time_ago(timestamp: i64, reference: i64) -> String {
    let diff = reference - timestamp;
    let seconds = diff.unsigned_abs();
    let is_future = timestamp > reference;

    let format = |n: u64, unit: &str| -> String {
        let plural = if n == 1 { "" } else { "s" };
        if is_future {
            format!("in {} {}{}", n, unit, plural)
        } else {
            format!("{} {}{} ago", n, unit, plural)
        }
    };

    match seconds {
        0..=44 => "just now".to_string(),
        45..=89 => format(1, "minute"),
        90..=2699 => {
            // 2699 = 44*60 + 59
            let n = ((seconds as f64) / 60.0).round() as u64;
            format(n, "minute")
        }
        2700..=5399 => format(1, "hour"),
        5400..=79199 => {
            // 79199 = 21*3600 + 3599
            let n = ((seconds as f64) / 3600.0).round() as u64;
            format(n, "hour")
        }
        79200..=129599 => format(1, "day"),
        129600..=2246399 => {
            // up to 25d 23h 59m 59s (26d = 2246400 is "1 month")
            let n = ((seconds as f64) / 86400.0).round() as u64;
            format(n, "day")
        }
        2246400..=3974399 => format(1, "month"),
        3974400..=27647999 => {
            // 46d to 319d (320d = 27648000 is "1 year")
            let n = ((seconds as f64) / (30.0 * 86400.0)).round() as u64;
            format(n, "month")
        }
        27648000..=47347199 => format(1, "year"),
        _ => {
            let n = ((seconds as f64) / (365.0 * 86400.0)).round() as u64;
            format(n, "year")
        }
    }
}

// ---------------------------------------------------------------------------
// duration
// ---------------------------------------------------------------------------

const DURATION_UNITS: [(u64, &str, &str); 6] = [
    (365 * 86400, "year", "y"),
    (30 * 86400, "month", "mo"),
    (86400, "day", "d"),
    (3600, "hour", "h"),
    (60, "minute", "m"),
    (1, "second", "s"),
];

/// Format a duration in seconds as a human-readable string.
///
/// Uses default options: compact=false, max_units=2.
pub fn duration(seconds: u64) -> String {
    duration_with_options(seconds, false, 2)
}

/// Format a duration in seconds with explicit options.
///
/// - `compact`: use abbreviations (e.g. "2h 30m" instead of "2 hours, 30 minutes")
/// - `max_units`: maximum number of units to display (remaining is rounded into last unit)
pub fn duration_with_options(seconds: u64, compact: bool, max_units: usize) -> String {
    if seconds == 0 {
        return if compact {
            "0s".to_string()
        } else {
            "0 seconds".to_string()
        };
    }

    // First, decompose into all units.
    let mut parts: Vec<(u64, usize)> = Vec::new(); // (count, unit_index)
    let mut remaining = seconds;
    for (i, &(unit_secs, _, _)) in DURATION_UNITS.iter().enumerate() {
        if remaining >= unit_secs {
            let count = remaining / unit_secs;
            remaining %= unit_secs;
            parts.push((count, i));
        }
    }

    // If max_units truncates, round the last kept unit.
    if parts.len() > max_units {
        // Sum up the remainder in seconds after the first max_units parts.
        let kept = &parts[..max_units];
        let last_unit_index = kept[max_units - 1].1;
        let last_unit_secs = DURATION_UNITS[last_unit_index].0;

        // Calculate total seconds represented by truncated parts.
        let truncated_seconds: u64 = parts[max_units..]
            .iter()
            .map(|&(count, idx)| count * DURATION_UNITS[idx].0)
            .sum();

        let mut parts_vec: Vec<(u64, usize)> = kept.to_vec();
        // Round: if truncated >= half of last unit, round up.
        if truncated_seconds * 2 >= last_unit_secs {
            parts_vec.last_mut().unwrap().0 += 1;
        }
        parts = parts_vec;
    }

    // Format.
    let formatted: Vec<String> = parts
        .iter()
        .map(|&(count, idx)| {
            let (_, name, abbr) = DURATION_UNITS[idx];
            if compact {
                format!("{}{}", count, abbr)
            } else {
                let plural = if count == 1 { "" } else { "s" };
                format!("{} {}{}", count, name, plural)
            }
        })
        .collect();

    if compact {
        formatted.join(" ")
    } else {
        formatted.join(", ")
    }
}

// ---------------------------------------------------------------------------
// parse_duration
// ---------------------------------------------------------------------------

/// Parse a human-readable duration string into seconds.
///
/// Supports compact ("2h30m"), verbose ("2 hours 30 minutes"), colon ("2:30"),
/// and decimal ("2.5 hours") formats. Case insensitive.
pub fn parse_duration(input: &str) -> Result<u64, String> {
    let input = input.trim();
    if input.is_empty() {
        return Err("empty input".to_string());
    }

    // Check for negatives.
    if input.starts_with('-') {
        return Err("negative durations not supported".to_string());
    }

    // Try colon format first: H:MM or H:MM:SS
    if input.contains(':') && !input.chars().any(|c| c.is_alphabetic()) {
        return parse_colon_format(input);
    }

    let lower = input.to_lowercase();
    // Remove "and", commas for normalization.
    let normalized = lower.replace(',', " ").replace(" and ", " ");

    // Tokenize: extract (number, unit) pairs.
    let mut total: f64 = 0.0;
    let mut found_any = false;

    let mut chars = normalized.chars().peekable();
    while chars.peek().is_some() {
        // Skip whitespace.
        while chars.peek().map_or(false, |c| c.is_whitespace()) {
            chars.next();
        }
        if chars.peek().is_none() {
            break;
        }

        // Read number (possibly decimal).
        let mut num_str = String::new();
        while chars
            .peek()
            .map_or(false, |c| c.is_ascii_digit() || *c == '.')
        {
            num_str.push(chars.next().unwrap());
        }

        if num_str.is_empty() {
            // No number found — unexpected character.
            let rest: String = chars.collect();
            return Err(format!("unexpected input: {}", rest.trim()));
        }

        let num: f64 = num_str
            .parse()
            .map_err(|_| format!("invalid number: {}", num_str))?;

        // Skip whitespace between number and unit.
        while chars.peek().map_or(false, |c| c.is_whitespace()) {
            chars.next();
        }

        // Read unit.
        let mut unit_str = String::new();
        while chars.peek().map_or(false, |c| c.is_alphabetic()) {
            unit_str.push(chars.next().unwrap());
        }

        if unit_str.is_empty() {
            // Bare number with no unit.
            return Err("bare number without unit".to_string());
        }

        let unit_secs = unit_to_seconds(&unit_str)?;
        total += num * unit_secs as f64;
        found_any = true;
    }

    if !found_any {
        return Err("no duration found".to_string());
    }

    Ok(total.round() as u64)
}

fn parse_colon_format(input: &str) -> Result<u64, String> {
    let parts: Vec<&str> = input.split(':').collect();
    match parts.len() {
        2 => {
            // H:MM
            let h: u64 = parts[0]
                .trim()
                .parse()
                .map_err(|_| "invalid hours".to_string())?;
            let m: u64 = parts[1]
                .trim()
                .parse()
                .map_err(|_| "invalid minutes".to_string())?;
            Ok(h * 3600 + m * 60)
        }
        3 => {
            // H:MM:SS
            let h: u64 = parts[0]
                .trim()
                .parse()
                .map_err(|_| "invalid hours".to_string())?;
            let m: u64 = parts[1]
                .trim()
                .parse()
                .map_err(|_| "invalid minutes".to_string())?;
            let s: u64 = parts[2]
                .trim()
                .parse()
                .map_err(|_| "invalid seconds".to_string())?;
            Ok(h * 3600 + m * 60 + s)
        }
        _ => Err("invalid colon format".to_string()),
    }
}

fn unit_to_seconds(unit: &str) -> Result<u64, String> {
    match unit {
        "y" | "yr" | "yrs" | "year" | "years" => Ok(365 * 86400),
        "mo" | "month" | "months" => Ok(30 * 86400),
        "w" | "wk" | "wks" | "week" | "weeks" => Ok(604800),
        "d" | "day" | "days" => Ok(86400),
        "h" | "hr" | "hrs" | "hour" | "hours" => Ok(3600),
        "m" | "min" | "mins" | "minute" | "minutes" => Ok(60),
        "s" | "sec" | "secs" | "second" | "seconds" => Ok(1),
        _ => Err(format!("unknown unit: {}", unit)),
    }
}

// ---------------------------------------------------------------------------
// human_date
// ---------------------------------------------------------------------------

/// Returns a contextual date string like "Today", "Yesterday", "Last Friday",
/// or "January 15, 2024".
///
/// Both `timestamp` and `reference` are unix timestamps in seconds (UTC).
pub fn human_date(timestamp: i64, reference: i64) -> String {
    let ts_date = utc_date_from_timestamp(timestamp);
    let ref_date = utc_date_from_timestamp(reference);

    let ts_day = day_number(timestamp);
    let ref_day = day_number(reference);
    let day_diff = ts_day - ref_day; // positive = future, negative = past

    match day_diff {
        0 => "Today".to_string(),
        -1 => "Yesterday".to_string(),
        1 => "Tomorrow".to_string(),
        -6..=-2 => {
            format!("Last {}", DAY_NAMES[ts_date.weekday as usize])
        }
        2..=6 => {
            format!("This {}", DAY_NAMES[ts_date.weekday as usize])
        }
        _ => {
            let month = MONTH_NAMES[(ts_date.month - 1) as usize];
            if ts_date.year == ref_date.year {
                format!("{} {}", month, ts_date.day)
            } else {
                format!("{} {}, {}", month, ts_date.day, ts_date.year)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// date_range
// ---------------------------------------------------------------------------

/// Returns a smart date range string with en-dash formatting.
///
/// Auto-swaps if start > end.
pub fn date_range(start: i64, end: i64) -> String {
    let (start, end) = if start > end {
        (end, start)
    } else {
        (start, end)
    };

    let s = utc_date_from_timestamp(start);
    let e = utc_date_from_timestamp(end);

    let s_month = MONTH_NAMES[(s.month - 1) as usize];
    let e_month = MONTH_NAMES[(e.month - 1) as usize];

    if s.year == e.year && s.month == e.month && s.day == e.day {
        // Same day.
        format!("{} {}, {}", s_month, s.day, s.year)
    } else if s.year == e.year && s.month == e.month {
        // Same month.
        format!("{} {}\u{2013}{}, {}", s_month, s.day, e.day, s.year)
    } else if s.year == e.year {
        // Same year, different month.
        format!(
            "{} {} \u{2013} {} {}, {}",
            s_month, s.day, e_month, e.day, s.year
        )
    } else {
        // Different years.
        format!(
            "{} {}, {} \u{2013} {} {}, {}",
            s_month, s.day, s.year, e_month, e.day, e.year
        )
    }
}

// ===========================================================================
// Tests
// ===========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // time_ago tests
    // -----------------------------------------------------------------------
    const TIME_AGO_REF: i64 = 1704067200;

    #[test]
    fn test_time_ago_past() {
        let cases: Vec<(i64, &str)> = vec![
            (1704067200, "just now"),
            (1704067170, "just now"),
            (1704067156, "just now"),
            (1704067155, "1 minute ago"),
            (1704067111, "1 minute ago"),
            (1704067110, "2 minutes ago"),
            (1704065400, "30 minutes ago"),
            (1704064560, "44 minutes ago"),
            (1704064500, "1 hour ago"),
            (1704061860, "1 hour ago"),
            (1704061800, "2 hours ago"),
            (1704049200, "5 hours ago"),
            (1703991600, "21 hours ago"),
            (1703988000, "1 day ago"),
            (1703941200, "1 day ago"),
            (1703937600, "2 days ago"),
            (1703462400, "7 days ago"),
            (1701907200, "25 days ago"),
            (1701820800, "1 month ago"),
            (1700179200, "1 month ago"),
            (1700092800, "2 months ago"),
            (1688169600, "6 months ago"),
            (1676505600, "11 months ago"),
            (1676419200, "1 year ago"),
            (1656806400, "1 year ago"),
            (1656720000, "2 years ago"),
            (1546300800, "5 years ago"),
        ];
        for (ts, expected) in cases {
            let result = time_ago(ts, TIME_AGO_REF);
            assert_eq!(
                result, expected,
                "time_ago({}, {}) = {:?}, expected {:?}",
                ts, TIME_AGO_REF, result, expected
            );
        }
    }

    #[test]
    fn test_time_ago_future() {
        let cases: Vec<(i64, &str)> = vec![
            (1704067230, "just now"),
            (1704067260, "in 1 minute"),
            (1704067500, "in 5 minutes"),
            (1704070200, "in 1 hour"),
            (1704078000, "in 3 hours"),
            (1704150000, "in 1 day"),
            (1704240000, "in 2 days"),
            (1706745600, "in 1 month"),
            (1735689600, "in 1 year"),
        ];
        for (ts, expected) in cases {
            let result = time_ago(ts, TIME_AGO_REF);
            assert_eq!(
                result, expected,
                "time_ago({}, {}) = {:?}, expected {:?}",
                ts, TIME_AGO_REF, result, expected
            );
        }
    }

    // -----------------------------------------------------------------------
    // duration tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_duration_normal() {
        let cases: Vec<(u64, &str)> = vec![
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
        ];
        for (secs, expected) in cases {
            let result = duration(secs);
            assert_eq!(
                result, expected,
                "duration({}) = {:?}, expected {:?}",
                secs, result, expected
            );
        }
    }

    #[test]
    fn test_duration_compact() {
        let cases: Vec<(u64, &str)> = vec![
            (0, "0s"),
            (45, "45s"),
            (3661, "1h 1m"),
            (9000, "2h 30m"),
            (93600, "1d 2h"),
        ];
        for (secs, expected) in cases {
            let result = duration_with_options(secs, true, 2);
            assert_eq!(
                result, expected,
                "duration_compact({}) = {:?}, expected {:?}",
                secs, result, expected
            );
        }
    }

    #[test]
    fn test_duration_max_units() {
        assert_eq!(duration_with_options(3661, false, 1), "1 hour");
        assert_eq!(duration_with_options(93600, false, 1), "1 day");
        assert_eq!(
            duration_with_options(93661, false, 3),
            "1 day, 2 hours, 1 minute"
        );
    }

    #[test]
    fn test_duration_compact_max_units() {
        assert_eq!(duration_with_options(9000, true, 1), "3h");
    }

    // -----------------------------------------------------------------------
    // parse_duration tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_parse_duration_compact() {
        let cases: Vec<(&str, u64)> = vec![
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
        ];
        for (input, expected) in cases {
            let result = parse_duration(input).unwrap();
            assert_eq!(
                result, expected,
                "parse_duration({:?}) = {}, expected {}",
                input, result, expected
            );
        }
    }

    #[test]
    fn test_parse_duration_verbose() {
        let cases: Vec<(&str, u64)> = vec![
            ("2 hours 30 minutes", 9000),
            ("2 hours and 30 minutes", 9000),
            ("2 hours, and 30 minutes", 9000),
            ("2.5 hours", 9000),
            ("90 minutes", 5400),
            ("2 days", 172800),
            ("1 week", 604800),
            ("1 day, 2 hours, and 30 minutes", 95400),
            ("45 seconds", 45),
        ];
        for (input, expected) in cases {
            let result = parse_duration(input).unwrap();
            assert_eq!(
                result, expected,
                "parse_duration({:?}) = {}, expected {}",
                input, result, expected
            );
        }
    }

    #[test]
    fn test_parse_duration_colon() {
        assert_eq!(parse_duration("2:30").unwrap(), 9000);
        assert_eq!(parse_duration("1:30:00").unwrap(), 5400);
        assert_eq!(parse_duration("0:05:30").unwrap(), 330);
    }

    #[test]
    fn test_parse_duration_case_insensitive() {
        assert_eq!(parse_duration("2H 30M").unwrap(), 9000);
    }

    #[test]
    fn test_parse_duration_whitespace() {
        assert_eq!(parse_duration("  2 hours   30 minutes  ").unwrap(), 9000);
    }

    #[test]
    fn test_parse_duration_errors() {
        assert!(parse_duration("").is_err());
        assert!(parse_duration("hello world").is_err());
        assert!(parse_duration("-5 hours").is_err());
        assert!(parse_duration("42").is_err());
        assert!(parse_duration("5 foos").is_err());
    }

    // -----------------------------------------------------------------------
    // human_date tests
    // -----------------------------------------------------------------------
    const HUMAN_DATE_REF: i64 = 1705276800; // 2024-01-15 Monday

    #[test]
    fn test_human_date_today_yesterday_tomorrow() {
        assert_eq!(human_date(1705276800, HUMAN_DATE_REF), "Today");
        assert_eq!(human_date(1705320000, HUMAN_DATE_REF), "Today");
        assert_eq!(human_date(1705190400, HUMAN_DATE_REF), "Yesterday");
        assert_eq!(human_date(1705363200, HUMAN_DATE_REF), "Tomorrow");
    }

    #[test]
    fn test_human_date_last_weekday() {
        assert_eq!(human_date(1705104000, HUMAN_DATE_REF), "Last Saturday");
        assert_eq!(human_date(1705017600, HUMAN_DATE_REF), "Last Friday");
        assert_eq!(human_date(1704931200, HUMAN_DATE_REF), "Last Thursday");
        assert_eq!(human_date(1704844800, HUMAN_DATE_REF), "Last Wednesday");
        assert_eq!(human_date(1704758400, HUMAN_DATE_REF), "Last Tuesday");
    }

    #[test]
    fn test_human_date_beyond_last_week() {
        assert_eq!(human_date(1704672000, HUMAN_DATE_REF), "January 8");
    }

    #[test]
    fn test_human_date_this_weekday() {
        assert_eq!(human_date(1705449600, HUMAN_DATE_REF), "This Wednesday");
        assert_eq!(human_date(1705536000, HUMAN_DATE_REF), "This Thursday");
        assert_eq!(human_date(1705795200, HUMAN_DATE_REF), "This Sunday");
    }

    #[test]
    fn test_human_date_beyond_this_week() {
        assert_eq!(human_date(1705881600, HUMAN_DATE_REF), "January 22");
    }

    #[test]
    fn test_human_date_same_year() {
        assert_eq!(human_date(1709251200, HUMAN_DATE_REF), "March 1");
        assert_eq!(human_date(1735603200, HUMAN_DATE_REF), "December 31");
    }

    #[test]
    fn test_human_date_different_year() {
        assert_eq!(
            human_date(1672531200, HUMAN_DATE_REF),
            "January 1, 2023"
        );
        assert_eq!(
            human_date(1736121600, HUMAN_DATE_REF),
            "January 6, 2025"
        );
    }

    // -----------------------------------------------------------------------
    // date_range tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_date_range_same_day() {
        assert_eq!(
            date_range(1705276800, 1705276800),
            "January 15, 2024"
        );
        assert_eq!(
            date_range(1705276800, 1705320000),
            "January 15, 2024"
        );
    }

    #[test]
    fn test_date_range_same_month() {
        assert_eq!(
            date_range(1705276800, 1705363200),
            "January 15\u{2013}16, 2024"
        );
        assert_eq!(
            date_range(1705276800, 1705881600),
            "January 15\u{2013}22, 2024"
        );
    }

    #[test]
    fn test_date_range_same_year_diff_month() {
        assert_eq!(
            date_range(1705276800, 1707955200),
            "January 15 \u{2013} February 15, 2024"
        );
        assert_eq!(
            date_range(1704067200, 1735603200),
            "January 1 \u{2013} December 31, 2024"
        );
    }

    #[test]
    fn test_date_range_different_years() {
        assert_eq!(
            date_range(1703721600, 1705276800),
            "December 28, 2023 \u{2013} January 15, 2024"
        );
        assert_eq!(
            date_range(1672531200, 1735689600),
            "January 1, 2023 \u{2013} January 1, 2025"
        );
    }

    #[test]
    fn test_date_range_auto_swap() {
        assert_eq!(
            date_range(1705881600, 1705276800),
            "January 15\u{2013}22, 2024"
        );
    }
}
