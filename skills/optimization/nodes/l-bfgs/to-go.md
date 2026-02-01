# l-bfgs → Go

- History: `[][]float64` for s and y, `[]float64` for rho.
- Circular buffer: trim front when length exceeds memory.
- `twoLoopRecursion` → unexported function.
- `LbfgsOptions` → struct embedding `OptimizeOptions` plus `Memory int`. Default Memory = 10.
- Two-loop reverse iteration: `for i := len(sHistory) - 1; i >= 0; i--`.
