# simulated-annealing — Spec

Depends on: `vec-ops`, `result-types`

## Purpose

Simulated Annealing: a derivative-free stochastic global optimizer based on the
Metropolis criterion. Unlike gradient-based methods, SA can escape local minima
by accepting worse solutions with decreasing probability as the "temperature"
drops.

Completely derivative-free — uses only function evaluations. Suitable for
non-smooth, non-convex, or black-box objective functions where gradients are
unavailable.

## Types

### SimulatedAnnealingOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `temperature` | (k: number) => number | `logTemperature` | Cooling schedule: maps iteration to temperature |
| `neighbor` | (x: number[], rng: () => number) => number[] | `gaussianNeighbor` | Generates neighbor proposal |
| `seed` | number | undefined | Random seed for reproducibility |

Plus all fields from `OptimizeOptions` (only `maxIterations` is used).

## Functions

### `simulatedAnnealing(f, x0, options?) → OptimizeResult`

Main entry point.

**Parameters:**
- `f: (x: number[]) => number` — objective function
- `x0: number[]` — starting point
- `options?: SimulatedAnnealingOptions` — cooling, neighbor, seed

**Returns:** `OptimizeResult` with:
- `x` — best-ever solution found (not current chain position)
- `converged` — always `true` (SA has no convergence criterion; it runs for `maxIterations`)
- `gradient` — empty array `[]` (no gradient computed)
- `gradientCalls` — always `0`

**Algorithm:**
1. Initialize: x_current = x_best = x0, f_current = f_best = f(x0)
2. For k = 1 to maxIterations:
   a. Compute temperature: T = temperature(k)
   b. Generate proposal: x_proposal = neighbor(x_current, rng)
   c. If f(x_proposal) ≤ f_current: accept (update x_current; update x_best if strictly better)
   d. Else: accept with probability exp(-(f_proposal - f_current) / T)
3. Return x_best, f_best

### `logTemperature(k) → number`

Default cooling schedule: `T(k) = 1 / ln(k)`. Returns Infinity at k=1
(accepts everything initially), then decays slowly.

### `gaussianNeighbor(x, rng) → number[]`

Default neighbor generator: adds N(0,1) noise to each coordinate.

### `mulberry32(seed) → () => number`

Seeded PRNG returning values in [0, 1). Used for reproducible results.

## Test vectors

### Sphere (seed=42, maxIterations=10000)

```
f(x) = x[0]^2 + x[1]^2, x0 = [5, 5]
→ fun < 1, functionCalls = 10001
```

### Rastrigin (seed=42, maxIterations=50000)

```
f(x) = 10*n + sum(x_i^2 - 10*cos(2*pi*x_i)), x0 = [3, 3]
→ fun < 5 (near global minimum at origin)
```

### Deterministic with same seed

```
seed=99, maxIterations=100
→ two runs produce identical x and fun
```

### Keep-best behavior

```
constantTemperature = 1000, x0 = [0, 0] (at optimum)
→ fun ≈ 0 (best stays at origin even though chain wanders)
```

## Provenance

- Kirkpatrick, Gelatt & Vecchi (1983), "Optimization by Simulated Annealing", Science
- Optim.jl `SimulatedAnnealing()` — logarithmic cooling, Gaussian neighbors, keep_best=true
- Default `log_temperature(t) = 1/log(t)` matches Optim.jl exactly
- Default `default_neighbor!` adds `randn()` per coordinate, matching Optim.jl
- `mulberry32` PRNG: public domain by Tommy Ettinger
- Box-Muller transform for normal samples from uniform PRNG
