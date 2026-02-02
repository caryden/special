# brent-1d → Rust

- `Brent1dOptions` → struct with `tol: f64` and `max_iter: usize`, with `Default` impl.
- `Brent1dResult` → struct with `x`, `fun`, `iterations`, `function_calls`, `converged`, `message: String`.
- Golden constant: `const GOLDEN: f64 = (3.0 - 2.23606797749979) / 2.0;` (precompute, or use `f64::sqrt` in a `lazy_static`).
- Default tol: `f64::EPSILON.sqrt()`.
- Take `f` as `&dyn Fn(f64) -> f64` or as a generic `F: Fn(f64) -> f64`.
- Swap endpoints: `if a > b { std::mem::swap(&mut a, &mut b); }`.
- The `eval_f` closure increments a `function_calls: usize` counter via `&mut`.
