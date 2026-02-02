# krylov-trust-region → Python

- `KrylovTrustRegionOptions` as a dataclass with `initial_radius=1.0`, `max_radius=100.0`, `eta=0.1`, `rho_lower=0.25`, `rho_upper=0.75`, `cg_tol=0.01`.
- `steihaug_cg` as a standalone function returning a named tuple or dataclass `(s, m_decrease, cg_iters, on_boundary, grad_calls)`.
- Hessian-vector product via `hessian_vector_product(grad, x, v, gx)` — one gradient call per CG iteration.
- `boundary_tau`: solve quadratic `a*tau^2 + b*tau + c = 0` where `a = d@d`, `b = 2*z@d`, `c = z@z - radius^2`. Use `max(0, disc)` inside `sqrt`.
- `norm2` helper computes squared norm `v @ v` (no sqrt). The outer solver uses `sqrt(norm2(s))` to compare against `0.9 * radius`.
- Negative curvature check: `dHd < 0` triggers boundary step. Near-zero curvature `abs(dHd) < 1e-15` breaks early.
- CG convergence: `rho_next / rho0 < cg_tol**2`.
- Model decrease `m = g @ s + 0.5 * s @ (H @ s)` requires one extra Hessian-vector product after the CG loop.
- Trust region update: shrink `radius *= 0.25` when `rho < 0.25`; expand `radius = min(2*radius, max_radius)` when `rho > 0.75` and on boundary.
- Use `numpy` for all vector math; `np.dot` for inner products.
