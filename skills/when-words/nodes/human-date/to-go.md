# human-date: Go translation hints

- **Signature:** `func HumanDate(timestamp, reference int64) string`.
- **UTC dates:** Use `time.Unix(ts, 0).UTC()`. Extract `.Year()`, `.Month()` (returns `time.Month`, 1-based), `.Day()`, `.Weekday()` (returns `time.Weekday`, Sunday=0).
- **Day difference:** Truncate to midnight: `time.Date(y, m, d, 0, 0, 0, 0, time.UTC)` for both, then `int(tsMidnight.Sub(refMidnight).Hours() / 24)`. Or compute directly from year/month/day.
- **Day names:** `time.Weekday.String()` gives "Sunday", "Monday", etc. -- matches the spec directly.
- **Month names:** `time.Month.String()` gives "January", "February", etc. -- matches the spec directly.
- **String formatting:** `fmt.Sprintf("Last %s", weekday.String())`, `fmt.Sprintf("%s %d", month.String(), day)`.
- **Imports:** `fmt`, `time`.
