# bfgs → C#

- BFGS Hessian update: use the expanded form (Nocedal & Wright Eq. 6.17) to avoid explicit matrix subtraction.
- Curvature guard: skip update when `ys <= 1e-10`.
- Identity matrix → `double[,]` or jagged `double[][]`. Jagged arrays are faster in C#.
- When no gradient is provided, fall back to `MakeGradient(f)` from the finite-diff node.
- Use `Func<double[], double>` for objective, `Func<double[], double[]>?` for optional gradient.
