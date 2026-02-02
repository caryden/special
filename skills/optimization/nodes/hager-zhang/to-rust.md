# hager-zhang → Rust

- `HagerZhangOptions` → struct with `Option<f64>` fields; resolve defaults with `.unwrap_or(0.1)` etc.
- Closures `eval_phi` and `eval_dphi` capture `&x`, `&d`, and `&mut function_calls` / `&mut gradient_calls`. Use `FnMut` for `f` and `grad` parameters.
- Return `LineSearchResult { alpha, f_new, g_new: Some(g), function_calls, gradient_calls, success }`.
- Secant denominator guard: `if denom.abs() > 1e-30 { ... } else { theta-bisection }`.
- Clamp with `cj.max(aj + margin).min(bj - margin)` for bracket interior.
- Bracket phase returns early via `return LineSearchResult { ... }` on success — no exceptions needed.
- `dot`, `add_scaled` from vec-ops; all vector operations on `Vec<f64>` or `&[f64]`.
- Two-phase structure (bracket then secant/bisect) maps naturally to two sequential loops with early returns.
