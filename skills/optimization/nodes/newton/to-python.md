# newton → Python

- `NewtonOptions` as a dataclass (or keyword arguments) extending `OptimizeOptions`; fields `initial_tau=1e-8`, `tau_factor=10`, `max_regularize=20`.
- Hessian `H` as `list[list[float]]`; Cholesky factor `L` as the same.
- Implement `cholesky_solve(A, b)` returning `Optional[list[float]]` — return `None` when a diagonal entry is non-positive.
- Regularization loop: copy H, add `tau` to diagonal with `H_reg[i][i] += tau`, multiply `tau *= tau_factor`.
- Use `grad or (lambda x: forward_diff_gradient(f, x))` for optional gradient/Hessian defaulting.
- `neg_g = [-gi for gi in gx]` to form the RHS of the Newton system.
- Return `OptimizeResult(gradient=gx[:], gradient_calls=gradient_calls, ...)`.
- Convergence checks mirror TypeScript: `max(abs(gi) for gi in gx) <= grad_tol` for infinity-norm.
