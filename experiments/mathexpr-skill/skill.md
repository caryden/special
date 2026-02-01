# Mathexpr Skill

A math expression parser and evaluator. Takes a string like `"2 + 3 * (4 - 1)"`
and returns the numeric result (`11`).

## When to use this skill

When you need to evaluate mathematical expressions from strings with correct
operator precedence, parentheses, and error handling — without adding a dependency.

## Node Graph

```
token-types ─────────────┬──→ tokenizer ──┐
                         │                │
ast-types ──┬────────────┤──→ parser ─────┤──→ evaluate (root: public API)
            │            │                │
            └────────────┴──→ evaluator ──┘
```

### Nodes

| Node | Type | Depends On | Description |
|------|------|-----------|-------------|
| `token-types` | leaf | — | Token kind enum and Token data type |
| `ast-types` | leaf | — | AST node types: NumberLiteral, UnaryExpr, BinaryExpr |
| `tokenizer` | internal | token-types | Lexer: string → Token[] |
| `parser` | internal | token-types, ast-types | Recursive descent: Token[] → AstNode |
| `evaluator` | internal | ast-types | Tree walker: AstNode → number |
| `evaluate` | root | tokenizer, parser, evaluator | Pipeline: string → number (`calc()`) |

### Subset Extraction

You can translate any subset by following the `depends-on` edges:

- **Just the evaluator** (AST in, number out): `ast-types` + `evaluator`
- **Parser only** (tokens in, AST out): `token-types` + `ast-types` + `parser`
- **Full pipeline**: all 6 nodes

## Supported Operations

| Operator | Symbol | Precedence | Associativity |
|----------|--------|-----------|---------------|
| Addition | `+` | 1 (lowest) | Left |
| Subtraction | `-` | 1 | Left |
| Multiplication | `*` | 2 | Left |
| Division | `/` | 2 | Left |
| Modulo | `%` | 2 | Left |
| Exponentiation | `**` | 3 | **Right** |
| Unary minus | `-` (prefix) | 4 | Right (prefix) |

**Important**: Unary minus binds tighter than exponentiation.
`-2 ** 2` = `(-2)² = 4`, NOT `-(2²) = -4`.

## How to Use This Skill

1. Read this file for overview and the node graph
2. For each node you need, read `nodes/<name>/spec.md` for behavior and test vectors
3. Read `nodes/<name>/to-<lang>.md` for language-specific translation guidance
4. Generate implementation + tests
5. If stuck, consult `reference/src/<name>.ts` for the TypeScript implementation

The per-node specs are self-contained — you can build nodes in parallel.

## Error Cases

- Empty or whitespace-only input → error
- Unrecognized characters (e.g., `@`, `#`) → error with position
- Unmatched parentheses → error
- Trailing tokens after valid expression → error
- Division by zero → error
- Modulo by zero → error
