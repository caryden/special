# evaluator → Rust

- Pattern match on the `AstNode` enum variants
- Use `f64` for all numeric values
- `f64::powf()` for exponentiation
- Return `Result<f64, String>` for error propagation (division/modulo by zero)
- The `Box<AstNode>` children require dereferencing: `evaluate(&*left)`
  or `evaluate(left)` with auto-deref
- Check `right == 0.0` for division/modulo by zero (exact float comparison is
  intentional here — only literal zero triggers the error)
