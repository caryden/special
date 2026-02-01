# duration: Rust translation hints

- **Signature:** `pub fn duration(seconds: i64, compact: bool, max_units: usize) -> Result<String, String>` — or use a `DurationOptions` struct. Return `Result` to handle negative input.
- **Error handling:** Return `Err("Seconds must not be negative".into())` for negative input. Alternatively, panic or use a custom error type.
- **Units table:** Array of `(&str, &str, i64)` tuples: `[("year", "y", 31536000), ...]`.
- **Floor vs round:** `remaining / size` for integer floor, `(remaining as f64 / size as f64).round() as i64` for last-unit rounding.
- **Pluralization:** Match on count: `if count == 1 { name } else { format!("{}s", name) }`.
- **String building:** Collect into `Vec<String>`, then `parts.join(", ")` or `parts.join(" ")`.
- **No external crates needed.**
