# parse-duration: Rust translation hints

- **Signature:** `pub fn parse_duration(input: &str) -> Result<i64, String>` — return `Result` for all error cases.
- **Regex:** Use the `regex` crate. Colon: `r"^(\d+):(\d{1,2})(?::(\d{1,2}))?$"`. Units: `r"(\d+(?:\.\d+)?)\s*([a-z]+)"`. Compile with `Regex::new()` (consider `lazy_static` or `once_cell` for reuse).
- **Unit map:** Use a `HashMap<&str, i64>` or a match statement for the ~30 aliases.
- **String normalization:** `.trim().to_lowercase()`, `.replace(',', " ")`, use regex to strip `\band\b`, collapse whitespace.
- **Parsing numbers:** `str::parse::<f64>()` for decimal values, `str::parse::<i64>()` for colon components.
- **Rounding:** `total.round() as i64`.
- **External crate:** `regex` (only dependency needed).
