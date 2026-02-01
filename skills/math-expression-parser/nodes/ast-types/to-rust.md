# ast-types → Rust

- Use a `#[derive(Debug, Clone, PartialEq)]` enum `AstNode` with three variants:
  ```rust
  enum AstNode {
      Number(f64),
      Unary { op: String, operand: Box<AstNode> },
      Binary { op: String, left: Box<AstNode>, right: Box<AstNode> },
  }
  ```
- **Must use `Box<AstNode>`** for recursive variants (Rust requires indirection for recursive types)
- Factory functions return owned `AstNode` values
- Consider implementing `Display` for debugging
