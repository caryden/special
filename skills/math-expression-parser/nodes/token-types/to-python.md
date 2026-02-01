# token-types → Python

- Use a string literal union or `Enum` for `TokenKind`
- Use a `dataclass` for `Token` with `kind: str` and `value: str`
- The factory function can be the dataclass constructor itself — no separate function needed
