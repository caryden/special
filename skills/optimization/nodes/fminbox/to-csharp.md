# fminbox → C#

- `double.NegativeInfinity` and `double.PositiveInfinity` for infinite bounds.
- Check infinite bounds with `double.IsNegativeInfinity()` / `double.IsPositiveInfinity()`.
- `Math.Log(x)` for barrier computation. Returns `-Infinity` for `x <= 0`.
- The log-barrier method approaches but doesn't precisely reach boundary solutions. Tests should NOT assert `converged == true` for boundary-active cases.
- Inner optimizer dispatch: use a `switch` expression on the `FminboxMethod` enum/string.
