# date-range: Rust translation hints

- **Signature:** `pub fn date_range(start: i64, end: i64) -> String`. Use mutable locals if swapping.
- **Auto-swap:** `let (start, end) = if start > end { (end, start) } else { (start, end) };`.
- **UTC dates:** Use `chrono`: `Utc.timestamp_opt(ts, 0).unwrap()`. Extract `.year()`, `.month()` (1-based), `.day()`.
- **En-dash:** Use `'\u{2013}'` or the literal character. Same-month: `format!("{} {}\u{2013}{}, {}", month, s_day, e_day, year)`. Cross-month: `format!("{} {} \u{2013} {} {}, {}", ...)`.
- **Month names:** Array `["January", "February", ...]` indexed by `month - 1` (chrono months are 1-based).
- **External crate:** `chrono`.
