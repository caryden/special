# time-ago: Go translation hints

- **Signature:** `func TimeAgo(timestamp, reference int64) string` — exported with PascalCase.
- **abs:** Go has no built-in integer abs. Compute manually: `if diff < 0 { diff = -diff }`.
- **Rounding:** Use `math.Round(float64(seconds) / float64(divisor))` and cast back to `int64`.
- **Threshold table:** Use a slice of structs: `type threshold struct { max int64; singular, plural string; divisor int64 }`. Use `math.MaxInt64` for the final entry.
- **String formatting:** Use `fmt.Sprintf("%d %s ago", n, label)` or `fmt.Sprintf("in %d %s", n, label)`.
- **Imports:** `fmt` and `math` only.
- **No error return.** Function always succeeds; return `string` only, no `error`.
