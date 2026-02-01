# evaluate → Go

- Name the function `Calc(expression string) (float64, error)`
- `strings.TrimSpace(expression)` to check for empty input
- Return `0, fmt.Errorf("Empty expression")` for empty/whitespace input
- Compose the three internal functions: `Tokenize`, `Parse`, `Evaluate`
- This is the only exported function if building as a package
- Error propagation: check each step's error return and propagate
