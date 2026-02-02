# hager-zhang → Go

- `HagerZhangOptions` → struct with fields `Delta, Sigma, Epsilon, Theta, Gamma, Rho float64` and `MaxBracketIter, MaxSecantIter int`. Use a `DefaultHagerZhangOptions()` constructor for defaults.
- No closures with mutable capture — pass `functionCalls` and `gradientCalls` as `*int` pointers, or accumulate in local variables and assign to the result at the end.
- `evalPhi` and `evalDphi` as local helper functions or inline the logic directly.
- Secant denominator: `if math.Abs(denom) > 1e-30` before division.
- Clamp secant step: `cj = math.Max(aj+margin, math.Min(cj, bj-margin))`.
- Return `LineSearchResult{Alpha: c, FNew: phiC, GNew: gNewC, FunctionCalls: functionCalls, GradientCalls: gradientCalls, Success: true}`.
- Use `Dot(d, gx)` and `AddScaled(x, d, alpha)` from vec-ops.
- Go has no ternary operator — use explicit `if/else` for the bracket endpoint assignments (`aj = cPrev; bj = c` etc.).
