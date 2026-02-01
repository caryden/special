# duration: Python translation hints

- **Signature:** `def duration(seconds: int, *, compact: bool = False, max_units: int = 2) -> str` — use keyword-only arguments for options.
- **Error handling:** Raise `ValueError` on negative input (not a custom exception).
- **Units table:** List of tuples `[(name, abbr, size), ...]` matching the spec order.
- **Floor vs round:** Use `remaining // size` for floor, `round(remaining / size)` for the last-unit rounding. Watch for Python's banker's rounding — use `int(remaining / size + 0.5)` if needed.
- **Pluralization:** `f"1 {name}"` vs `f"{count} {name}s"` — just append "s" for plural.
- **Joining:** `", ".join(parts)` for normal mode, `" ".join(parts)` for compact.
- **Zero case:** Return `"0s"` or `"0 seconds"` before entering the loop.
