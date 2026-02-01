# evaluator → Go

- Use a type switch on the AstNode interface to dispatch
- `math.Pow(left, right)` for exponentiation
- Return `(float64, error)` for error propagation
- Check `right == 0` for division/modulo by zero
- Go's `math.Mod()` or `%` (only for ints) — since values are `float64`,
  use `math.Mod(left, right)` for modulo
- Error wrapping: `fmt.Errorf("Division by zero")` or a sentinel error
