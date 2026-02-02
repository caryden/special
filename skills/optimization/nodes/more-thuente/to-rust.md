# more-thuente → Rust

- `MoreThuenteOptions` → struct with `f_tol: f64`, `gtol: f64`, `x_tol: f64`, `alpha_min: f64`, `alpha_max: f64`, `max_fev: usize`. Defaults via `Default` trait.
- `CstepResult` → struct with `stx_val, stx_f, stx_dg, sty_val, sty_f, sty_dg, alpha: f64`, `bracketed: bool`, `info: u8`.
- `cstep` is a pure function — no closures or state needed. Export it for direct testing of the four interpolation cases.
- Cubic gamma uses `(alpha < stx)` or `(alpha > stx)` to determine sign; use `.max(0.0)` before `.sqrt()` for the discriminant in case 3.
- `sgnd = dg * (dgx / dgx.abs())` — equivalent to `dg.copysign(dgx)` but keep the explicit form to match the reference.
- Stage 1 modified function: compute `fm = f_alpha - alpha * dgtest` etc. before calling cstep; restore by adding back `dgtest` terms after.
- Non-finite check: `!f_alpha.is_finite() || !dg_alpha.is_finite()` — halve alpha and set `stx = 0.875 * alpha`.
- Use `f64::min` and `f64::max` for clamping alpha to `[alpha_min, alpha_max]` and safeguarding the cstep output.
- Return `LineSearchResult { success: info == 1, .. }`.
