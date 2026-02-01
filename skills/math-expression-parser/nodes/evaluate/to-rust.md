# evaluate → Rust

- Name the function `calc(expression: &str) -> Result<f64, String>`
- `expression.trim().is_empty()` to check for empty input
- Use `?` operator to propagate errors from tokenize/parse/evaluate
- This is a thin wrapper — all logic is in the dependencies
- Consider making this the only `pub` function if building as a library module
