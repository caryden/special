# date-range: Python translation hints

- **Signature:** `def date_range(start: int, end: int) -> str`.
- **Auto-swap:** `if start > end: start, end = end, start`.
- **UTC dates:** Use `datetime.fromtimestamp(ts, tz=timezone.utc)`. Extract `.year`, `.month` (1-based), `.day`.
- **En-dash:** Use the Unicode character `"\u2013"` (not a hyphen). Same-month: no spaces around it. Cross-month/cross-year: spaces on both sides.
- **Month names:** List of 12 strings indexed by month (1-based, so index 0 unused or offset by 1). Python `datetime.month` is 1-based unlike JS 0-based.
- **String formatting:** f-strings: `f"{month} {start_day}\u2013{end_day}, {year}"` for same-month.
- **Imports:** `datetime`, `timezone` from `datetime`.
