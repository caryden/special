# krylov-trust-region — Spec

Depends on: `vec-ops`, `result-types`, `finite-diff`, `finite-hessian`

## Purpose

Krylov Trust Region: a Newton-type optimizer that uses only Hessian-vector
products (never the full Hessian). The trust region subproblem is solved
approximately via the Steihaug-Toint truncated conjugate gradient method.

Suitable for large-scale problems where storing the full n×n Hessian is
impractical. The per-iteration cost is O(n) times the number of CG iterations
(at most n), compared to O(n^3) for dense Newton methods.

Handles negative curvature by moving to the trust region boundary, ensuring
the step achieves at least Cauchy-point decrease.

## Types

### KrylovTrustRegionOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `initialRadius` | number | 1.0 | Initial trust region radius |
| `maxRadius` | number | 100.0 | Maximum trust region radius |
| `eta` | number | 0.1 | Step acceptance threshold (rho > eta) |
| `rhoLower` | number | 0.25 | Below this rho, shrink radius |
| `rhoUpper` | number | 0.75 | Above this rho, expand radius (if on boundary) |
| `cgTol` | number | 0.01 | Inner CG relative tolerance |

Plus all fields from `OptimizeOptions`.

## Functions

### `krylovTrustRegion(f, x0, grad?, options?) → OptimizeResult`

Main entry point.

**Parameters:**
- `f: (x: number[]) => number` — objective function
- `x0: number[]` — starting point
- `grad?: (x: number[]) => number[]` — gradient function (optional; finite diff if omitted)
- `options?: KrylovTrustRegionOptions` — trust region parameters

**Returns:** `OptimizeResult` with standard convergence checking.

**Algorithm:**
1. Evaluate f(x0), grad(x0). Check initial convergence.
2. For each iteration:
   a. Solve TR subproblem via Steihaug-Toint CG → step s, model decrease m(s)
   b. Evaluate f(x + s)
   c. Compute rho = (f(x) - f(x+s)) / (-m(s))
   d. Update radius: shrink if rho < rhoLower, expand if rho > rhoUpper and on boundary
   e. Accept step if rho > eta; check convergence
   f. Reject step if rho ≤ eta; check if radius too small
3. Return result

### `steihaugCG(grad, x, gx, radius, cgTol) → { s, mDecrease, cgIters, onBoundary, gradCalls }`

Steihaug-Toint truncated CG subproblem solver.

**Solves:** minimize g^T s + 0.5 s^T H s subject to ||s|| ≤ radius

Uses Hessian-vector products H*v via `hessianVectorProduct(grad, x, v, gx)`.

**Termination conditions:**
1. Negative curvature: d^T H d < 0 → move to TR boundary
2. Step exceeds radius: ||z + alpha*d|| ≥ radius → move to boundary
3. Near-zero curvature: |d^T H d| < 1e-15 → stop
4. CG converged: ||r||²/||r_0||² < cgTol² → interior convergence
5. Max n CG iterations → stop

## Trust region radius update

| Condition | Action |
|-----------|--------|
| rho < 0.25 | radius *= 0.25 (shrink 4x) |
| rho > 0.75 and on boundary | radius = min(2 * radius, maxRadius) |
| rho > 0.75 and interior | no change (Newton step fits) |
| 0.25 ≤ rho ≤ 0.75 | no change |
| rho > 0.1 | accept step |
| rho ≤ 0.1 | reject step |

## Test vectors

### Sphere

```
f(x) = x[0]^2 + x[1]^2, x0 = [5, 5]
→ converged = true, fun ≈ 0, x ≈ [0, 0]
```

### Rosenbrock

```
f = rosenbrock, x0 = [-1.2, 1.0]
→ converged = true, fun < 1e-6, x ≈ [1, 1]
```

### Booth

```
f = booth, x0 = [0, 0]
→ converged = true, x ≈ [1, 3]
```

### Negative curvature (concave function)

```
f(x) = -x[0]^2 - x[1]^2, x0 = [0.1, 0.1]
→ does not crash, makes progress (f decreases)
```

### Steihaug-CG boundary hit

```
x = [100, 100], radius = 1.0
→ onBoundary = true, ||s|| ≈ 1.0
```

## Provenance

- Steihaug (1983), "The conjugate gradient method and trust regions in large scale optimization", SIAM J. Numer. Anal. 20(3)
- Optim.jl `KrylovTrustRegion()` — same defaults (initialRadius=1, maxRadius=100, eta=0.1, rhoLower=0.25, rhoUpper=0.75, cgTol=0.01)
- Nocedal & Wright, *Numerical Optimization*, Algorithm 7.1 (Steihaug-Toint) and Chapter 7 (trust region methods)
- Hessian-vector product via finite differences: H*v ≈ (grad(x + h*v) - grad(x)) / h
