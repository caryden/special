# time-ago: Python translation hints

- **Signature:** `def time_ago(timestamp: int, reference: int) -> str` — use snake_case per PEP 8.
- **abs/round:** Python's built-in `abs()` and `round()` work identically to JS `Math.abs()` and `Math.round()`. Note: Python 3 uses banker's rounding by default for `round()`, but since all divisions here produce non-`.5` results in practice, this is safe. If concerned, use `int(value + 0.5)` for half-up rounding.
- **Threshold table:** Use a list of tuples `[(max_seconds, singular, plural, divisor), ...]`. Use `float('inf')` for the final entry's max.
- **String formatting:** Use f-strings: `f"{n} {label} ago"` or `f"in {n} {label}"`.
- **No imports needed.** Pure arithmetic and string formatting only.
- **Return type:** Plain `str`. No `Optional` — function always returns a value.
