# result-types → C#

- Use `class` or `record` for `OptimizeOptions` and `OptimizeResult`. Records are concise but classes give more control over defaults.
- `ConvergenceReason` → `enum` for the `kind` field, paired with a `ConvergenceInfo` record/class carrying the `kind` and `value`.
- Nullable gradient: `double[]? Gradient`.
- `DefaultOptions()` → returns new instance with defaults, merging any overrides.
- Use PascalCase for public members: `GradTol`, `StepTol`, `FuncTol`, `MaxIterations`.
- `??` (null-coalescing) works on values but not on method groups — wrap in a lambda if needed.
