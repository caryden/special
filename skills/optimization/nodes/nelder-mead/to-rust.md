# nelder-mead → Rust

- Simplex: `Vec<Vec<f64>>`, f_values: `Vec<f64>`.
- Sort indices: create `indices: Vec<usize>`, sort by f_values, then reorder.
- Standard deviation uses **population variance** (divide by n+1, not n): `(f_values.iter().map(|&fv| (fv - mean).powi(2)).sum::<f64>() / (n + 1) as f64).sqrt()`.
- `NelderMeadOptions` → struct that embeds `OptimizeOptions` (composition, not inheritance).
- Return `OptimizeResult { gradient: None, gradient_calls: 0, ... }`.
- `create_initial_simplex` → private helper function.
