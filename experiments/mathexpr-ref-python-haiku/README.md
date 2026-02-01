# Math Expression Parser - Python Implementation

This is a complete Python translation of the TypeScript Type-O reference library for mathematical expression parsing and evaluation.

## Files

- **mathexpr.py** (12 KB) — Complete implementation with:
  - Token types (TokenKind enum, Token dataclass)
  - AST types (NumberLiteral, UnaryExpr, BinaryExpr dataclasses)
  - Tokenizer with support for integers, decimals, operators, and parentheses
  - Recursive descent parser with proper operator precedence and associativity
  - Evaluator supporting +, -, *, /, %, ** operations
  - Public API: `calc(expression: str) -> float`

- **test_mathexpr.py** (22 KB) — Comprehensive test suite with 100 tests:
  - Token type tests
  - AST type tests
  - Tokenizer tests (13 test cases)
  - Parser tests (26 test cases)
  - Evaluator tests (11 test cases)
  - End-to-end calc tests (50 test cases covering all functionality)

## Test Results

All 100 tests pass:
```
============================= 100 passed in 0.32s ==============================
```

## Operator Precedence (Highest to Lowest)

1. Unary minus (-)
2. Parenthesized expressions
3. Exponentiation (**) — right-associative
4. Multiplication, division, modulo (*, /, %)
5. Addition, subtraction (+, -)

## Implementation Details

- **Zero external dependencies** — uses only Python stdlib (dataclasses, enum, typing)
- **Idiomatic Python** — snake_case naming, dataclasses for types, proper exception handling
- **100% test coverage** — all test vectors from TypeScript reference translated
- **Type-safe design** — uses dataclasses with structured type definitions
- **Composable pipeline** — tokenize → parse → evaluate

## Usage

```python
from mathexpr import calc

result = calc("2 + 3 * 4")  # 14.0
result = calc("2 ** 3 ** 2")  # 512.0 (right-associative)
result = calc("(2 + 3) * (4 + 5)")  # 45.0
```

## Error Handling

- Empty expressions raise `ValueError("Empty expression")`
- Division by zero raises `ValueError("Division by zero")`
- Modulo by zero raises `ValueError("Modulo by zero")`
- Invalid tokens raise `ValueError("Unexpected character...")`
- Malformed expressions raise `ValueError` with descriptive messages
