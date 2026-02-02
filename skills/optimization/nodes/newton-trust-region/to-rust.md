# newton-trust-region → Rust

- `TrustRegionOptions` struct embedding `OptimizeOptions`; fields `initial_delta: f64`, `max_delta: f64`, `eta: f64`.
- `dogleg_step(g: &[f64], h: &[Vec<f64>], delta: f64) -> Vec<f64>` as a private helper.
- Reuse `cholesky_solve` from `newton` node (or inline); returns `Option<Vec<f64>>`.
- `mat_vec_mul` and `vec_norm` (Euclidean) as small private functions on slices.
- `dot` via `g.iter().zip(p.iter()).map(|(a,b)| a*b).sum::<f64>()`.
- Dogleg discriminant: check `disc < 0.0 || a <= 0.0` and fall back to Cauchy point.
- Trial point: `x.iter().zip(p.iter()).map(|(xi,pi)| xi+pi).collect()`.
- Return `OptimizeResult { gradient: Some(gx.clone()), .. }`.
- Use `f64::min` / `f64::max` for delta clamping; `f64::INFINITY` not needed here.
