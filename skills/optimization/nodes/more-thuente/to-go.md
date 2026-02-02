# more-thuente → Go

- `MoreThuenteOptions` → struct with `FTol, GTol, XTol, AlphaMin, AlphaMax float64` and `MaxFev int`. Provide `DefaultMoreThuenteOptions()` for defaults.
- `CstepResult` → struct with exported fields `StxVal, StxF, StxDg, StyVal, StyF, StyDg, Alpha float64`, `Bracketed bool`, `Info int`.
- `Cstep` as an exported function for testability of the four interpolation cases.
- Cubic interpolation: `s := math.Max(math.Max(math.Abs(theta), math.Abs(dgx)), math.Abs(dg))` — Go has no variadic `max` for floats; chain `math.Max`.
- `sgnd := dg * (dgx / math.Abs(dgx))` to determine sign of derivative product.
- Stage 1 modified function values: compute modified `fm`, `fxm`, `fym`, `dgm`, `dgxm`, `dgym`; call `Cstep`; restore unmodified values via `result.StxF + result.StxVal*dgtest`.
- Non-finite initial evaluation: `math.IsInf(fAlpha, 0) || math.IsNaN(fAlpha)` — halve alpha, set `stx = 0.875 * alpha`.
- Forced bisection when `math.Abs(sty-stx) >= 2.0/3.0*width1`.
- Return `LineSearchResult{Alpha: alpha, FNew: fAlpha, GNew: gAlpha, FunctionCalls: functionCalls, GradientCalls: gradientCalls, Success: info == 1}`.
