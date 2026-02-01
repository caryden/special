# gradient-descent → Rust

- `grad` parameter: `Option<&dyn Fn(&[f64]) -> Vec<f64>>`. If None, use `forward_diff_gradient`.
- Main loop: `for iteration in 1..=opts.max_iterations`.
- Use `negate(&gx)` from vec-ops for descent direction.
- Return `OptimizeResult` on line search failure with `converged: false`.
