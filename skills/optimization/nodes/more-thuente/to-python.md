# more-thuente → Python

- `MoreThuenteOptions` as a dataclass with `f_tol=1e-4`, `gtol=0.9`, `x_tol=1e-8`, `alpha_min=1e-16`, `alpha_max=65536.0`, `max_fev=100`.
- `cstep` as a standalone function returning a named tuple or dataclass `CstepResult(stx_val, stx_f, stx_dg, sty_val, sty_f, sty_dg, alpha, bracketed, info)`.
- Cubic interpolation uses `theta`, `s = max(|theta|, |dgx|, |dg|)`, `gamma = sign * s * sqrt((theta/s)^2 - (dgx/s)*(dg/s))`. The sign of `gamma` depends on whether `alpha < stx` or `alpha > stx` per case.
- Four cstep cases (higher value, opposite-sign derivatives, same-sign decreasing, same-sign non-decreasing) — match the case selection order exactly.
- Stage 1 (modified function): subtract `alpha * dgtest` from function values, subtract `dgtest` from derivatives; restore after cstep call.
- Non-finite initial evaluation: halve alpha up to 50 times; set `stx = 7/8 * alpha` after each halving.
- Six termination info codes: only code 1 means `success=True`.
- Forced bisection: `if abs(sty - stx) >= 2/3 * width1: alpha = stx + (sty - stx) / 2`.
- Return `LineSearchResult(alpha=alpha, f_new=f_alpha, g_new=g_alpha, function_calls=..., gradient_calls=..., success=(info==1))`.
