# brent-1d → Go

- `Brent1dOptions` → struct with `Tol float64` and `MaxIter int`. Check zero-values and fill defaults.
- `Brent1dResult` → struct with `X`, `Fun float64`, `Iterations`, `FunctionCalls int`, `Converged bool`, `Message string`.
- Golden constant: `var golden = (3 - math.Sqrt(5)) / 2`.
- Default tol: `math.Sqrt(math.SmallestNonzeroFloat64)` won't work — use `math.Sqrt(2.220446049250313e-16)` (machine epsilon for float64).
- Take `f` as `func(float64) float64`.
- Swap endpoints: `if a > b { a, b = b, a }`.
- Track `functionCalls` as a local `int` counter, increment inside a helper or inline.
