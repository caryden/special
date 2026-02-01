# Mathexpr — Specification

A math expression parser and evaluator. Parses a string like `"2 + 3 * (4 - 1)"`
into an abstract syntax tree, then evaluates it to produce a numeric result.

The library is structured as a pipeline: **tokenizer → parser → evaluator**, with
shared type definitions for tokens and AST nodes.

## Types

### Token

A token has a `kind` and a string `value`.

| Kind | Value | Description |
|------|-------|-------------|
| `number` | the digits (e.g. `"42"`, `"3.14"`, `".5"`) | Numeric literal |
| `plus` | `"+"` | Addition operator |
| `minus` | `"-"` | Subtraction or unary negation |
| `star` | `"*"` | Multiplication operator |
| `slash` | `"/"` | Division operator |
| `percent` | `"%"` | Modulo operator |
| `power` | `"**"` | Exponentiation operator |
| `lparen` | `"("` | Left parenthesis |
| `rparen` | `")"` | Right parenthesis |

### AST Nodes

The AST is a tree of three node types:

**NumberLiteral** — a leaf node holding a numeric value.
```
{ type: "number", value: <float> }
```

**UnaryExpr** — a unary operator applied to an operand. Only unary minus (`-`) is supported.
```
{ type: "unary", op: "-", operand: <AstNode> }
```

**BinaryExpr** — a binary operator applied to left and right operands.
```
{ type: "binary", op: <"+"|"-"|"*"|"/"|"%"|"**">, left: <AstNode>, right: <AstNode> }
```

## Functions

### `tokenize(input) → Token[]`

Converts a math expression string into a sequence of tokens.

**Behavior:**
- Walk the input character by character
- Skip whitespace (space, tab, newline, carriage return)
- Numbers: consume consecutive digits and at most one `.` (decimal point)
  - A number may start with `.` (e.g., `.5`)
  - Two decimal points in one number is an error
- `**` is a single `power` token (not two `star` tokens)
- Throw on unrecognized characters, reporting the character and position

### `parse(tokens) → AstNode`

Parses a token sequence into an AST using recursive descent with precedence climbing.

**Operator precedence (lowest to highest):**

| Level | Operators | Associativity |
|-------|-----------|---------------|
| 1 | `+`, `-` | Left |
| 2 | `*`, `/`, `%` | Left |
| 3 | `**` | **Right** |
| 4 | Unary `-` | Right (prefix) |
| 5 | Atoms: numbers, `(expr)` | — |

**Behavior:**
- Each precedence level is a function that calls the next-higher level
- Left-associative operators loop: `left = binop(left, right)`
- Right-associative `**` recurses into its own level: `right = parsePower()`
- Unary minus can chain: `--5` is `unary(-, unary(-, 5))`
- Parenthesized expressions recurse to the lowest precedence level
- Throws on: empty input, unmatched parentheses, unexpected tokens, trailing tokens

### `evaluate(ast) → number`

Evaluates an AST node by recursive tree walk.

**Behavior:**
- `NumberLiteral` → return the value
- `UnaryExpr` → negate the evaluated operand
- `BinaryExpr` → evaluate left and right, apply the operator
- Division by zero → throw error
- Modulo by zero → throw error

### `calc(expression) → number`

End-to-end: string in, number out. Composes `tokenize → parse → evaluate`.

Throws on empty/whitespace-only input.

---

## Test Vectors

### Tokenizer

| Input | Expected Tokens (kind:value) |
|-------|------------------------------|
| `""` | `[]` |
| `"   \t\n  "` | `[]` |
| `"42"` | `[number:"42"]` |
| `"3.14"` | `[number:"3.14"]` |
| `".5"` | `[number:".5"]` |
| `"+ - * / % **"` | `[plus:"+", minus:"-", star:"*", slash:"/", percent:"%", power:"**"]` |
| `"(1)"` | `[lparen:"(", number:"1", rparen:")"]` |
| `"2 + 3 * (4 - 1)"` | `[number:"2", plus:"+", number:"3", star:"*", lparen:"(", number:"4", minus:"-", number:"1", rparen:")"]` |
| `"2**3*4"` | `[number:"2", power:"**", number:"3", star:"*", number:"4"]` |
| `"1+2"` | `[number:"1", plus:"+", number:"2"]` |

Tokenizer errors:
| Input | Error |
|-------|-------|
| `"1.2.3"` | Unexpected character `.` |
| `"2 @ 3"` | Unexpected character `@` at position 2 |

### Parser

These show the AST structure produced by parsing.

| Input | Expected AST |
|-------|-------------|
| `"42"` | `number(42)` |
| `"3.14"` | `number(3.14)` |
| `"(42)"` | `number(42)` |
| `"((7))"` | `number(7)` |
| `"2 + 3"` | `binary(+, number(2), number(3))` |
| `"5 - 1"` | `binary(-, number(5), number(1))` |
| `"4 * 6"` | `binary(*, number(4), number(6))` |
| `"10 / 2"` | `binary(/, number(10), number(2))` |
| `"10 % 3"` | `binary(%, number(10), number(3))` |
| `"2 ** 3"` | `binary(**, number(2), number(3))` |

Precedence:
| Input | Expected AST |
|-------|-------------|
| `"2 + 3 * 4"` | `binary(+, number(2), binary(*, number(3), number(4)))` |
| `"2 * 3 ** 2"` | `binary(*, number(2), binary(**, number(3), number(2)))` |
| `"(2 + 3) * 4"` | `binary(*, binary(+, number(2), number(3)), number(4))` |

Associativity:
| Input | Expected AST |
|-------|-------------|
| `"1 - 2 - 3"` | `binary(-, binary(-, number(1), number(2)), number(3))` |
| `"12 / 3 / 2"` | `binary(/, binary(/, number(12), number(3)), number(2))` |
| `"2 ** 3 ** 2"` | `binary(**, number(2), binary(**, number(3), number(2)))` |

Unary:
| Input | Expected AST |
|-------|-------------|
| `"-5"` | `unary(-, number(5))` |
| `"--5"` | `unary(-, unary(-, number(5)))` |
| `"2 * -3"` | `binary(*, number(2), unary(-, number(3)))` |

Parser errors:
| Input | Error |
|-------|-------|
| `""` (empty tokens) | Unexpected end of input |
| `"(2 + 3"` | Expected rparen |
| `"2 + 3)"` | Unexpected token after expression |
| `"* 5"` | Unexpected token: star |
| `"2 +"` | Unexpected end of input |

### Evaluator

Direct AST evaluation (independent of parser):

| AST | Expected |
|-----|----------|
| `number(42)` | `42` |
| `unary(-, number(5))` | `-5` |
| `binary(+, number(2), number(3))` | `5` |
| `binary(-, number(10), number(4))` | `6` |
| `binary(*, number(3), number(7))` | `21` |
| `binary(/, number(10), number(4))` | `2.5` |
| `binary(%, number(10), number(3))` | `1` |
| `binary(**, number(2), number(10))` | `1024` |
| `binary(/, number(1), number(0))` | ERROR: Division by zero |
| `binary(%, number(1), number(0))` | ERROR: Modulo by zero |
| `binary(*, binary(+, number(2), number(3)), unary(-, number(4)))` | `-20` |

### End-to-End (calc)

| Expression | Expected |
|------------|----------|
| `"1 + 2"` | `3` |
| `"10 - 3"` | `7` |
| `"4 * 5"` | `20` |
| `"15 / 4"` | `3.75` |
| `"10 % 3"` | `1` |
| `"2 ** 8"` | `256` |
| `"2 + 3 * 4"` | `14` |
| `"2 * 3 + 4"` | `10` |
| `"10 - 2 * 3"` | `4` |
| `"2 + 3 ** 2"` | `11` |
| `"2 * 3 ** 2"` | `18` |
| `"2 ** 3 * 4"` | `32` |
| `"(2 + 3) * 4"` | `20` |
| `"2 * (3 + 4)"` | `14` |
| `"(2 + 3) * (4 + 5)"` | `45` |
| `"((1 + 2) * (3 + 4))"` | `21` |
| `"(10)"` | `10` |
| `"1 - 2 - 3"` | `-4` |
| `"1 - 2 + 3"` | `2` |
| `"12 / 3 / 2"` | `2` |
| `"2 ** 3 ** 2"` | `512` |
| `"-5"` | `-5` |
| `"--5"` | `5` |
| `"-(-5)"` | `5` |
| `"2 * -3"` | `-6` |
| `"-2 ** 2"` | `4` |
| `"-(2 ** 2)"` | `-4` |
| `"3.14 * 2"` | `6.28` |
| `".5 + .5"` | `1` |
| `"2 + 3 * 4 - 1"` | `13` |
| `"(2 + 3) * (4 - 1) / 5"` | `3` |
| `"10 % 3 + 2 ** 3"` | `9` |
| `"2 ** (1 + 2)"` | `8` |
| `"100 / 10 / 2 + 3"` | `8` |

End-to-end errors:
| Expression | Error |
|------------|-------|
| `""` | Empty expression |
| `"   "` | Empty expression |
| `"1 / 0"` | Division by zero |
| `"5 % 0"` | Modulo by zero |
| `"(2 + 3"` | Unmatched paren |
| `"2 @ 3"` | Invalid character |
| `"2 +"` | Unexpected end |
