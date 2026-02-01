# nelder-mead → Go

- Simplex: `[][]float64`, fValues: `[]float64`.
- Sort: use `sort.Slice` with a comparator on indices.
- `NelderMeadOptions` → struct embedding `OptimizeOptions`.
- Return `OptimizeResult{Gradient: nil, GradientCalls: 0, ...}`.
- `createInitialSimplex` → unexported function.
