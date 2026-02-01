# token-types → Rust

- Use `#[derive(Debug, Clone, PartialEq)]` enum for `TokenKind` with 9 variants
- Use a struct `Token { kind: TokenKind, value: String }` (derive Debug, Clone, PartialEq)
- Factory: `Token::new(kind, value)` or just struct literal construction
