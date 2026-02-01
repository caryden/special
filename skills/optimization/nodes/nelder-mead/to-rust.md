# nelder-mead → Rust

- Simplex: `Vec<Vec<f64>>`, f_values: `Vec<f64>`.
- Sort indices: create `indices: Vec<usize>`, sort by f_values, then reorder.
- `NelderMeadOptions` → struct that embeds `OptimizeOptions` (composition, not inheritance).
- Return `OptimizeResult { gradient: None, gradient_calls: 0, ... }`.
- `create_initial_simplex` → private helper function.
