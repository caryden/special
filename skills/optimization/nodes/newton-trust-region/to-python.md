# newton-trust-region → Python

- `TrustRegionOptions` as a dataclass extending `OptimizeOptions`; fields `initial_delta=1.0`, `max_delta=100.0`, `eta=0.1`.
- `dogleg_step(g, H, delta)` as a standalone function returning `list[float]`.
- Cholesky solve reusable from `newton` node; returns `None` if not PD, triggering Cauchy fallback.
- Matrix-vector product: `[sum(H[i][j]*v[j] for j in range(n)) for i in range(n)]`.
- Euclidean norm: `math.sqrt(sum(xi*xi for xi in v))` — distinct from infinity-norm used for convergence.
- Dogleg quadratic: `disc = b*b - 4*a*c`; clamp tau to `[0, 1]` with `max(0, min(1, tau))`.
- Predicted reduction: `-(dot(g, p) + 0.5 * dot(p, Hp))` — note the negation.
- Trust region shrinks on rejection; stop when `delta < 1e-15`.
- Return `OptimizeResult(gradient=gx[:], gradient_calls=gradient_calls, ...)`.
