# fminbox → Python

- `FminboxOptions` as a dataclass with `lower: list[float] | None`, `upper: list[float] | None`, `method: str = "l-bfgs"`, `mu0: float | None = None`, `mu_factor: float = 0.001`, `outer_iterations: int = 20`, `outer_grad_tol: float = 1e-8`.
- Default bounds: `[-math.inf]*n` / `[math.inf]*n`.
- `barrier_value`, `barrier_gradient`, `projected_gradient_norm` as standalone functions.
- Barrier value: guard `if dx <= 0: return math.inf`. Use `math.isfinite()` to skip infinite bounds.
- Initial mu: L1 norm ratio `mu = mu_factor * sum(|g_obj|) / sum(|g_bar|)`.
- Inner solver dispatch: dict mapping `{"bfgs": bfgs, "l-bfgs": lbfgs, ...}`. Call with barrier-augmented `f` and `grad`.
- Clamp after each inner solve: `x[i] = max(lower[i] + 1e-15, min(upper[i] - 1e-15, x[i]))`.
- Nudge logic for initial point: handle all 6 cases (on-lower, on-upper, below-lower, above-upper, semi-infinite).
