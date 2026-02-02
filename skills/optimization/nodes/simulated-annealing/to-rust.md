# simulated-annealing → Rust

- `SimulatedAnnealingOptions` struct; `temperature: Option<fn(usize) -> f64>`, `neighbor: Option<fn(&[f64], &mut dyn FnMut() -> f64) -> Vec<f64>>`, `seed: Option<u32>`.
- `log_temperature(k: usize) -> f64` — cast `k` to `f64` for `ln()`: `1.0 / (k as f64).ln()`.
- `mulberry32(seed: u32) -> impl FnMut() -> f64` — use `Wrapping<u32>` or `u32::wrapping_add` for overflow semantics matching `(s + 0x6d2b79f5) | 0`.
- Box-Muller: `(-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()`.
- Metropolis: `(-(f_proposal - f_current) / t).exp()` — compare with `rng()`.
- Track `x_best: Vec<f64>` and `f_best: f64` separately; clone proposal into best on improvement.
- Return `OptimizeResult { gradient: None, gradient_calls: 0, converged: true, .. }` (or `gradient: Some(vec![])` to match TS empty-array convention).
- No convergence check — always runs full `max_iterations`.
