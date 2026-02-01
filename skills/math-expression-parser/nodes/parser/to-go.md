# parser → Go

- Use a struct to hold parser state: `type parser struct { tokens []Token; pos int }`
- Methods: `peek() *Token`, `advance() Token`, `expect(kind TokenKind) (Token, error)`
- Return `(AstNode, error)` from parse functions
- Export only `Parse(tokens []Token) (AstNode, error)` — internal functions are unexported
- Right-associativity for `**`: call `parsePower()` recursively for the exponent
- Type switch on AstNode interface for consumers; parser constructs concrete types
- Error propagation: check and return errors at every recursive call
