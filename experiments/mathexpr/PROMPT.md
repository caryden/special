# Mathexpr

Build a math expression evaluator. It takes a string like `"2 + 3 * (4 - 1)"` and
returns the numeric result (`11`).

## Supported operations

- Basic arithmetic: `+`, `-`, `*`, `/`
- Modulo: `%`
- Exponentiation: `**`
- Unary negation: `-5`, `--5` (double negative), `2 * -3`
- Parentheses for grouping: `(2 + 3) * 4`
- Decimal numbers: `3.14`, `.5`

## Operator precedence

Standard math precedence (lowest to highest):
1. Addition and subtraction (`+`, `-`)
2. Multiplication, division, modulo (`*`, `/`, `%`)
3. Exponentiation (`**`) — this is **right-associative** (so `2 ** 3 ** 2` = `2 ** 9` = `512`, not `8 ** 2` = `64`)
4. Unary minus
5. Parentheses

All other operators are left-associative (so `1 - 2 - 3` = `-4`, not `2`).

## Error handling

Throw/return errors for:
- Empty input
- Division by zero
- Modulo by zero
- Unmatched parentheses
- Invalid characters
- Malformed expressions (like `2 +` with nothing after the operator)

## Requirements

- Expose a single `calc(expression) → number` function as the public API
- All functions must be pure (no side effects)
- Zero external dependencies — standard library only
- Include comprehensive tests
- The implementation should be structured as a pipeline: tokenization, parsing into
  a tree structure, then evaluation of that tree
