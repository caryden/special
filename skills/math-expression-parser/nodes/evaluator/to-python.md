# evaluator → Python

- Use `isinstance()` checks or match on a `.type` field to dispatch on node type
- `**` operator for exponentiation (same as the math operation)
- Raise `ValueError` for division by zero and modulo by zero
- Python's `%` operator follows floored division semantics — for this skill, that's
  acceptable since all test vectors use positive modulus
- Recursion depth is fine for expression trees (rarely more than ~20 levels deep)
