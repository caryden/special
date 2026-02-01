/// Options for the `duration` function.
pub struct DurationOptions {
    pub compact: bool,
    pub max_units: usize,
}

impl Default for DurationOptions {
    fn default() -> Self {
        DurationOptions {
            compact: false,
            max_units: 2,
        }
    }
}

/// Converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".
/// Both `timestamp` and `reference` are Unix epoch seconds.
pub fn time_ago(timestamp: i64, reference: i64) -> String {
    let diff = reference - timestamp;
    let seconds = diff.unsigned_abs();
    let is_future = diff < 0;

    let (value, unit) = if seconds < 45 {
        return "just now".to_string();
    } else if seconds < 90 {
        (1, "minute")
    } else if seconds <= 2640 {
        (((seconds as f64) / 60.0).round() as u64, "minute")
    } else if seconds <= 5340 {
        (1, "hour")
    } else if seconds <= 75600 {
        (((seconds as f64) / 3600.0).round() as u64, "hour")
    } else if seconds <= 126000 {
        (1, "day")
    } else if seconds <= 2160000 {
        (((seconds as f64) / 86400.0).round() as u64, "day")
    } else if seconds <= 3888000 {
        (1, "month")
    } else if seconds <= 27561600 {
        (((seconds as f64) / 2592000.0).round() as u64, "month")
    } else if seconds <= 47260800 {
        (1, "year")
    } else {
        (((seconds as f64) / 31536000.0).round() as u64, "year")
    };

    let plural = if value == 1 {
        unit.to_string()
    } else {
        format!("{}s", unit)
    };

    if is_future {
        format!("in {} {}", value, plural)
    } else {
        format!("{} {} ago", value, plural)
    }
}

/// Formats a number of seconds as a human-readable duration string.
/// Returns Err for negative input.
pub fn duration(seconds: i64, options: Option<DurationOptions>) -> Result<String, String> {
    if seconds < 0 {
        return Err("seconds must be non-negative".to_string());
    }
    let seconds = seconds as u64;
    let opts = options.unwrap_or_default();

    const UNITS: &[(u64, &str, &str, &str)] = &[
        (31536000, "year", "years", "y"),
        (2592000, "month", "months", "mo"),
        (86400, "day", "days", "d"),
        (3600, "hour", "hours", "h"),
        (60, "minute", "minutes", "m"),
        (1, "second", "seconds", "s"),
    ];

    if seconds == 0 {
        return if opts.compact {
            Ok("0s".to_string())
        } else {
            Ok("0 seconds".to_string())
        };
    }

    // Decompose into units
    let mut parts: Vec<(u64, usize)> = Vec::new(); // (count, unit_index)
    let mut remaining = seconds;
    for (i, &(divisor, _, _, _)) in UNITS.iter().enumerate() {
        if remaining >= divisor {
            let count = remaining / divisor;
            remaining %= divisor;
            parts.push((count, i));
        }
    }

    // Apply max_units with rounding on the last displayed unit
    if parts.len() > opts.max_units {
        // We need to round the last kept unit based on what's left over
        let mut kept: Vec<(u64, usize)> = parts[..opts.max_units].to_vec();

        // Calculate the remainder seconds after the kept units
        let last_idx = kept.len() - 1;
        let last_unit_index = kept[last_idx].1;
        let last_unit_divisor = UNITS[last_unit_index].0;

        // Sum up the seconds represented by the truncated parts
        let truncated_seconds: u64 = parts[opts.max_units..]
            .iter()
            .map(|&(count, idx)| count * UNITS[idx].0)
            .sum();

        // Round: if truncated >= half of last unit's divisor, round up
        if truncated_seconds * 2 >= last_unit_divisor {
            kept[last_idx].0 += 1;
        }

        parts = kept;
    }

    // Remove trailing zero parts
    parts.retain(|&(count, _)| count > 0);

    if parts.is_empty() {
        return if opts.compact {
            Ok("0s".to_string())
        } else {
            Ok("0 seconds".to_string())
        };
    }

    let separator = if opts.compact { " " } else { ", " };

    let formatted: Vec<String> = parts
        .iter()
        .map(|&(count, idx)| {
            let (_, singular, plural, compact_unit) = UNITS[idx];
            if opts.compact {
                format!("{}{}", count, compact_unit)
            } else if count == 1 {
                format!("{} {}", count, singular)
            } else {
                format!("{} {}", count, plural)
            }
        })
        .collect();

    Ok(formatted.join(separator))
}

/// Parses a human-written duration string into total seconds.
pub fn parse_duration(input: &str) -> Result<u64, String> {
    let input = input.trim();
    if input.is_empty() {
        return Err("empty input".to_string());
    }

    // Check for negative
    if input.starts_with('-') {
        return Err("negative duration".to_string());
    }

    // Try colon format first: h:mm or h:mm:ss
    if input.contains(':') && !input.contains(|c: char| c.is_alphabetic()) {
        return parse_colon_format(input);
    }

    // Remove "and", commas for easier parsing
    let cleaned = input.replace(',', " ").replace(" and ", " ");
    let cleaned = cleaned.trim();

    // Tokenize: split into number-unit pairs
    let mut total: f64 = 0.0;
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

        // Read number (integer or decimal)
        let mut num_str = String::new();
        while chars
            .peek()
            .map_or(false, |c| c.is_ascii_digit() || *c == '.')
        {
            num_str.push(chars.next().unwrap());
        }

        if num_str.is_empty() {
            return Err(format!("unexpected input: {}", input));
        }

        let num: f64 = num_str
            .parse()
            .map_err(|_| format!("invalid number: {}", num_str))?;

        // Skip whitespace between number and unit
        while chars.peek().map_or(false, |c| c.is_whitespace()) {
            chars.next();
        }

        // Read unit
        let mut unit_str = String::new();
        while chars.peek().map_or(false, |c| c.is_alphabetic()) {
            unit_str.push(chars.next().unwrap());
        }

        if unit_str.is_empty() {
            return Err(format!("bare number without unit: {}", input));
        }

        let unit_seconds = unit_to_seconds(&unit_str)?;
        total += num * (unit_seconds as f64);
        found_any = true;
    }

    if !found_any {
        return Err(format!("no duration found in: {}", input));
    }

    Ok(total.round() as u64)
}

fn parse_colon_format(input: &str) -> Result<u64, String> {
    let parts: Vec<&str> = input.split(':').collect();
    match parts.len() {
        2 => {
            let hours: u64 = parts[0]
                .parse()
                .map_err(|_| "invalid colon format".to_string())?;
            let minutes: u64 = parts[1]
                .parse()
                .map_err(|_| "invalid colon format".to_string())?;
            Ok(hours * 3600 + minutes * 60)
        }
        3 => {
            let hours: u64 = parts[0]
                .parse()
                .map_err(|_| "invalid colon format".to_string())?;
            let minutes: u64 = parts[1]
                .parse()
                .map_err(|_| "invalid colon format".to_string())?;
            let seconds: u64 = parts[2]
                .parse()
                .map_err(|_| "invalid colon format".to_string())?;
            Ok(hours * 3600 + minutes * 60 + seconds)
        }
        _ => Err("invalid colon format".to_string()),
    }
}

fn unit_to_seconds(unit: &str) -> Result<u64, String> {
    match unit.to_lowercase().as_str() {
        "y" | "yr" | "yrs" | "year" | "years" => Ok(31536000),
        "mo" | "month" | "months" => Ok(2592000),
        "w" | "wk" | "wks" | "week" | "weeks" => Ok(604800),
        "d" | "day" | "days" => Ok(86400),
        "h" | "hr" | "hrs" | "hour" | "hours" => Ok(3600),
        "m" | "min" | "mins" | "minute" | "minutes" => Ok(60),
        "s" | "sec" | "secs" | "second" | "seconds" => Ok(1),
        _ => Err(format!("unrecognized unit: {}", unit)),
    }
}

// ---- Date helpers (no external crates) ----

struct UtcDate {
    year: i32,
    month: u32, // 1-12
    day: u32,   // 1-31
    weekday: u32, // 0=Sunday, 1=Monday, ..., 6=Saturday
}

const MONTH_NAMES: [&str; 12] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES: [&str; 7] = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/// Convert Unix epoch seconds to a UTC date.
fn unix_to_utc(timestamp: i64) -> UtcDate {
    // Days since epoch (1970-01-01 is Thursday = weekday 4)
    let days = timestamp.div_euclid(86400) as i64;
    let weekday = ((days % 7 + 4) % 7) as u32; // 0=Sun

    // Civil date from day count (algorithm from Howard Hinnant)
    let z = days + 719468; // shift epoch from 1970-01-01 to 0000-03-01
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32; // day of era [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    UtcDate {
        year: y as i32,
        month: m,
        day: d,
        weekday,
    }
}

/// Day number since epoch (UTC midnight truncation).
fn day_number(timestamp: i64) -> i64 {
    timestamp.div_euclid(86400)
}

/// Returns a contextual date string based on proximity.
pub fn human_date(timestamp: i64, reference: i64) -> String {
    let ts_day = day_number(timestamp);
    let ref_day = day_number(reference);
    let day_diff = ts_day - ref_day; // positive = future

    let ts_date = unix_to_utc(timestamp);
    let ref_date = unix_to_utc(reference);

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
            if ts_date.year == ref_date.year {
                format!(
                    "{} {}",
                    MONTH_NAMES[(ts_date.month - 1) as usize],
                    ts_date.day
                )
            } else {
                format!(
                    "{} {}, {}",
                    MONTH_NAMES[(ts_date.month - 1) as usize],
                    ts_date.day,
                    ts_date.year
                )
            }
        }
    }
}

/// Formats two timestamps as a smart date range.
pub fn date_range(start: i64, end: i64) -> String {
    let (start, end) = if start > end {
        (end, start)
    } else {
        (start, end)
    };

    let s = unix_to_utc(start);
    let e = unix_to_utc(end);

    let s_month = MONTH_NAMES[(s.month - 1) as usize];
    let e_month = MONTH_NAMES[(e.month - 1) as usize];

    if s.year == e.year && s.month == e.month && s.day == e.day {
        // Same day
        format!("{} {}, {}", s_month, s.day, s.year)
    } else if s.year == e.year && s.month == e.month {
        // Same month
        format!("{} {}\u{2013}{}, {}", s_month, s.day, e.day, s.year)
    } else if s.year == e.year {
        // Same year, different month
        format!(
            "{} {} \u{2013} {} {}, {}",
            s_month, s.day, e_month, e.day, s.year
        )
    } else {
        // Different years
        format!(
            "{} {}, {} \u{2013} {} {}, {}",
            s_month, s.day, s.year, e_month, e.day, e.year
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Reference: 1704067200 = 2024-01-01 00:00:00 UTC
    const REF_TIME_AGO: i64 = 1704067200;

    #[test]
    fn test_time_ago_past() {
        let cases: &[(i64, &str)] = &[
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
        for &(ts, expected) in cases {
            assert_eq!(
                time_ago(ts, REF_TIME_AGO),
                expected,
                "time_ago({}, {}) should be {:?}",
                ts,
                REF_TIME_AGO,
                expected
            );
        }
    }

    #[test]
    fn test_time_ago_future() {
        let cases: &[(i64, &str)] = &[
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
        for &(ts, expected) in cases {
            assert_eq!(
                time_ago(ts, REF_TIME_AGO),
                expected,
                "time_ago({}, {}) should be {:?}",
                ts,
                REF_TIME_AGO,
                expected
            );
        }
    }

    #[test]
    fn test_duration_default() {
        let cases: &[(i64, &str)] = &[
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
        for &(secs, expected) in cases {
            assert_eq!(
                duration(secs, None).unwrap(),
                expected,
                "duration({}, None) should be {:?}",
                secs,
                expected
            );
        }
    }

    #[test]
    fn test_duration_compact() {
        let cases: &[(i64, &str)] = &[
            (0, "0s"),
            (45, "45s"),
            (3661, "1h 1m"),
            (9000, "2h 30m"),
            (93600, "1d 2h"),
        ];
        for &(secs, expected) in cases {
            let opts = DurationOptions {
                compact: true,
                max_units: 2,
            };
            assert_eq!(
                duration(secs, Some(opts)).unwrap(),
                expected,
                "duration({}, compact) should be {:?}",
                secs,
                expected
            );
        }
    }

    #[test]
    fn test_duration_max_units() {
        assert_eq!(
            duration(3661, Some(DurationOptions { compact: false, max_units: 1 })).unwrap(),
            "1 hour"
        );
        assert_eq!(
            duration(93600, Some(DurationOptions { compact: false, max_units: 1 })).unwrap(),
            "1 day"
        );
        assert_eq!(
            duration(93661, Some(DurationOptions { compact: false, max_units: 3 })).unwrap(),
            "1 day, 2 hours, 1 minute"
        );
        // 9000s = 2h30m, max_units=1 -> round 30m to nearest hour -> 3h
        assert_eq!(
            duration(9000, Some(DurationOptions { compact: true, max_units: 1 })).unwrap(),
            "3h"
        );
    }

    #[test]
    fn test_duration_negative() {
        assert!(duration(-100, None).is_err());
    }

    #[test]
    fn test_parse_duration_compact() {
        assert_eq!(parse_duration("2h30m").unwrap(), 9000);
        assert_eq!(parse_duration("2h 30m").unwrap(), 9000);
        assert_eq!(parse_duration("2h, 30m").unwrap(), 9000);
        assert_eq!(parse_duration("1.5h").unwrap(), 5400);
        assert_eq!(parse_duration("90m").unwrap(), 5400);
        assert_eq!(parse_duration("90min").unwrap(), 5400);
        assert_eq!(parse_duration("45s").unwrap(), 45);
        assert_eq!(parse_duration("45sec").unwrap(), 45);
        assert_eq!(parse_duration("2d").unwrap(), 172800);
        assert_eq!(parse_duration("1w").unwrap(), 604800);
        assert_eq!(parse_duration("1d 2h 30m").unwrap(), 95400);
        assert_eq!(parse_duration("2hr").unwrap(), 7200);
        assert_eq!(parse_duration("2hrs").unwrap(), 7200);
        assert_eq!(parse_duration("30mins").unwrap(), 1800);
    }

    #[test]
    fn test_parse_duration_verbose() {
        assert_eq!(parse_duration("2 hours 30 minutes").unwrap(), 9000);
        assert_eq!(parse_duration("2 hours and 30 minutes").unwrap(), 9000);
        assert_eq!(parse_duration("2 hours, and 30 minutes").unwrap(), 9000);
        assert_eq!(parse_duration("2.5 hours").unwrap(), 9000);
        assert_eq!(parse_duration("90 minutes").unwrap(), 5400);
        assert_eq!(parse_duration("2 days").unwrap(), 172800);
        assert_eq!(parse_duration("1 week").unwrap(), 604800);
        assert_eq!(parse_duration("1 day, 2 hours, and 30 minutes").unwrap(), 95400);
        assert_eq!(parse_duration("45 seconds").unwrap(), 45);
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

    // Reference: 1705276800 = 2024-01-15 Monday 00:00 UTC
    const REF_HUMAN_DATE: i64 = 1705276800;

    #[test]
    fn test_human_date() {
        let cases: &[(i64, &str)] = &[
            (1705276800, "Today"),
            (1705320000, "Today"),
            (1705190400, "Yesterday"),
            (1705363200, "Tomorrow"),
            (1705104000, "Last Saturday"),
            (1705017600, "Last Friday"),
            (1704931200, "Last Thursday"),
            (1704844800, "Last Wednesday"),
            (1704758400, "Last Tuesday"),
            (1704672000, "January 8"),
            (1705449600, "This Wednesday"),
            (1705536000, "This Thursday"),
            (1705795200, "This Sunday"),
            (1705881600, "January 22"),
            (1709251200, "March 1"),
            (1735603200, "December 31"),
            (1672531200, "January 1, 2023"),
            (1736121600, "January 6, 2025"),
        ];
        for &(ts, expected) in cases {
            assert_eq!(
                human_date(ts, REF_HUMAN_DATE),
                expected,
                "human_date({}, {}) should be {:?}",
                ts,
                REF_HUMAN_DATE,
                expected
            );
        }
    }

    #[test]
    fn test_date_range() {
        let cases: &[(i64, i64, &str)] = &[
            (1705276800, 1705276800, "January 15, 2024"),
            (1705276800, 1705320000, "January 15, 2024"),
            (1705276800, 1705363200, "January 15\u{2013}16, 2024"),
            (1705276800, 1705881600, "January 15\u{2013}22, 2024"),
            (1705276800, 1707955200, "January 15 \u{2013} February 15, 2024"),
            (1703721600, 1705276800, "December 28, 2023 \u{2013} January 15, 2024"),
            (1704067200, 1735603200, "January 1 \u{2013} December 31, 2024"),
            (1705881600, 1705276800, "January 15\u{2013}22, 2024"),
            (1672531200, 1735689600, "January 1, 2023 \u{2013} January 1, 2025"),
        ];
        for &(start, end, expected) in cases {
            assert_eq!(
                date_range(start, end),
                expected,
                "date_range({}, {}) should be {:?}",
                start,
                end,
                expected
            );
        }
    }
}
