# line-search → Python

- Return a `LineSearchResult` dataclass.
- `dot` from your vec-ops module (not numpy).
- Backtracking: simple while loop with `alpha *= rho`.
- Wolfe: implement the bracket-and-zoom. The `zoom` function can be a nested function or module-level helper.
- `g_new` field: `list[float] | None`.
