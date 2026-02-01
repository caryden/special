# token-types — Spec

Leaf node. No dependencies.

## Purpose

Define the token kinds and the Token data structure used by the tokenizer and parser.

## Types

**TokenKind** — an enumeration of 9 values:
`number`, `plus`, `minus`, `star`, `slash`, `percent`, `power`, `lparen`, `rparen`

**Token** — a pair of `(kind: TokenKind, value: string)`

**Factory function**: `token(kind, value) → Token`

## Test Vectors

| Call | Expected |
|------|----------|
| `token("number", "42")` | `Token { kind: "number", value: "42" }` |
| `token("plus", "+")` | `Token { kind: "plus", value: "+" }` |
