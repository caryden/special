# minimize → Rust

- `Method` → `pub enum Method { NelderMead, GradientDescent, Bfgs, LBfgs }`.
- `MinimizeOptions` → struct with `method: Option<Method>`, `grad: Option<Box<dyn Fn(&[f64]) -> Vec<f64>>>`, plus `OptimizeOptions` fields.
- Method selection: `let method = options.method.unwrap_or(if grad.is_some() { Method::Bfgs } else { Method::NelderMead });`
- Match on method enum — Rust's exhaustive match provides compile-time safety.
