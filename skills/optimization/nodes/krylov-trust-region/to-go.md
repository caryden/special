# krylov-trust-region → Go

- `KrylovTrustRegionOptions` → struct embedding `OptimizeOptions` with `InitialRadius, MaxRadius, Eta, RhoLower, RhoUpper, CgTol float64`.
- `SteihaugCG` as an exported function returning a struct `SteihaugResult{S []float64, MDecrease float64, CgIters int, OnBoundary bool, GradCalls int}`.
- Hessian-vector product: `HessianVectorProduct(grad, x, v, gx []float64) []float64` from finite-hessian.
- `boundaryTau` → local function. Use `math.Max(0, disc)` before `math.Sqrt`.
- CG vectors `z`, `r`, `d` are `[]float64` allocated with `make`. Update with `for j := range z { z[j] += alpha * d[j] }`.
- `norm2` → loop accumulating `s += v[i]*v[i]`. Outer solver: `math.Sqrt(norm2(s))`.
- No ternary: use `if/else` for radius update branches (shrink, expand, or keep).
- Rejected step check: `if radius < 1e-15 { return ... }`.
- Return `OptimizeResult{X: x, Fun: fx, Gradient: gx, ...}`.
- `Dot` from vec-ops for inner products; avoid allocating intermediate vectors where possible.
