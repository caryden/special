# finite-hessian → Go

- Hessian as `[][]float64`. Allocate: `make([][]float64, n)`, each row `make([]float64, n)`.
- Step size constant: `var fourthRootEps = math.Pow(2.220446049250313e-16, 0.25)`.
- Per-dimension step: `h[i] = fourthRootEps * math.Max(math.Abs(x[i]), 1.0)`.
- Perturb by copying x with `copy(xPlus, x)`, then modifying the index.
- Off-diagonal: loop `j` from `i+1` to `n`, mirror with `H[j][i] = H[i][j]`.
- `HessianVectorProduct(grad func([]float64) []float64, x, v, gx []float64) []float64`.
- Compute `vNorm` via loop; step `h = fourthRootEps * math.Max(vNorm, 1.0)`.
