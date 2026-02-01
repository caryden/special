# result-types → Python

- Use `@dataclass` for `OptimizeOptions` and `OptimizeResult`.
- `ConvergenceReason` → tagged union via a string `kind` field on a dataclass, or use a base class with subclasses. Prefer the simple dataclass approach.
- `gradient` field: `list[float] | None`
- `default_options()` → returns `OptimizeOptions(...)` with defaults, merging any keyword overrides.
- `check_convergence()` → return `ConvergenceReason` or `None`.
- Use snake_case: `grad_tol`, `step_tol`, `func_tol`, `max_iterations`.
