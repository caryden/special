# hager-zhang → Python

- `HagerZhangOptions` as a dataclass (or keyword arguments) with defaults matching the spec (delta=0.1, sigma=0.9, epsilon=1e-6, theta=0.5, gamma=0.66, rho=5.0).
- Inner helpers `eval_phi` and `eval_dphi` can be closures or nested functions capturing `x`, `d`, and the call counters via `nonlocal`.
- `satisfies_conditions` checks curvature first, then standard Wolfe, then approximate Wolfe — preserve this short-circuit order.
- `eps_k = epsilon * abs(phi0)` — watch for `phi0 == 0` edge case (eps_k becomes 0, approximate Wolfe effectively disabled).
- Secant denominator guard: use `abs(denom) > 1e-30` before dividing; fall back to theta-bisection.
- Clamp secant step to interior of bracket with `margin = 1e-14 * width`.
- Return `LineSearchResult(gradient=g_new, ...)` from whichever phase terminates.
- Use `numpy.dot` for dot product and `x + alpha * d` with numpy broadcasting for `addScaled`.
- Bracket expansion loop multiplies `c *= rho` each iteration; track `c_prev`, `phi_prev`, `dphi_prev` for bracket endpoints.
