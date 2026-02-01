# test-functions → Python

- Each test function → a dataclass or named tuple with fields: `name`, `f`, `gradient`, `minimum_at`, `minimum_value`, `starting_point`.
- `f` and `gradient` are callables: `Callable[[list[float]], float]` and `Callable[[list[float]], list[float]]`.
- Use `math.cos`, `math.pi`, `math.exp` for Goldstein-Price.
- Himmelblau minima → module-level list of 4 coordinate pairs.
- Export as module-level constants: `sphere`, `booth`, `rosenbrock`, `beale`, `himmelblau`, `goldstein_price`.
