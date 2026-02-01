# minimize → Python

- Single `def minimize(f, x0, *, method=None, grad=None, **kwargs)` function.
- Method selection: `method = method or ("bfgs" if grad else "nelder-mead")`.
- Use a dictionary dispatch or if/elif chain. The if/elif is clearer for translation.
- Forward `**kwargs` to the algorithm as options (grad_tol, step_tol, etc.).
- Raise `ValueError` for unknown method strings.
