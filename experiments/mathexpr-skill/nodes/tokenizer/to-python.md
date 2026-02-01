# tokenizer → Python

- Use `while i < len(input)` loop with manual index advancement
- `ch.isdigit()` for digit check, or compare `'0' <= ch <= '9'`
- Return a `list[Token]`
- Raise `ValueError` for errors (include character and position in message)
- Leading dot numbers (`.5`) are valid — check for digit OR `.` to start a number
