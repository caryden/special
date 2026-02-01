# line-search → Rust

- `LineSearchResult` → pub struct with `g_new: Option<Vec<f64>>`.
- Functions take `f: &dyn Fn(&[f64]) -> f64` and `grad: &dyn Fn(&[f64]) -> Vec<f64>`.
- `zoom` → private function. Rust doesn't have nested functions with captures, so pass all needed parameters explicitly.
- Use `f64::abs()` for absolute value in curvature condition check.
