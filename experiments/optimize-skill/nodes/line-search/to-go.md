# line-search → Go

- `LineSearchResult` → exported struct. `GNew []float64` (nil for no gradient).
- Functions take `f func([]float64) float64` and `grad func([]float64) []float64`.
- `zoom` → unexported function.
- Use `math.Abs` for curvature condition.
- Options via struct with zero-value defaults; use a `WithDefaults()` helper or check zero values.
