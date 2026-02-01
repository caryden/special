# l-bfgs → Python

- History: three parallel lists `s_history`, `y_history`, `rho_history` (most recent at end).
- Circular buffer: `if len(s_history) >= memory: s_history.pop(0)` (or use `collections.deque(maxlen=memory)`).
- Two-loop recursion: implement exactly as in spec. Use a list `alphas` to store intermediate values.
- First iteration (empty history): `d = negate(gx)` (steepest descent).
- Initial Hessian scaling `gamma`: `gamma = ys / dot(yk, yk)`.
