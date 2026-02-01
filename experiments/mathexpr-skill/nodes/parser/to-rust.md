# parser → Rust

- Take `&[Token]` input, return `Result<AstNode, String>`
- Use a struct to hold parser state: `struct Parser { tokens: Vec<Token>, pos: usize }`
- Or use a recursive function with `&[Token]` and return `(AstNode, usize)` (remaining position)
- The struct approach is cleaner: `impl Parser` with `peek()`, `advance()`, `expect()`
- `Box<AstNode>` for recursive AST children (required for recursive enums)
- Right-associativity for `**`: call `parse_power()` recursively for the exponent
- Pattern matching on `TokenKind` for dispatch
