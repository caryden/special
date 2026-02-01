# hager-zhang — Spec

Depends on: `vec-ops`, `line-search` (for `LineSearchResult` type)

## Purpose

Hager-Zhang line search: an efficient algorithm that satisfies **approximate Wolfe
conditions**, combining secant-based interpolation with bisection fallback. This is
the default line search in Optim.jl and the CG_DESCENT conjugate gradient method.

Compared to Strong Wolfe (Nocedal & Wright):
- Uses "approximate" Wolfe conditions that relax the decrease requirement near minima
- Uses secant interpolation instead of cubic interpolation for the zoom phase
- Typically requires fewer function evaluations on well-conditioned problems

## Types

### HagerZhangOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `delta` | number | 0.1 | Sufficient decrease parameter (Wolfe c1) |
| `sigma` | number | 0.9 | Curvature condition parameter (Wolfe c2) |
| `epsilon` | number | 1e-6 | Approximate Wolfe tolerance |
| `theta` | number | 0.5 | Bisection ratio for bracket update |
| `gamma` | number | 0.66 | Bracket shrink factor for secant failure |
| `rho` | number | 5.0 | Initial bracket expansion factor |
| `maxBracketIter` | number | 50 | Maximum iterations for bracket phase |
| `maxSecantIter` | number | 50 | Maximum iterations for secant/bisect phase |

## Function

### hagerZhangLineSearch

@provenance: Hager & Zhang, "Algorithm 851: CG_DESCENT", ACM TOMS 32(1), 2006
@provenance: Hager & Zhang, "A new conjugate gradient method with guaranteed descent
             and an efficient line search", SIAM J. Optim. 16(1), 2005
@provenance: Default parameters match Optim.jl HagerZhang() constructor

Finds step size `alpha > 0` satisfying approximate Wolfe conditions:

1. **Standard Wolfe**:
   - Sufficient decrease: `phi(alpha) <= phi(0) + delta*alpha*phi'(0)`
   - Curvature: `phi'(alpha) >= sigma*phi'(0)`

2. **Approximate Wolfe** (used near minimum):
   - Bounded value: `phi(alpha) <= phi(0) + eps_k` where `eps_k = epsilon * |phi(0)|`
   - Bounded slope: `sigma*phi'(0) <= phi'(alpha) <= (2*delta - 1)*phi'(0)`

Signature: `(f, grad, x, d, fx, gx, options?) -> LineSearchResult`

Parameters:
- `f`: Objective function `(x: number[]) -> number`
- `grad`: Gradient function `(x: number[]) -> number[]`
- `x`: Current position
- `d`: Search direction (must be descent: `grad(x)' * d < 0`)
- `fx`: `f(x)` (precomputed)
- `gx`: `grad(x)` (precomputed)
- `options`: Optional `HagerZhangOptions`

Returns: `LineSearchResult` (same type as backtracking and Strong Wolfe)

## Algorithm

### Phase 1: Bracket

Find interval `[a, b]` containing a point satisfying approximate Wolfe conditions.

1. Start with `c = 1.0`
2. If `c` satisfies conditions, return immediately
3. If `phi(c) > phi(0) + eps_k` or `phi'(c) >= 0`: bracket is `[0, c]`
4. Otherwise expand: `c *= rho` and repeat until bracket found or iterations exhausted

### Phase 2: Secant/Bisect

Narrow bracket `[a, b]` to find a satisfying point.

1. Compute secant step: `c = a - phi'(a) * (b - a) / (phi'(b) - phi'(a))`
2. If denominator is near zero, use theta-bisection: `c = a + theta * (b - a)`
3. If `c` satisfies conditions, return
4. Update bracket based on `phi(c)` and `phi'(c)`:
   - If `phi(c) > phi(0) + eps_k` or `phi'(c) >= 0`: set `b = c`
   - Otherwise: set `a = c`
5. If bracket didn't shrink enough (width > gamma * previous_width), do bisection step
6. Repeat until convergence or iteration limit

## Test Vectors

### Basic: Sphere from [0.5, 0.5] with d=[-0.5, -0.5]

- Initial step alpha=1 lands exactly at minimum
- Expected: `alpha = 1.0`, `fNew = 0.0`, `success = true`
- Function calls: 1, gradient calls: 1

### Sphere from [5, 5] with steepest descent d=[-10, -10]

- Expected: `alpha` in (0.1, 2.0), `fNew < 1.0`, `success = true`

### All 6 test functions satisfy approximate Wolfe conditions

Starting points: Sphere [5,5], Booth [0,0], Rosenbrock [-1.2,1.0],
Beale [0,0], Himmelblau [0,0], Goldstein-Price [0,-0.5].

For each: `success = true`, `fNew <= fx`, and Wolfe conditions verified.

### Bracket expansion: f(x) = x^2 from x=[100]

- Initial step too small (function still decreasing at alpha=1)
- Expansion finds optimal step at `alpha > 1`

### Failure mode: linear function with maxBracketIter=2

- `f(x) = -x`, always decreasing — bracket expansion exhausted
- Expected: `success = false`

### Failure mode: strict conditions with maxSecantIter=1

- Rosenbrock with `delta=0.99, sigma=0.99, maxSecantIter=1`
- Secant phase exhausted before finding satisfying point
- Expected: `success = false`

## Cross-Library Comparison

| Property | Our Implementation | Optim.jl |
|----------|-------------------|----------|
| Default delta | 0.1 | 0.1 |
| Default sigma | 0.9 | 0.9 |
| Default epsilon | 1e-6 | 1e-6 |
| Default theta | 0.5 | 0.5 |
| Default gamma | 0.66 | 0.66 |
| Default rho | 5.0 | 5.0 |

All defaults match Optim.jl's `HagerZhang()` constructor.
