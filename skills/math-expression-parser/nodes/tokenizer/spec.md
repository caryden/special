# tokenizer — Spec

Depends on: `token-types`

## Purpose

Convert a math expression string into a sequence of tokens. Character-by-character
lexer. No regex needed.

## Function

`tokenize(input: string) → Token[]`

## Behavior

- Walk input character by character using an index
- Skip whitespace: space, tab, newline, carriage return
- Numbers: consume consecutive digits and at most one `.` (decimal point)
  - A number may start with `.` (e.g., `.5` → token `number:".5"`)
  - Two decimal points in one number is an error
- `*` followed by `*` → single `power:"**"` token (not two `star` tokens)
- Single-character operators map directly: `+`→plus, `-`→minus, `*`→star, `/`→slash, `%`→percent
- Parentheses: `(`→lparen, `)`→rparen
- Any other character → throw error with the character and its position

## Test Vectors

| Input | Expected Tokens (kind:value) |
|-------|------------------------------|
| `""` | `[]` |
| `"   \t\n  "` | `[]` |
| `"42"` | `[number:"42"]` |
| `"3.14"` | `[number:"3.14"]` |
| `".5"` | `[number:".5"]` |
| `"+ - * / % **"` | `[plus:"+", minus:"-", star:"*", slash:"/", percent:"%", power:"**"]` |
| `"(1)"` | `[lparen:"(", number:"1", rparen:")"]` |
| `"2 + 3 * (4 - 1)"` | `[number:"2", plus:"+", number:"3", star:"*", lparen:"(", number:"4", minus:"-", number:"1", rparen:")"]` |
| `"2**3*4"` | `[number:"2", power:"**", number:"3", star:"*", number:"4"]` |
| `"1+2"` | `[number:"1", plus:"+", number:"2"]` |

### Error Cases

| Input | Error |
|-------|-------|
| `"1.2.3"` | Unexpected character `.` |
| `"2 @ 3"` | Unexpected character `@` at position 2 |
