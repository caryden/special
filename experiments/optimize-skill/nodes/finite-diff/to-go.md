# finite-diff → Go

- `math.SmallestNonzeroFloat64` is NOT machine epsilon. Use `eps = 2.220446049250313e-16` as a constant, or compute via `math.Nextafter(1, 2) - 1`.
- `math.Sqrt(eps)` for forward, `math.Pow(eps, 1.0/3.0)` for central.
- Take `f func([]float64) float64` and `x []float64`.
- Clone x before perturbing. Go slices are reference types — don't modify the input.
- `MakeGradient(f, method string)` → returns `func([]float64) []float64`.
