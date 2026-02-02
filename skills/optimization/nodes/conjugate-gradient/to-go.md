# conjugate-gradient → Go

- `ConjugateGradientOptions` → struct embedding `OptimizeOptions`, with `Eta float64` and `RestartInterval int`.
- If `grad` is `nil`, wrap `ForwardDiffGradient` as the gradient function.
- Direction `d []float64`. Update in-place: `d[i] = -gx[i] + beta*d[i]`.
- HZ beta: compute `yk`, `dDotY`, then the numerator using a single loop. Guard `math.Abs(dDotY) < 1e-30`.
- Eta guarantee: `etaK = -1.0 / (dNorm * math.Min(eta, gNorm))`. Use `math.Max(beta, etaK)`.
- Accumulate `functionCalls` and `gradientCalls` from `HagerZhangLineSearch` return values.
- Default `RestartInterval` to `len(x0)` when zero-value.
