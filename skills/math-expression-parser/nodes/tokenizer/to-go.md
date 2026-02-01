# tokenizer → Go

- Take `string` input, return `([]Token, error)`
- Use `[]rune` or index into string bytes (input is ASCII-safe)
- `unicode.IsDigit(ch)` or `ch >= '0' && ch <= '9'` for digit check
- Return a slice of Token structs
- Use `fmt.Errorf("Unexpected character '%c' at position %d", ch, i)` for errors
- Leading dot numbers (`.5`) are valid — check for digit OR `.` to start a number
- The `**` lookahead: check `i+1 < len(input) && input[i+1] == '*'`
