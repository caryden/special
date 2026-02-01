# gradient-descent → Python

- `grad` parameter: `Callable[[list[float]], list[float]] | None`. If None, use `forward_diff_gradient`.
- Main loop: `for iteration in range(1, max_iterations + 1)`.
- Direction `d = negate(gx)` — use your vec-ops, not list comprehension.
- Line search failure → return immediately with `converged=False`.
