# ast-types — Spec

Leaf node. No dependencies.

## Purpose

Define the AST node types used by the parser and evaluator. The AST is a tagged
union (discriminated union) of three node types.

## Types

**BinaryOp** — one of: `+`, `-`, `*`, `/`, `%`, `**`

**UnaryOp** — only: `-`

**AstNode** — tagged union of:

| Variant | Tag | Fields |
|---------|-----|--------|
| NumberLiteral | `type: "number"` | `value: float` |
| UnaryExpr | `type: "unary"` | `op: UnaryOp`, `operand: AstNode` |
| BinaryExpr | `type: "binary"` | `op: BinaryOp`, `left: AstNode`, `right: AstNode` |

**Factory functions**:
- `numberLiteral(value) → NumberLiteral`
- `unaryExpr(op, operand) → UnaryExpr`
- `binaryExpr(op, left, right) → BinaryExpr`

## Test Vectors

| Call | Expected |
|------|----------|
| `numberLiteral(42)` | `{ type: "number", value: 42 }` |
| `unaryExpr("-", numberLiteral(5))` | `{ type: "unary", op: "-", operand: { type: "number", value: 5 } }` |
| `binaryExpr("+", numberLiteral(2), numberLiteral(3))` | `{ type: "binary", op: "+", left: { type: "number", value: 2 }, right: { type: "number", value: 3 } }` |
| Nested: `binaryExpr("*", binaryExpr("+", numberLiteral(1), numberLiteral(2)), numberLiteral(3))` | Correct nesting with outer `*`, inner `+` |
