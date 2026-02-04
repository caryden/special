# test-functions → C#

- Define a `TestFunction` class with `Name`, `Dimensions`, `F`, `Gradient`, `MinimumAt`, `MinimumValue`, `StartingPoint`.
- `F` and `Gradient` are `Func<double[], double>` and `Func<double[], double[]>`.
- Expose as static readonly properties or fields on a static class (e.g., `TestFunctions.Sphere`).
- Himmelblau minima → static readonly `double[][]`.
- Goldstein-Price: use intermediate variables for readability.
