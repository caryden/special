# ip-newton → Go

- `ConstraintDef` → struct with `C func([]float64) []float64`, `Jacobian func([]float64) [][]float64`, `Lower, Upper []float64`.
- `IPNewtonOptions` → struct embedding `OptimizeOptions` with `Lower, Upper []float64`, `Constraints *ConstraintDef`, `Mu0 float64`, `KktTol float64`.
- Classify into slices of `IneqEntry{Idx int, Bound, Sigma float64}` and `EqEntry{Idx int, Target float64}`.
- `choleskySolve` returns `([]float64, bool)` — second value `false` when not positive definite. `robustSolve` adds diagonal regularization in a loop.
- Dense matrix operations: `[][]float64` for Hessian, Jacobians. `matTDiagMat` fills upper triangle and mirrors.
- `math.IsInf`, `math.IsNaN` for bound classification and NaN detection.
- Fraction-to-boundary: simple loop, `alpha = math.Max(alpha, 0)` at the end.
- No generics needed — all vectors are `[]float64`. Use `make([]float64, n)` for allocation.
- Merit function returns `math.Inf(1)` when any slack is non-positive.
- Mehrotra: `sigma := math.Pow(muAff/muCurrent, 3)`; enforce monotonic decrease with `mu = math.Max(math.Min(muNext, mu), 1e-20)`.
