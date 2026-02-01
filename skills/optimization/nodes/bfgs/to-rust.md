# bfgs → Rust

- Inverse Hessian H: `Vec<Vec<f64>>` (n×n). Initialize with `identity_matrix(n)`.
- `mat_vec_mul` and `bfgs_update` → private helper functions.
- BFGS update involves outer products: `s[i] * y[j]` terms in nested loops.
- Curvature guard: `if ys <= 1e-10 { continue; }`.
- Use `wolfe_line_search` — take grad as `&dyn Fn(&[f64]) -> Vec<f64>`.
- If no gradient provided (`Option<...>` is None), wrap `forward_diff_gradient` in a closure.
