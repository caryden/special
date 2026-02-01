# result-types → Rust

- `OptimizeOptions` → `pub struct` with `pub` fields and a `Default` impl.
- `OptimizeResult` → `pub struct` with `gradient: Option<Vec<f64>>`.
- `ConvergenceReason` → `pub enum` with variant data:
  ```rust
  pub enum ConvergenceReason {
      Gradient { grad_norm: f64 },
      Step { step_norm: f64 },
      Function { func_change: f64 },
      MaxIterations { iterations: usize },
      LineSearchFailed { message: String },
  }
  ```
- `is_converged` → `impl ConvergenceReason { pub fn is_converged(&self) -> bool }`
- `convergence_message` → `impl Display for ConvergenceReason` or a method.
