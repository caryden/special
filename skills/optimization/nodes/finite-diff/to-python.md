# finite-diff → Python

- `sys.float_info.epsilon` for machine epsilon.
- `h = math.sqrt(eps) * max(abs(x[i]), 1.0)` for forward diff.
- `h = eps ** (1/3) * max(abs(x[i]), 1.0)` for central diff.
- Modify x in-place for each component (restore after), or use list copies. Copies are safer and match the purity convention.
- `make_gradient(f, method="forward")` → returns a closure.
