# nelder-mead → Python

- Simplex as `list[list[float]]`, f_values as `list[float]`.
- Sort using `sorted(range(n+1), key=lambda i: f_values[i])` then reorder both lists.
- Standard deviation: `(sum((fv - mean)**2 for fv in f_values) / (n+1)) ** 0.5`.
- NelderMeadOptions can extend OptimizeOptions via dataclass inheritance or just use keyword arguments.
- Return `OptimizeResult(gradient=None, gradient_calls=0, ...)`.
