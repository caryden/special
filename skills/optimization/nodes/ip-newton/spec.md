# ip-newton — Spec

Depends on: `vec-ops`, `result-types`, `finite-diff`, `finite-hessian`

## Purpose

General nonlinearly constrained optimization via **primal-dual interior-point Newton
method**. Solves:

    minimize    f(x)
    subject to  c_eq(x) = 0            (equality constraints)
                c_ineq(x) >= 0          (inequality constraints)
                lower <= x <= upper     (box constraints)

Uses a log-barrier formulation with Mehrotra predictor-corrector updates for the
barrier parameter mu. At each iteration, solves a **condensed KKT system** that
eliminates slack and dual variables via block elimination, then applies a Schur
complement for equality constraints. The resulting reduced system is solved using
Cholesky factorization with diagonal modification for indefiniteness.

Primal and dual variables use **separate step sizes**: the primal step is determined
by a backtracking line search on a merit function, while the dual step uses the full
fraction-to-boundary step.

## Types

### ConstraintDef

```typescript
interface ConstraintDef {
  c: (x: number[]) => number[];        // constraint values, length m
  jacobian: (x: number[]) => number[][]; // m x n Jacobian matrix
  lower: number[];                      // lower bounds on c(x)
  upper: number[];                      // upper bounds on c(x)
}
```

Constraints are classified based on bounds:
- **Equality**: `lower[i] === upper[i]` — constraint `c_i(x) = target`
- **Lower inequality**: finite `lower[i]`, `upper[i] = +Infinity` — constraint `c_i(x) >= lower[i]`
- **Upper inequality**: `lower[i] = -Infinity`, finite `upper[i]` — constraint `c_i(x) <= upper[i]`
- **Two-sided**: both finite, `lower[i] < upper[i]` — produces two inequality entries

Box constraints are similarly classified:
- **Box equality**: `lower[i] === upper[i]` — fixes variable
- **Box inequality**: finite bound generates `x_i - lower_i >= 0` or `upper_i - x_i >= 0`

### IPNewtonOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `lower` | number[] | all -Infinity | Box lower bounds on x |
| `upper` | number[] | all +Infinity | Box upper bounds on x |
| `constraints` | ConstraintDef | none | Nonlinear constraints |
| `mu0` | number | auto | Initial barrier parameter |
| `kktTol` | number | gradTol | KKT residual convergence tolerance |

Plus all fields from `OptimizeOptions`.

## Functions

### `ipNewton(f, x0, grad?, hess?, options?) → OptimizeResult`

Main entry point for constrained optimization.

**Parameters:**
- `f: (x: number[]) => number` — objective function
- `x0: number[]` — starting point (nudged to strict interior of box bounds)
- `grad?: (x: number[]) => number[]` — gradient (finite differences if omitted)
- `hess?: (x: number[]) => number[][]` — Hessian (finite differences if omitted)
- `options?: IPNewtonOptions` — constraints, bounds, and algorithm parameters

**Returns:** `OptimizeResult` with:
- `x` — constrained minimizer
- `converged` — true if KKT residual < kktTol and mu < 1e-4
- `iterations` — number of interior-point iterations
- `functionCalls`, `gradientCalls` — cumulative evaluation counts

**Algorithm:**
1. Classify constraints into equalities and inequalities
2. Nudge x0 to strict interior of box bounds (1% margin)
3. Initialize slacks from constraint values: `s_i = max(sigma_i * (c_i(x) - bound_i), 1e-10)`
4. Initialize mu from gradient ratio: `mu = 0.001 * ||grad_f||_1 / ||grad_barrier||_1`
5. Initialize dual multipliers: `lambda_i = mu / s_i`
6. For each iteration:
   a. Compute Hessian H
   b. Solve condensed KKT system for (dx, ds, dlambda)
   c. Compute primal step alphaPMax from fraction-to-boundary on slacks
   d. Compute dual step alphaDMax from fraction-to-boundary on lambdas
   e. Backtracking line search on merit function using primal step
   f. Update x with primal step, slacks from constraint values
   g. Update lambdas with dual step (alphaDMax)
   h. Update mu via Mehrotra predictor-corrector (monotonically decreasing)
   i. Check KKT convergence (stationarity + feasibility + mu < 1e-4)

## Condensed KKT System

The full KKT system with variables (x, s, lambda, nu) is reduced by block elimination:

1. **Eliminate slacks**: `ds = J_I * dx` (from slack definition)
2. **Eliminate duals**: `dlambda = (mu/s - lambda) - Sigma * J_I * dx` where `Sigma = diag(lambda/s)`
3. **Condensed system**: `Htilde * dx = -(grad_f - J_I^T * (mu/s))` where `Htilde = H + J_I^T * Sigma * J_I`
4. **With equalities**: Schur complement on `[Htilde, -J_E^T; J_E, 0]`

The condensed gradient is `gtilde = grad_f - J_I^T * (mu/s) - J_E^T * nu`, where the lambda
terms cancel during block elimination (only mu/s survives, not lambda separately).

## Merit Function

```
merit(x) = f(x) + penalty * sum(|eq_violation_i|) - mu * sum(log(s_i))
```

- `penalty = 10 * max(||grad_f||_inf, 1)` (fixed at initialization)
- Line search accepts if `meritNew < merit0 + 1e-8` (small tolerance for near-zero improvement)

## Barrier Parameter Update (Mehrotra)

```
mu_current = avg(s_i * lambda_i)
mu_affine = avg((s_i + alphaS*ds_i) * (lambda_i + alphaL*dlambda_i))
sigma = (mu_affine / mu_current)^3
mu_next = max(sigma * mu_current, mu_current / 10)
```

The barrier parameter decreases monotonically: `mu = min(mu_next, mu_prev)`.

## Initial Point Handling

| Condition | Action |
|-----------|--------|
| Box equality (lo == hi) | Set x_i = lo |
| Both bounds finite | Nudge to `[lo + 0.01*(hi-lo), hi - 0.01*(hi-lo)]` |
| Only lower finite | `x_i = max(lo + 0.01*max(1,|lo|), x_i)` |
| Only upper finite | `x_i = min(hi - 0.01*max(1,|hi|), x_i)` |

## Convergence Criteria

For constrained problems, convergence requires both:
1. KKT residual (max of stationarity + constraint violation) < kktTol
2. Barrier parameter mu < 1e-4 (ensures barrier is negligible)

For unconstrained problems (no bounds or constraints):
- Standard gradient norm < gradTol

Additional termination: step size < stepTol, function change < funcTol.

## Test Vectors

### Unconstrained sphere

```
f(x) = x[0]^2 + x[1]^2, x0 = [5, 5]
→ x ≈ [0, 0], f ≈ 0, converged
```

### Box-constrained sphere (active lower bound)

```
f(x) = x[0]^2 + x[1]^2, x0 = [5, 5]
lower = [1, 1], upper = [10, 10]
→ x ≈ [1, 1], f ≈ 2, converged
```

### Equality constraint

```
f(x) = x^2 + y^2, x0 = [2, 2]
c(x) = [x + y], lower = [1], upper = [1] (equality: x+y=1)
→ x ≈ [0.5, 0.5], f ≈ 0.5
```

### Inequality constraint

```
f(x) = x^2 + y^2, x0 = [3, 3]
c(x) = [x + y], lower = [3], upper = [+Inf] (x+y >= 3)
→ x ≈ [1.5, 1.5], f ≈ 4.5
```

### HS7 (classic constrained)

```
f(x) = log(1 + x1^2) - x2
c(x) = [(1+x1^2)^2 + x2^2], lower = [4], upper = [4] (equality)
x0 = [1, 1]
→ x ≈ [0, sqrt(3)], f ≈ -sqrt(3)
```

### 1D active bound

```
f(x) = (x-3)^2, x0 = [0]
lower = [4], upper = [10]
→ x ≈ [4], f ≈ 1
```

### NaN detection

```
f returns NaN after 8 evaluations
→ returns best feasible point, message contains "NaN"
```

## Provenance

- Nocedal & Wright, *Numerical Optimization*, Chapter 19 (interior-point methods)
- Mehrotra (1992), *SIAM J. Optimization* — predictor-corrector barrier strategy
- Optim.jl v2.0.0 `IPNewton` — primal-dual with backtracking, Cholesky with modification
- Wachter & Biegler (2006) — fraction-to-boundary rule, separate primal/dual step sizes
