# simulated-annealing → Python

- `SimulatedAnnealingOptions` as a dataclass; fields `temperature: Callable[[int], float]`, `neighbor: Callable[[list[float], Callable[[], float]], list[float]]`, `seed: Optional[int]`.
- Default cooling: `def log_temperature(k): return 1.0 / math.log(k)`.
- Default neighbor: `[x[i] + box_muller_normal(rng) for i in range(len(x))]`.
- Box-Muller: `math.sqrt(-2*math.log(u1)) * math.cos(2*math.pi*u2)` — guard `u1 == 0` with a `while` loop.
- Seeded PRNG: port `mulberry32` as a closure, or use `random.Random(seed)` for simplicity (test vectors will differ).
- Metropolis acceptance: `math.exp(-(f_proposal - f_current) / t)` — compare against `rng()`.
- Always track best-ever (`x_best`, `f_best`) separately from chain position (`x_current`, `f_current`).
- Return `OptimizeResult(gradient=[], gradient_calls=0, converged=True, ...)`.
- `functionCalls = max_iterations + 1` (one initial eval plus one per iteration).
