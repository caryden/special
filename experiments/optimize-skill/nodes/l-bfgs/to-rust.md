# l-bfgs → Rust

- History: `Vec<Vec<f64>>` for s and y, `Vec<f64>` for rho.
- Circular buffer: `if s_history.len() >= memory { s_history.remove(0); }` (or use `VecDeque`).
- `two_loop_recursion` → private function taking `&[Vec<f64>]` slices for history.
- `LbfgsOptions` → struct with `memory: usize` plus `OptimizeOptions` fields. Default memory = 10.
- Two-loop uses reverse iteration: `for i in (0..s_history.len()).rev()`.
