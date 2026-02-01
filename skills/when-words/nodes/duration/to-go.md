# duration: Go translation hints

- **Signature:** `func Duration(seconds int64, opts ...DurationOption) (string, error)` — use functional options or a `DurationOptions` struct. Return `error` for negative input.
- **Error handling:** Return `"", fmt.Errorf("seconds must not be negative")` for negative input.
- **Units table:** Slice of structs: `type unit struct { name, abbr string; size int64 }`.
- **Floor vs round:** Integer division `remaining / size` floors. For rounding: `int64(math.Round(float64(remaining) / float64(size)))`.
- **Pluralization:** `if count == 1 { name } else { name + "s" }`.
- **String building:** Collect into `[]string`, then `strings.Join(parts, ", ")` or `strings.Join(parts, " ")`.
- **Imports:** `fmt`, `math`, `strings`.
