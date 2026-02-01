# finite-diff → Rust

- `f64::EPSILON` for machine epsilon.
- Take `f: &dyn Fn(&[f64]) -> f64` and `x: &[f64]`.
- Create a mutable copy of x, perturb each component, compute, restore. Or clone for each component.
- `make_gradient` → returns `Box<dyn Fn(&[f64]) -> Vec<f64>>` or use an enum/trait approach.
- Prefer the closure-returning approach for API simplicity.
