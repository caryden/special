# Math Expression Parser — Help Guide

This guide helps you choose the right nodes and target language for your use case.

## Quick Start

If you already know what you need:
- **Full pipeline**: `evaluate --lang <language>`
- **Parser only**: `parser --lang <language>`
- **Full library**: `all --lang <language>`

## Decision Tree

### 1. What is your use case?

| Use Case | Recommended Nodes | Why |
|----------|------------------|-----|
| Evaluate math strings end-to-end | `evaluate` | Single entry point: string in, number out. Pulls in all dependencies automatically. |
| Build a custom evaluator on the AST | `parser` | Get the tokenizer + parser. Write your own tree walker for custom behavior (e.g., symbolic math, variable substitution). |
| Extend the tokenizer | `tokenizer` | Get just the lexer. Useful if you want to add custom tokens or operators before parsing. |
| Just need the type definitions | `token-types` and/or `ast-types` | Leaf nodes with no dependencies. Use as a starting point for your own parser. |

### 2. How deep do you need to go?

| Depth | Nodes | What You Get |
|-------|-------|-------------|
| Just evaluate strings | `evaluate` | Full pipeline: string → number |
| Access the AST | `parser` | Tokenizer + parser: string → AstNode tree |
| Access tokens | `tokenizer` | Lexer only: string → Token[] |
| Type definitions only | `token-types`, `ast-types` | Enums and data types, no logic |

Dependencies are included automatically — requesting `evaluate` gives you all 6 nodes.

### 3. What language / platform?

| Language | Notes |
|----------|-------|
| Python | Use `@dataclass` for AST nodes, `Enum` for token types. Translation hints available. |
| Rust | Use `enum` for tagged unions (AST and tokens). `Box<AstNode>` for recursive variants. Translation hints available. |
| Go | Use interfaces for AST nodes, `iota` constants for token types. Translation hints available. |
| TypeScript | Direct copy of reference — no translation needed. |
| Other | The spec.md files are language-agnostic. Any language with tagged unions or equivalent can implement them. |

## Node Recipes

Pre-computed dependency sets for common subsets. Copy-paste these directly.

### Full pipeline (most common)

```
evaluate --lang <language>
```

6 nodes total. String in, number out. Handles `+`, `-`, `*`, `/`, `%`, `**`,
unary minus, and parentheses with correct precedence.

### Parser + evaluator (access the AST)

```
parser evaluator --lang <language>
```

5 nodes total: `token-types`, `ast-types`, `tokenizer`, `parser`, `evaluator`.
Same as full pipeline but without the convenience wrapper — you call tokenize,
parse, and evaluate separately.

### Tokenizer only

```
tokenizer --lang <language>
```

2 nodes total: `token-types`, `tokenizer`. Just the lexer.

## Frequently Asked Questions

**Q: What operators are supported?**
A: `+`, `-`, `*`, `/`, `%` (modulo), `**` (exponentiation), unary `-`, and
parentheses. Exponentiation is right-associative; unary minus binds tighter
than `**` (so `-2 ** 2` = 4, not -4).

**Q: Can I add nodes later?**
A: Yes. Each node is self-contained with explicit dependencies. Generate additional
nodes at any time — just include their dependencies.

**Q: What if my language isn't listed?**
A: The spec.md files are language-agnostic behavioral specifications with test
vectors. Any language can implement them. The to-<lang>.md hints just accelerate
translation for the listed languages.
