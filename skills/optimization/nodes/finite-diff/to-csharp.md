# finite-diff → C#

- **Critical:** C# `double.Epsilon` is `~5e-324` (smallest positive subnormal), NOT IEEE machine epsilon `~2.22e-16`. Define machine epsilon explicitly: `const double MachineEpsilon = 2.220446049250313e-16;`
- Forward step: `h = Math.Sqrt(MachineEpsilon) * Math.Max(Math.Abs(x[i]), 1.0)`
- Central step: `h = Math.Cbrt(MachineEpsilon) * Math.Max(Math.Abs(x[i]), 1.0)` (requires .NET 8+ for `Math.Cbrt`; on older versions use `Math.Pow(MachineEpsilon, 1.0/3.0)`)
- Use `double[]` for vectors, clone with `(double[])x.Clone()` before perturbation.
- `MakeGradient` → returns `Func<double[], double[]>`.
- xUnit `Assert.Equal(expected, actual, precision)` with an `int` precision rounds to N decimal places — this is stricter than a tolerance check. For finite-diff comparisons, use `Assert.True(Math.Abs(expected - actual) < tol)` instead.
