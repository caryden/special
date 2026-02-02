# brent-1d → Python

- `Brent1dOptions` and `Brent1dResult` as dataclasses or plain keyword dicts.
- Golden ratio constant: `GOLDEN = (3 - math.sqrt(5)) / 2`.
- Default tolerance: `math.sqrt(sys.float_info.epsilon)` (≈ 1.49e-8).
- Swap endpoints with `if a > b: a, b = b, a`.
- Track `function_calls` via a mutable counter (e.g., `nonlocal` in a nested `eval_f`, or a list `[0]`).
- Parabolic interpolation branch: be careful with sign of `denom` — negate `p` when `denom > 0`, else negate `denom`.
- Return result as a dataclass with `converged`, `message`, `x`, `fun`, `iterations`, `function_calls`.
