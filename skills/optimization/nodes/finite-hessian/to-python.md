# finite-hessian → Python

- Hessian as `list[list[float]]` (n×n row-major). Initialize: `[[0.0]*n for _ in range(n)]`.
- Step size constant: `FOURTH_ROOT_EPS = sys.float_info.epsilon ** 0.25` (≈ 1.22e-4).
- Per-dimension step: `h[i] = FOURTH_ROOT_EPS * max(abs(x[i]), 1.0)`.
- Diagonal: `H[i][i] = (f(x_plus) - 2*fx + f(x_minus)) / h[i]**2`.
- Off-diagonal: compute only upper triangle (`j in range(i+1, n)`), then mirror `H[j][i] = H[i][j]`.
- `hessian_vector_product(grad, x, v, gx)` → uses a single perturbed gradient eval. Step: `h = FOURTH_ROOT_EPS * max(v_norm, 1.0)`.
- Use `x[:]` (slice copy) for perturbation to avoid mutating the original.
