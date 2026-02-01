# test-functions → Go

- Define a `TestFunction` struct with `Name string`, `Dimensions int`, `F func([]float64) float64`, `Gradient func([]float64) []float64`, `MinimumAt []float64`, `MinimumValue float64`, `StartingPoint []float64`.
- Export factory functions: `Sphere()`, `Booth()`, `Rosenbrock()`, etc.
- Use `math.Cos`, `math.Pi`, `math.Pow` for formulas.
- `HimmelblauMinima()` → `[][]float64`.
