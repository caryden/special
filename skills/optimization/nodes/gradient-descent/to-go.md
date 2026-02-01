# gradient-descent → Go

- `grad` parameter: `func([]float64) []float64` — pass nil for no gradient, then use `ForwardDiffGradient` internally.
- Main loop: `for iteration := 1; iteration <= opts.MaxIterations; iteration++`.
- Use `Negate(gx)` from vec-ops.
- Return `OptimizeResult` immediately on line search failure.
