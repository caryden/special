# conjugate-gradient → Python

- `ConjugateGradientOptions` as a dataclass extending or including `OptimizeOptions` fields, plus `eta: float = 0.4` and `restart_interval: int | None = None` (default to `n`).
- Direction `d` as `list[float]`. Update in-place: `d[i] = -gx[i] + beta * d[i]`.
- HZ beta formula: compute `yk = [gx[i] - g_old[i] for i in range(n)]`, then `d_dot_y = sum(d[i]*yk[i] ...)`.
- Eta guarantee: `eta_k = -1.0 / (d_norm * min(eta, g_norm))`. Use `beta = max(beta, eta_k)`.
- Restart when `d_dot_y` is near zero (`abs(d_dot_y) < 1e-30`) or at periodic intervals — set `beta = 0`.
- If no gradient is provided, fall back to `forward_diff_gradient(f, x)`.
- Depends on `hager_zhang_line_search` — pass `f`, `grad_fn`, `x`, `d`, `fx`, `gx`.
