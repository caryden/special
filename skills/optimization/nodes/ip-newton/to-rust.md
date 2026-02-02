# ip-newton → Rust

- `ConstraintDef` → struct with `c: Box<dyn Fn(&[f64]) -> Vec<f64>>`, `jacobian: Box<dyn Fn(&[f64]) -> Vec<Vec<f64>>>`, `lower: Vec<f64>`, `upper: Vec<f64>`.
- `IPNewtonOptions` → struct embedding `OptimizeOptions` (composition). Box bounds as `Option<Vec<f64>>` defaulting to `None` (meaning unbounded).
- `IneqEntry { idx: usize, bound: f64, sigma: f64 }` and `EqEntry { idx: usize, target: f64 }` for classified constraints.
- `cholesky_solve` → return `Option<Vec<f64>>`; return `None` when diagonal is non-positive. `robust_solve` adds `tau` to diagonal, doubling `tau *= 10` up to 25 attempts.
- Dense matrix helpers: `mat_t_vec`, `mat_t_diag_mat`, `mat_add` operate on `Vec<Vec<f64>>`. Exploit symmetry in `mat_t_diag_mat`.
- Fraction-to-boundary: iterate with `if dvals[i] < -1e-20 { alpha = alpha.min(-tau * vals[i] / dvals[i]) }`.
- Guard against NaN: `if !fx.is_finite() || x.iter().any(|v| !v.is_finite())` → return best point.
- Mehrotra barrier update: `sigma = (mu_aff / mu_current).powi(3)`; `mu = mu_next.min(mu_prev).max(1e-20)`.
- Return `OptimizeResult { gradient: Some(gx), ... }`.
