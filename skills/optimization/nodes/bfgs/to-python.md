# bfgs → Python

- Inverse Hessian H: `list[list[float]]` (n×n row-major). Initialize as identity: `[[1 if i==j else 0 for j in range(n)] for i in range(n)]`.
- `mat_vec_mul(M, v)` → `[sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]`.
- BFGS update formula: implement `bfgs_update(H, s, y, rho)` as a helper. Uses outer products — can be done with nested loops.
- Curvature guard: `if ys <= 1e-10: continue` (skip update, don't crash).
- Use **Wolfe** line search (not backtracking) — required for positive-definite H updates.
