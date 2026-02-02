# ip-newton → Python

- `ConstraintDef` as a dataclass with fields `c: Callable`, `jacobian: Callable`, `lower: list[float]`, `upper: list[float]`.
- `IPNewtonOptions` as a dataclass extending or composing `OptimizeOptions`; box bounds as `numpy.ndarray` defaulting to `[-inf]*n` / `[+inf]*n`.
- Classify constraints into `box_ineq`, `box_eq`, `con_ineq`, `con_eq` lists of `(idx, bound, sigma)` or `(idx, target)` named tuples.
- `cholesky_solve`: use `numpy.linalg.cholesky` + forward/back substitution, or `scipy.linalg.cho_factor`/`cho_solve`. Catch `LinAlgError` for the `robust_solve` diagonal modification fallback.
- `mat_t_diag_mat(A, d)` → `A.T @ np.diag(d) @ A` or the explicit triple-loop (exploit symmetry: fill upper triangle, mirror).
- Mehrotra update: `sigma = (mu_affine / mu_current)**3`; floor at `mu_current / 10`.
- Merit function: `f(x) + penalty * sum(|eq_res|) - mu * sum(log(s))` — use `np.log` and guard `s > 0`.
- Fraction-to-boundary with `tau=0.995`: vectorized as `alpha = min(1, min(-tau*vals[mask] / dvals[mask]))` where `mask = dvals < -1e-20`.
- Initial point nudging: handle all four cases (box equality, both finite, lower only, upper only).
- Separate primal/dual step sizes: `alpha_p` from backtracking on merit, `alpha_d` from fraction-to-boundary on lambdas.
