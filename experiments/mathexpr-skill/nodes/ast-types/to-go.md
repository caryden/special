# ast-types → Go

- Go doesn't have sum types. Use an interface:
  ```go
  type AstNode interface { astNode() }
  ```
- Each variant is a struct implementing the interface with a marker method:
  - `NumberLiteral { Value float64 }`
  - `UnaryExpr { Op string; Operand AstNode }`
  - `BinaryExpr { Op string; Left, Right AstNode }`
- Use type switches (`switch n := node.(type)`) in the evaluator to dispatch
- Export all types (PascalCase)
