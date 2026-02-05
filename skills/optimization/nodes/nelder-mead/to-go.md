# nelder-mead → Go

- Simplex: `[][]float64`, fValues: `[]float64`.
- Sort: use `sort.Slice` with a comparator on indices.
- Standard deviation uses **population variance** (divide by n+1, not n): `math.Sqrt(sumSquaredDiffs / float64(n+1))`.
- `NelderMeadOptions` → struct embedding `OptimizeOptions`.
- Return `OptimizeResult{Gradient: nil, GradientCalls: 0, ...}`.
- `createInitialSimplex` → unexported function.
