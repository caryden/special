# vec-ops → Go

- Use `[]float64` for vectors.
- `math.Sqrt`, `math.Abs` from standard library.
- Return new slices; never modify input slices.
- `clone` → `append([]float64(nil), v...)`
- `zeros` → `make([]float64, n)`
- Export all functions with capital first letter: `Dot`, `Norm`, `NormInf`, etc.
