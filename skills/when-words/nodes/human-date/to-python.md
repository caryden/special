# human-date: Python translation hints

- **Signature:** `def human_date(timestamp: int, reference: int) -> str`.
- **UTC dates:** Use `datetime.utcfromtimestamp()` (deprecated but simple) or `datetime.fromtimestamp(ts, tz=timezone.utc)`. Extract `.year`, `.month`, `.day`, `.weekday()` (Monday=0 in Python vs Sunday=0 in JS — adjust accordingly).
- **Day difference:** Compute using `date` objects: `(ts_date.date() - ref_date.date()).days` gives an integer day diff directly.
- **Day names:** List indexed by weekday. Python weekday: Monday=0..Sunday=6. JS `getUTCDay()`: Sunday=0..Saturday=6. Map accordingly.
- **Month names:** List indexed 1--12 (or 0--11 matching the month value). `datetime.month` is 1-based, unlike JS which is 0-based.
- **String formatting:** f-strings: `f"Last {day_names[dow]}"`, `f"{month_names[month]} {day}"`.
- **Imports:** `datetime` (from `datetime` module).
