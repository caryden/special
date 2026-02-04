# line-search → C#

- Return a `LineSearchResult` record/class with `Alpha`, `FunctionValue`, `Gradient` (nullable).
- `Gradient` from Wolfe line search: `double[]?` — only returned when Wolfe conditions require gradient evaluation.
- Use `Func<double[], double>` for the objective, `Func<double[], double[]>` for gradient.
- Zoom subroutine: private/internal method. Use `while` loop with max iterations guard.
