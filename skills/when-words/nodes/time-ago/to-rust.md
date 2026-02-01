# time-ago: Rust translation hints

- **Signature:** `pub fn time_ago(timestamp: i64, reference: i64) -> String` — use `i64` for Unix timestamps.
- **abs:** Use `(reference - timestamp).abs()` on `i64` — returns `i64`. Cast to `f64` for division/rounding.
- **Rounding:** `(seconds as f64 / divisor as f64).round() as i64` for half-up rounding.
- **Threshold table:** Use an array of tuples or a `match`/`if-else` chain. An array of `(i64, &str, &str, i64)` with a linear scan works well.
- **Infinity sentinel:** Use `i64::MAX` for the final threshold's max value.
- **String formatting:** Use `format!("{} {} ago", n, label)` or `format!("in {} {}", n, label)`.
- **No external crates needed.** Pure arithmetic and string formatting.
