# test-functions → Rust

- Define a `TestFunction` struct with `name: &'static str`, `dimensions: usize`, `f: fn(&[f64]) -> f64`, `gradient: fn(&[f64]) -> Vec<f64>`, `minimum_at: Vec<f64>`, `minimum_value: f64`, `starting_point: Vec<f64>`.
- Implement each as a `pub fn sphere() -> TestFunction` factory or `pub const`/`lazy_static`.
- Prefer factory functions since closures can't be `const`.
- Himmelblau minima → `pub fn himmelblau_minima() -> Vec<[f64; 2]>`.
- Goldstein-Price formula is long — use intermediate variables for readability.
