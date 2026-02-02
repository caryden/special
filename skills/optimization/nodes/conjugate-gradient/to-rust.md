# conjugate-gradient → Rust

- `ConjugateGradientOptions` → struct embedding `OptimizeOptions` (composition), with `eta: f64` (default 0.4) and `restart_interval: Option<usize>` (default `n`).
- Take `grad` as `Option<&dyn Fn(&[f64]) -> Vec<f64>>`. If `None`, wrap `forward_diff_gradient` in a closure.
- Direction `d: Vec<f64>`. Update in-place with a loop: `d[i] = -gx[i] + beta * d[i]`.
- HZ beta: `yk: Vec<f64>` = element-wise subtraction. Guard `d_dot_y.abs() < 1e-30` triggers restart.
- Eta guarantee uses `f64::sqrt` for norms — compute `d_norm` and `g_norm` as L2 norms manually.
- Accumulate `function_calls` and `gradient_calls` from `hager_zhang_line_search` result.
- Return early if initial gradient norm is below tolerance.
