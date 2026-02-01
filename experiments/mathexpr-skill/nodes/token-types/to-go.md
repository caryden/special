# token-types → Go

- Use `type TokenKind string` with constants: `TokenNumber TokenKind = "number"`, etc.
- Use `type Token struct { Kind TokenKind; Value string }`
- Export all types (PascalCase): `Token`, `TokenKind`, `NewToken()`
