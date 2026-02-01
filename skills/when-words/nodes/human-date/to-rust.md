# human-date: Rust translation hints

- **Signature:** `pub fn human_date(timestamp: i64, reference: i64) -> String`.
- **UTC dates:** Use the `chrono` crate: `Utc.timestamp_opt(ts, 0).unwrap()`. Extract `.year()`, `.month()` (1-based), `.day()`, `.weekday()` (returns `Weekday` enum).
- **Day difference:** Compute using `NaiveDate`: `ts_date.num_days_from_ce() - ref_date.num_days_from_ce()` or `(ts_date - ref_date).num_days()`.
- **Day names:** Match on `Weekday` enum: `Weekday::Mon => "Monday"`, etc. Chrono's `.weekday()` returns Monday-first, but the format output is the same.
- **Month names:** Array indexed by month number (1-based). Or match on `.month()`.
- **String formatting:** `format!("Last {}", day_name)`, `format!("{} {}", month_name, day)`.
- **External crate:** `chrono` (the standard choice for date/time in Rust).
