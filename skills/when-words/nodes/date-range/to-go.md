# date-range: Go translation hints

- **Signature:** `func DateRange(start, end int64) string`.
- **Auto-swap:** `if start > end { start, end = end, start }`.
- **UTC dates:** Use `time.Unix(ts, 0).UTC()`. Extract `.Year()`, `.Month()` (returns `time.Month`), `.Day()`.
- **En-dash:** Use the Unicode character `"\u2013"`. Same-month: no spaces. Cross-month/cross-year: spaces both sides.
- **Month names:** `time.Month.String()` returns "January", etc. -- use directly.
- **String formatting:** `fmt.Sprintf("%s %d\u2013%d, %d", month, startDay, endDay, year)` for same-month.
- **Imports:** `fmt`, `time`.
