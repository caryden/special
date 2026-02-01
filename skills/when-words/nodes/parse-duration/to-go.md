# parse-duration: Go translation hints

- **Signature:** `func ParseDuration(input string) (int64, error)` — return `error` for all error cases.
- **Regex:** Use `regexp` package. Colon: `^(\d+):(\d{1,2})(?::(\d{1,2}))?$`. Units: `(\d+(?:\.\d+)?)\s*([a-zA-Z]+)`. Use `regexp.MustCompile()` at package level.
- **Unit map:** `map[string]int64` with all ~30 aliases.
- **String normalization:** `strings.TrimSpace()`, `strings.ToLower()`, `strings.ReplaceAll(s, ",", " ")`, use `regexp.ReplaceAllString` to strip "and", collapse whitespace.
- **Parsing numbers:** `strconv.ParseFloat(s, 64)` for decimal values, `strconv.Atoi()` for colon components.
- **Rounding:** `int64(math.Round(total))`.
- **Imports:** `fmt`, `math`, `regexp`, `strconv`, `strings`.
