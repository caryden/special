# vec-ops → C#

- Use `double[]` for vectors.
- `clone` → `(double[])v.Clone()`
- `zeros` → `new double[n]` (default-initialized to 0.0)
- Standard `Math.Sqrt` for norm.
- Return new arrays from all operations (purity).
- Namespace: use a static class `VecOps` or a namespace-level class.
