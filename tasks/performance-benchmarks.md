# Task: Performance Benchmarks

**Environment required:** Node.js (bun) + Python (scipy) on same machine
**Estimated scope:** Design benchmark suite, run measurements, document results
**Blocked by:** Not yet prioritized (user indicated "eventually")

## Context

The user expressed interest in performance benchmarks for comparison across libraries.
This task designs and runs a benchmark suite measuring our reference implementation
against scipy on equivalent problems.

Note: Our reference library prioritizes clarity over performance. Benchmarks serve to
document relative performance characteristics, not to optimize our implementation.

## Benchmark Dimensions

### 1. Iterations to convergence vs problem dimension

Scale Rosenbrock to n dimensions (n = 2, 5, 10, 20, 50, 100).
Compare iteration counts for BFGS and L-BFGS between our reference and scipy.

### 2. Wall-clock time per function evaluation

Measure time-per-iteration for each method on Rosenbrock-2D:
- Our BFGS vs scipy BFGS
- Our L-BFGS vs scipy L-BFGS-B
- Our Nelder-Mead vs scipy Nelder-Mead

### 3. Memory scaling (BFGS vs L-BFGS)

For n = 10, 50, 100, 500, 1000:
- Measure peak memory for BFGS (O(n^2) Hessian)
- Measure peak memory for L-BFGS with m=10 (O(mn))
- Document the crossover point where L-BFGS becomes necessary

### 4. Line search cost

Compare number of function evaluations per line search step:
- Backtracking (Armijo) vs Strong Wolfe
- Impact on total convergence

## Scripts

### n-dimensional Rosenbrock

```typescript
// Generalized Rosenbrock for benchmarking
function rosenbrock(x: number[]): number {
  let sum = 0;
  for (let i = 0; i < x.length - 1; i++) {
    sum += 100 * (x[i + 1] - x[i] * x[i]) ** 2 + (1 - x[i]) ** 2;
  }
  return sum;
}

function rosenbrockGradient(x: number[]): number[] {
  const g = new Array(x.length).fill(0);
  for (let i = 0; i < x.length - 1; i++) {
    g[i] += -400 * x[i] * (x[i + 1] - x[i] * x[i]) - 2 * (1 - x[i]);
    g[i + 1] += 200 * (x[i + 1] - x[i] * x[i]);
  }
  return g;
}
```

### Equivalent scipy benchmark

```python
import scipy.optimize as opt
import numpy as np
import time

def rosenbrock_nd(x):
    return sum(100*(x[i+1]-x[i]**2)**2 + (1-x[i])**2 for i in range(len(x)-1))

for n in [2, 5, 10, 20, 50, 100]:
    x0 = np.zeros(n)
    x0[0] = -1.2
    x0[1] = 1.0

    t0 = time.perf_counter()
    res = opt.minimize(rosenbrock_nd, x0, method='BFGS', jac='3-point')
    t1 = time.perf_counter()

    print(f"n={n}: {res.nit} iter, {t1-t0:.4f}s, converged={res.success}")
```

## Output Format

Results should be saved as `reference/optimize/benchmarks.json` with structure:

```json
{
  "dimensions_scaling": {
    "bfgs": {"2": {"ours": {...}, "scipy": {...}}, ...},
    "lbfgs": {"2": {"ours": {...}, "scipy": {...}}, ...}
  },
  "wall_clock": {...},
  "memory": {...},
  "line_search_cost": {...}
}
```

## Acceptance Criteria

- [ ] Iteration count comparison for n=2,5,10,20,50,100
- [ ] Wall-clock measurements documented
- [ ] Memory scaling documented for BFGS vs L-BFGS
- [ ] Results saved as JSON and summarized in markdown
