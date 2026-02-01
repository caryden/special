# vec-ops → Python

- Use `list[float]` for vectors. No numpy dependency.
- Standard `math.sqrt` for norm.
- List comprehensions or explicit loops are fine. Prefer clarity over cleverness.
- `clone` → `v.copy()` or `v[:]`
- `zeros` → `[0.0] * n`
