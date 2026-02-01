# result-types → Go

- `OptimizeOptions` → exported struct with exported fields: `GradTol`, `StepTol`, `FuncTol`, `MaxIterations`.
- `OptimizeResult` → exported struct. `Gradient` is `[]float64` (nil for no gradient).
- `ConvergenceReason` → interface with unexported marker method, or a struct with `Kind string` plus optional fields. Prefer the struct approach for simplicity.
- `DefaultOptions()` → returns `OptimizeOptions` with defaults, accepts functional options or just use struct literal with zero-value detection.
- `CheckConvergence()` → returns `*ConvergenceReason` (nil if no criterion met).
