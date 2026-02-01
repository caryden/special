# ast-types → Python

- Use `@dataclass` classes for each variant: `NumberLiteral`, `UnaryExpr`, `BinaryExpr`
- Each has a `type: str` field set to `"number"`, `"unary"`, or `"binary"`
- Use `AstNode = NumberLiteral | UnaryExpr | BinaryExpr` (Python 3.10+ union type)
- The `operand`, `left`, `right` fields are typed as `AstNode` (recursive)
- Factory functions can just be the dataclass constructors
