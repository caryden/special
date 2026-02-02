# newton → Go

- `NewtonOptions` struct embedding `OptimizeOptions`; fields `InitialTau float64`, `TauFactor float64`, `MaxRegularize int`.
- Hessian as `[][]float64`. `CholeskySolve` returns `([]float64, bool)` — false when not PD.
- Regularization: allocate `hReg` by copying rows with `copy(hReg[i], H[i])`, then `hReg[i][i] += tau`.
- Optional gradient/Hessian: accept `func([]float64) []float64` parameters; pass `nil` to signal "use finite differences" and check at call site.
- `negG[i] = -gx[i]` in a simple loop for the RHS vector.
- Return `OptimizeResult{Gradient: gx, GradientCalls: gradientCalls, ...}`.
- Infinity-norm via a helper: `func NormInf(v []float64) float64` using `math.Abs`.
- Use `math.Inf(1)` for initial step/func-change sentinels.
