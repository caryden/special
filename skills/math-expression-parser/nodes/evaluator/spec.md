# evaluator — Spec

Depends on: `ast-types`

## Purpose

Evaluate an AST node to produce a numeric result. Simple recursive tree walk.

## Function

`evaluate(node: AstNode) → number`

## Behavior

- **NumberLiteral**: return the value directly
- **UnaryExpr** (`-`): negate the recursive result of the operand
- **BinaryExpr**: recursively evaluate left and right, then apply the operator:
  - `+` → left + right
  - `-` → left − right
  - `*` → left × right
  - `/` → left ÷ right (error if right is 0)
  - `%` → left mod right (error if right is 0)
  - `**` → left ^ right

## Test Vectors

| AST | Expected Result |
|-----|----------------|
| `NumberLiteral(42)` | `42` |
| `NumberLiteral(3.14)` | `3.14` |
| `Unary(-, NumberLiteral(5))` | `-5` |
| `Unary(-, Unary(-, NumberLiteral(7)))` | `7` |
| `Binary(+, Num(2), Num(3))` | `5` |
| `Binary(-, Num(10), Num(4))` | `6` |
| `Binary(*, Num(3), Num(7))` | `21` |
| `Binary(/, Num(15), Num(4))` | `3.75` |
| `Binary(%, Num(10), Num(3))` | `1` |
| `Binary(**, Num(2), Num(8))` | `256` |
| `Binary(+, Num(2), Binary(*, Num(3), Num(4)))` | `14` |

### Error Cases

| AST | Error |
|-----|-------|
| `Binary(/, Num(1), Num(0))` | Division by zero |
| `Binary(%, Num(5), Num(0))` | Modulo by zero |
