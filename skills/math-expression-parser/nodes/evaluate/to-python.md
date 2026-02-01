# evaluate → Python

- Name the function `calc(expression: str) -> float`
- `expression.strip()` to check for empty input
- Raise `ValueError("Empty expression")` for empty/whitespace input
- Import and compose the three internal functions: `tokenize`, `parse`, `evaluate`
- This is a thin wrapper — all logic is in the dependencies
- All exceptions from tokenizer/parser/evaluator propagate naturally
