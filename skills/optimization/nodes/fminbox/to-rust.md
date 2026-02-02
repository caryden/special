# fminbox → Rust

- `FminboxMethod` → enum `{ Bfgs, LBfgs, ConjugateGradient, GradientDescent }`.
- `FminboxOptions` → struct with `lower: Option<Vec<f64>>`, `upper: Option<Vec<f64>>`, embedded `OptimizeOptions`, and barrier params.
- `barrier_value`, `barrier_gradient`, `projected_gradient_norm` → public helper functions.
- Use `f64::is_finite()` to check bounds; `f64::INFINITY` and `f64::NEG_INFINITY` for defaults.
- Barrier closures capture `lower`, `upper`, and current `mu` by reference. The inner solver takes `&dyn Fn(&[f64]) -> f64` for barrier-F and `&dyn Fn(&[f64]) -> Vec<f64>` for barrier-grad.
- Inner solver dispatch: `match method { ... }` calling `bfgs()`, `lbfgs()`, etc.
- Clamp after inner solve: `x[i] = x[i].max(lower[i] + 1e-15).min(upper[i] - 1e-15)` (only when bound is finite).
- Validate bounds upfront: return early with `converged: false` if `lower[i] >= upper[i]`.
