# parse-duration: Python translation hints

- **Signature:** `def parse_duration(input: str) -> int` — returns integer seconds.
- **Error handling:** Raise `ValueError` for all error cases (empty, unrecognized, negative, bare number, unknown unit).
- **Regex:** Use `re` module. Colon pattern: `r'^(\d+):(\d{1,2})(?::(\d{1,2}))?$'`. Unit pattern: `r'(\d+(?:\.\d+)?)\s*([a-z]+)'` with `re.findall()`.
- **Unit map:** Plain `dict` mapping lowercase alias strings to integer seconds.
- **String normalization:** `.strip().lower()`, replace commas and "and" with spaces, collapse whitespace with `re.sub(r'\s+', ' ', s)`.
- **Rounding:** `round(total)` to return integer. Same banker's rounding caveat as duration — use `int(total + 0.5)` if exactness matters.
- **Import:** `re` only.
