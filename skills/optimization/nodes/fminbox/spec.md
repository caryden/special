# fminbox — Spec

Depends on: `vec-ops`, `result-types`, at least one of: `bfgs`, `l-bfgs`, `conjugate-gradient`, `gradient-descent`

## Purpose

Box-constrained optimization via **logarithmic barrier method**. Converts the problem:

    minimize f(x) subject to lower <= x <= upper

into a sequence of unconstrained subproblems:

    minimize f(x) + mu * B(x)

where `B(x) = sum(-log(x_i - l_i) - log(u_i - x_i))` is the log-barrier. The barrier
multiplier `mu` is aggressively reduced each outer iteration (by `muFactor`, default
0.001), driving the barrier contribution toward zero while keeping iterates strictly
interior.

Convergence is checked using the **projected gradient norm**, which zeros out gradient
components that point outside the feasible region at boundaries. This correctly
identifies constrained optima where the gradient is nonzero.

## Types

### FminboxMethod

```typescript
type FminboxMethod = "bfgs" | "l-bfgs" | "conjugate-gradient" | "gradient-descent";
```

### FminboxOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `lower` | number[] | all -Infinity | Lower bounds for each variable |
| `upper` | number[] | all +Infinity | Upper bounds for each variable |
| `method` | FminboxMethod | "l-bfgs" | Inner unconstrained optimizer |
| `mu0` | number | auto | Initial barrier multiplier |
| `muFactor` | number | 0.001 | Barrier reduction factor per outer iteration |
| `outerIterations` | number | 20 | Maximum outer (barrier) iterations |
| `outerGradTol` | number | 1e-8 | Projected gradient norm tolerance |

Plus all fields from `OptimizeOptions` (passed to the inner optimizer).

## Functions

### `fminbox(f, x0, grad, options?) → OptimizeResult`

Main entry point for box-constrained optimization.

**Parameters:**
- `f: (x: number[]) => number` — objective function
- `x0: number[]` — starting point (nudged to interior if on/outside boundary)
- `grad: (x: number[]) => number[]` — gradient function (required)
- `options?: FminboxOptions` — bounds, method, and barrier parameters

**Returns:** `OptimizeResult` with:
- `x` — constrained minimizer (always strictly inside bounds)
- `converged` — true if projected gradient norm ≤ `outerGradTol`
- `iterations` — number of outer (barrier) iterations
- `functionCalls`, `gradientCalls` — cumulative across all inner solves

**Algorithm:**
1. Validate bounds (lower < upper for all dimensions)
2. Nudge `x0` to strict interior if on or outside boundary
3. Compute initial `mu` from gradient ratio: `mu = muFactor * ||grad_f||_1 / ||grad_B||_1`
4. For each outer iteration:
   a. Create barrier-augmented objective: `f(x) + mu * B(x)`
   b. Run inner optimizer to convergence on augmented problem
   c. Clamp result to strict interior (numerical safety)
   d. Check projected gradient norm of original objective
   e. Reduce mu: `mu *= muFactor`
5. Return result with convergence status

### `barrierValue(x, lower, upper) → number`

Compute `sum(-log(x_i - l_i) - log(u_i - x_i))`. Returns Infinity if x is outside
the box. Infinite bounds contribute zero.

### `barrierGradient(x, lower, upper) → number[]`

Compute barrier gradient: component i is `-1/(x_i - l_i) + 1/(u_i - x_i)`.
Infinite bounds contribute zero gradient.

### `projectedGradientNorm(x, g, lower, upper) → number`

Infinity norm of the projected gradient: `x - clamp(x - g, lower, upper)`.
At interior points this equals `g`. At boundaries, components pointing
outside the feasible region are zeroed.

## Initial point handling

| Condition | Action |
|-----------|--------|
| x_i exactly on lower bound | Nudge to `0.99 * l_i + 0.01 * u_i` |
| x_i exactly on upper bound | Nudge to `0.01 * l_i + 0.99 * u_i` |
| x_i below lower, both finite | Same as on-lower formula |
| x_i above upper, both finite | Same as on-upper formula |
| x_i below lower, upper=Inf | Set to `l_i + 1.0` |
| x_i above upper, lower=-Inf | Set to `u_i - 1.0` |

## Infinite bounds

Infinite bounds are fully supported:
- `-Infinity` lower: no lower barrier term (value=0, gradient=0)
- `+Infinity` upper: no upper barrier term (value=0, gradient=0)
- Both infinite: effectively unconstrained (barrier contributes nothing)

## Test vectors

### Interior minimum (sphere)

```
f(x) = x[0]^2 + x[1]^2
grad(x) = [2*x[0], 2*x[1]]
x0 = [1, 1], lower = [-5, -5], upper = [5, 5]
→ x ≈ [0, 0], f ≈ 0 (converged)
```

### Boundary minimum (sphere, lower bound active)

```
f(x) = x[0]^2
x0 = [5], lower = [2], upper = [10]
→ x ≈ [2], f ≈ 4
```

### Bound-constrained Rosenbrock

```
f = rosenbrock, x0 = [2, 2]
lower = [1.5, 1.5], upper = [3, 3]
→ x[0] ≈ 1.5, x[1] ≈ x[0]^2 = 2.25
```

### Invalid bounds

```
lower = [5], upper = [2]
→ converged = false, message contains "Invalid bounds"
```

### Barrier value

```
barrierValue([2], [0], [4]) = -2 * log(2) ≈ -1.3863
barrierValue([0], [0], [4]) = Infinity
barrierValue([5], [-Infinity], [Infinity]) = 0
```

### Projected gradient norm

```
projectedGradientNorm([0], [1], [0], [10]) = 0
  (at lower bound, gradient pointing outward is zeroed)
projectedGradientNorm([2, 3], [0.5, -0.3], [0, 0], [10, 10]) = 0.5
  (interior point, equals infinity norm of gradient)
```

## Provenance

- Optim.jl `Fminbox()` — logarithmic barrier with mu reduction, projected gradient convergence
- Nocedal & Wright, *Numerical Optimization*, Chapter 19 (barrier methods)
- Default `muFactor = 0.001` matches Optim.jl `mufactor`
- Default inner solver is L-BFGS (matches Optim.jl default)
- Auto-mu calculation from L1 gradient ratio matches Optim.jl `initial_mu`
