# parser — Spec

Depends on: `token-types`, `ast-types`

## Purpose

Parse a sequence of tokens into an AST using recursive descent. Each precedence
level is a function that calls the next-higher level.

## Function

`parse(tokens: Token[]) → AstNode`

## Precedence Levels (lowest to highest)

| Level | Function | Operators | Associativity |
|-------|----------|-----------|---------------|
| 1 | parseAddSub | `+`, `-` | Left |
| 2 | parseMulDiv | `*`, `/`, `%` | Left |
| 3 | parsePower | `**` | **Right** |
| 4 | parseUnary | `-` (prefix) | Right (prefix) |
| 5 | parseAtom | numbers, `(…)` | — |

## Behavior

- **Left-associative** levels: loop while next token matches, build left-growing tree
- **Right-associative** `**`: if next token is `power`, recurse into the *same* level
  (not the next higher one) for the exponent
- **Unary minus**: if next token is `minus`, consume it, recurse into parseUnary
  (allows chained unary: `--5`)
- **Atoms**: number tokens → NumberLiteral; `lparen` → consume, parse full expression,
  expect `rparen`
- After parsing, verify all tokens are consumed; if not, throw error about trailing tokens
- Missing atom → "Unexpected end of input"
- Unexpected token type at atom level → error with token kind and value

## Test Vectors

| Input Tokens | Expected AST (simplified) |
|-------------|--------------------------|
| `[number:"2"]` | `NumberLiteral(2)` |
| `[number:"2", plus:"+", number:"3"]` | `Binary(+, Num(2), Num(3))` |
| `[number:"2", plus:"+", number:"3", star:"*", number:"4"]` | `Binary(+, Num(2), Binary(*, Num(3), Num(4)))` |
| `[number:"2", power:"**", number:"3", power:"**", number:"2"]` | `Binary(**, Num(2), Binary(**, Num(3), Num(2)))` |
| `[minus:"-", number:"5"]` | `Unary(-, Num(5))` |
| `[minus:"-", minus:"-", number:"5"]` | `Unary(-, Unary(-, Num(5)))` |
| `[lparen:"(", number:"2", plus:"+", number:"3", rparen:")"]` | `Binary(+, Num(2), Num(3))` |

### Error Cases

| Input Tokens | Error |
|-------------|-------|
| `[]` (empty) | Unexpected end of input |
| `[number:"2", plus:"+"]` | Unexpected end of input |
| `[number:"2", number:"3"]` | Unexpected token after expression |
| `[lparen:"(", number:"2"]` | Expected rparen |
