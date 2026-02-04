# Optimization — Benchmark Workloads

Language-agnostic workload definitions for relative performance measurement.
These are **not** behavioral specs — they define what to time.

## Workloads

| Node | Workload | Iterations | Warmup | Correctness Check |
|------|----------|-----------|--------|-------------------|
| `nelder-mead` | Rosenbrock from [-1.2, 1.0] (derivative-free) | 1,000 | 100 | result.x ≈ [1, 1] within 0.01 |
| `minimize` | Rosenbrock via BFGS with analytic gradient, x0 = [-1.2, 1.0] | 1,000 | 100 | result.x ≈ [1, 1] within 1e-4 |
| `brent-1d` | Minimize `(x - 0.3)²` on [0, 1] | 10,000 | 1,000 | result.x ≈ 0.3 within 1e-8 |
| `simulated-annealing` | Sphere `x₁² + x₂²` from [5, 5], seed=42, maxIter=1000 | 100 | 10 | result.fun < 1.0 |

### nelder-mead

```
f(x) = 100 * (x[1] - x[0]²)² + (1 - x[0])²      # Rosenbrock
x0 = [-1.2, 1.0]
```

### minimize

```
f(x) = 100 * (x[1] - x[0]²)² + (1 - x[0])²      # Rosenbrock
grad(x) = [
  -400 * x[0] * (x[1] - x[0]²) - 2 * (1 - x[0]),
  200 * (x[1] - x[0]²)
]
x0 = [-1.2, 1.0]
method = "bfgs"
```

### brent-1d

```
f(x) = (x - 0.3)²
bracket = [0, 1]
```

### simulated-annealing

```
f(x) = x[0]² + x[1]²                              # Sphere
x0 = [5.0, 5.0]
seed = 42
maxIterations = 1000
```

## Output Format

Each benchmark script emits one NDJSON line per node:

```json
{"node":"minimize","language":"<lang>","iterations":1000,"warmup":100,"wall_clock_ms":{"min":0.0,"median":0.0,"p95":0.0,"max":0.0},"correctness":true}
```
