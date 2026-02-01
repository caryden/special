# Optimize — Reference Library Design

## Goal

A modular, pure, dependency-free optimization library covering the most commonly
needed unconstrained minimization algorithms. Designed as a Type-O reference for
translation into any target language via the skill architecture.

## Scope

**In scope (v1):**
- Unconstrained multivariate minimization
- Derivative-free: Nelder-Mead
- First-order: Gradient Descent, BFGS, L-BFGS
- Line search: Armijo backtracking, Strong Wolfe conditions
- Gradient estimation: forward finite differences
- Standard test functions with provenance-tracked test vectors
- Configurable convergence criteria (gradient tol, step tol, function tol, max iterations)

**Out of scope (future):**
- Constrained optimization (bounds, linear/nonlinear constraints)
- Second-order methods (Newton, trust region)
- Global optimization (simulated annealing, particle swarm)
- Automatic differentiation

## Node Graph

```
vec-ops ─────────┬───────────────────────────────────────────┐
                 │                                           │
result-types ────┼──────────────┬──────────────┬─────────────┤
                 │              │              │             │
finite-diff ─────┤              │              │             │
                 │              │              │             │
line-search ─────┼──────────────┤              │             │
                 │              │              │             │
          nelder-mead    gradient-descent     bfgs         l-bfgs
                 │              │              │             │
                 └──────────────┴──────────────┴─────────────┘
                                     │
                                  minimize
                                     │
                              test-functions
                            (validation only)
```

## Node Descriptions

### vec-ops (leaf)
Vector arithmetic for n-dimensional optimization. Pure functions, no allocation
strategy opinions. Functions: dot, norm, scale, add, sub, clone.

### result-types (leaf)
- `OptimizeResult`: x, fun, gradient, iterations, functionCalls, gradientCalls,
  converged, message
- `OptimizeOptions`: gradientTolerance (1e-8), stepTolerance (1e-8),
  functionTolerance (1e-12), maxIterations (1000)
- `ConvergenceCheck`: function that tests all criteria and returns status

### finite-diff (depends: vec-ops)
Forward finite difference gradient approximation. Step size h = sqrt(eps) * max(|x_i|, 1).
Central differences as option.

### line-search (depends: vec-ops)
Two strategies:
- `backtrackingLineSearch`: Armijo condition with cubic interpolation.
  Default: alpha=1.0, c1=1e-4, rho=0.5, maxIter=20.
- `wolfeLineSearch`: Strong Wolfe conditions.
  Default: c1=1e-4, c2=0.9, alphaMax=1e6, maxIter=25.

### nelder-mead (depends: vec-ops, result-types)
Derivative-free simplex method. Parameters: alpha=1 (reflect), gamma=2 (expand),
rho=0.5 (contract), sigma=0.5 (shrink). Convergence via function value spread
across simplex vertices.

### gradient-descent (depends: vec-ops, result-types, line-search, finite-diff)
Steepest descent with configurable line search. Simplest gradient method — serves
as baseline for BFGS comparison. Uses backtracking by default.

### bfgs (depends: vec-ops, result-types, line-search, finite-diff)
Full-memory Broyden-Fletcher-Goldfarb-Shanno. Maintains inverse Hessian approximation.
Uses Wolfe line search by default (required for positive-definiteness of update).
Initial H0 = identity. Skips update when curvature condition yk·sk <= 0.

### l-bfgs (depends: vec-ops, result-types, line-search, finite-diff)
Limited-memory BFGS. Stores last m=10 correction pairs. Two-loop recursion for
implicit H·g product. Same line search as BFGS.

### minimize (depends: all algorithms)
Dispatcher function. Signature: `minimize(f, x0, options?)`.
- If gradient provided: use BFGS (or specified method)
- If no gradient: use Nelder-Mead (or finite-diff + BFGS if method specified)
- Method selection: "nelder-mead" | "gradient-descent" | "bfgs" | "l-bfgs"

### test-functions (leaf, validation only)
Standard optimization test functions with known optima. Not part of the library
itself — used for validation and benchmarking.

Functions: Sphere, Booth, Rosenbrock, Beale, Himmelblau, Goldstein-Price.
Each includes: function, gradient (analytic), known minimum location/value.

## Design Decisions (Off-Policy)

These are arbitrary choices that differ across libraries. Each is documented
with provenance showing what other libraries chose.

| Decision | Our choice | scipy | Optim.jl | MATLAB |
|----------|-----------|-------|----------|--------|
| Default gradient tol | 1e-8 | 1e-5 | 1e-8 | 1e-6 |
| Default step tol | 1e-8 | varies | 0 (off) | 1e-6 |
| Default function tol | 1e-12 | varies | 0 (off) | — |
| Default max iterations | 1000 | method-specific | 1000 | 400 |
| Default line search (BFGS) | Strong Wolfe | Wolfe (hardcoded) | HagerZhang | cubic interp |
| Wolfe c1 | 1e-4 | 1e-4 | 1e-4 | 1e-4 |
| Wolfe c2 | 0.9 | 0.9 | 0.1 (HZ) | 0.9 |
| NM reflect/expand/contract | 1/2/0.5 | 1/2/0.5 | 1/2/0.5 | 1/2/0.5 |
| L-BFGS memory | 10 | 10 | 10 | — |
| Finite diff step | sqrt(eps)*max(|x|,1) | eps^(1/3) | — | sqrt(eps) |
| No gradient → method | Nelder-Mead | BFGS w/ finite diff | NelderMead | BFGS w/ finite diff |

## Test Vector Provenance

Every test vector records its source:

```typescript
/** @provenance scipy.optimize.rosen v1.17.0 */
/** @provenance optim.jl OptimTestProblems v2.0.0 git:abc1234 */
/** @provenance mathematical-definition (analytically derived) */
```

Categories:
1. **Mathematical** — derived from function definition (minimum of Rosenbrock is at (1,1) by construction)
2. **Behavioral** — extracted from running scipy/Optim.jl and recording actual outputs
   (convergence behavior, iteration counts, final gradient norms)
3. **Cross-validated** — vectors where multiple libraries agree on the answer
