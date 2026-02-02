# newton-trust-region → Go

- `TrustRegionOptions` struct embedding `OptimizeOptions`; fields `InitialDelta float64`, `MaxDelta float64`, `Eta float64`.
- `doglegStep(g, H [][]float64, delta float64) []float64` as a package-private helper.
- Reuse `choleskySolve` from `newton` node; returns `([]float64, bool)`.
- `matVecMul(M [][]float64, v []float64) []float64` and `vecNorm(v []float64) float64` as helpers.
- Dot product: loop accumulating `sum += a[i]*b[i]`.
- Trial point: allocate `xTrial := make([]float64, n)` then `xTrial[i] = x[i] + p[i]`.
- Dogleg quadratic discriminant: guard `disc < 0 || a <= 0` and return Cauchy.
- Delta update: use `math.Min(2*delta, maxDelta)` for expansion.
- Return `OptimizeResult{Gradient: gx, GradientCalls: gradientCalls, ...}`.
