# bfgs → Go

- Inverse Hessian H: `[][]float64` (n×n). Initialize with `identityMatrix(n)`.
- Helper functions: `identityMatrix`, `matVecMul`, `bfgsUpdate` — unexported.
- BFGS update: nested loops for the outer product terms.
- Curvature guard: `if ys <= 1e-10 { continue }`.
- Use `WolfeLineSearch`. If grad is nil, create a wrapper using `ForwardDiffGradient`.
