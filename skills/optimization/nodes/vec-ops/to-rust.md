# vec-ops → Rust

- Use `Vec<f64>` for vectors. All functions take `&[f64]` slices as input and return `Vec<f64>`.
- `dot` and `norm_inf` return `f64`.
- Use `.iter().zip()` for element-wise operations.
- `clone` → `.to_vec()` on a slice.
- `zeros` → `vec![0.0; n]`
- Mark all functions `pub`.
