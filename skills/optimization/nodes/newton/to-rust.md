# newton → Rust

- `NewtonOptions` struct embedding `OptimizeOptions` (composition); fields `initial_tau: f64`, `tau_factor: f64`, `max_regularize: usize`.
- Hessian and Cholesky factor as `Vec<Vec<f64>>`. Clone when adding regularization.
- `cholesky_solve(a: &[Vec<f64>], b: &[f64]) -> Option<Vec<f64>>` — return `None` on non-positive diagonal.
- Gradient and Hessian parameters as `Option<&dyn Fn(&[f64]) -> Vec<f64>>` (or generic `F`); default to `forward_diff_gradient` / `finite_diff_hessian` via closure.
- `neg_g: Vec<f64> = gx.iter().map(|&g| -g).collect()`.
- Regularization: `h_reg[i][i] += tau;` on a cloned matrix each attempt.
- Return `OptimizeResult { gradient: Some(gx.clone()), gradient_calls, converged, .. }`.
- Use `f64::INFINITY` for initial step/func-change sentinels in the first convergence check.
