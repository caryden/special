# evaluate — Spec

Depends on: `tokenizer`, `parser`, `evaluator`

## Purpose

End-to-end expression evaluation: string in, number out. This is the root node —
the public API of the skill. It composes the three internal nodes into a pipeline.

## Function

`calc(expression: string) → number`

## Behavior

1. Trim the input; if empty, throw "Empty expression"
2. Tokenize the input string → Token[]
3. Parse the tokens → AstNode
4. Evaluate the AST → number
5. Return the result

Errors from any stage propagate to the caller.

## Test Vectors

| Expression | Expected |
|-----------|----------|
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

### Error Cases

| Expression | Error |
|-----------|-------|
| `""` | Empty expression |
| `"   "` | Empty expression |
| `"1 / 0"` | Division by zero |
| `"5 % 0"` | Modulo by zero |
| `"(2 + 3"` | Expected rparen |
| `"2 @ 3"` | Unexpected character |
| `"2 +"` | Unexpected end of input |
