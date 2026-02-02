# fminbox → Go

- `FminboxMethod` as a `string` constant (`"bfgs"`, `"l-bfgs"`, etc.) or a typed enum via `const` block.
- `FminboxOptions` → struct with `Lower, Upper []float64`, `Method string`, `Mu0 *float64` (nil = auto), `MuFactor float64`, `OuterIterations int`, `OuterGradTol float64`, embedded `OptimizeOptions`.
- Default bounds: `make([]float64, n)` filled with `math.Inf(-1)` / `math.Inf(1)`.
- `BarrierValue`, `BarrierGradient`, `ProjectedGradientNorm` → exported helper functions.
- Use `math.IsInf(bound, 0)` to skip infinite bound terms. Guard `if dx <= 0 { return math.Inf(1) }`.
- Inner solver dispatch: `switch method { case "bfgs": ... case "l-bfgs": ... }`.
- Clamp with `math.Max(lower[i]+1e-15, math.Min(upper[i]-1e-15, x[i]))` after each inner solve.
- Auto-mu: compute L1 norms of objective gradient and barrier gradient, then `mu = muFactor * objNorm / barNorm`.
