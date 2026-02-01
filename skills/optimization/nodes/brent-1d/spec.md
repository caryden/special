# brent-1d — Spec

Depends on: (none — standalone leaf node)

## Purpose

Minimize a univariate function on a bounded interval [a, b] using Brent's method.
Combines golden section search (guaranteed bracket shrinkage) with parabolic
interpolation (superlinear convergence near the minimum).

This is the standard univariate minimization algorithm, available in scipy
(`brent`), Optim.jl (`Brent()`), and MATLAB (`fminbnd`).

## Types

### Brent1dOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tol` | number | √(machine epsilon) ≈ 1.49e-8 | Convergence tolerance |
| `maxIter` | number | 500 | Maximum iterations |

### Brent1dResult

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Location of the minimum |
| `fun` | number | Function value at the minimum |
| `iterations` | number | Iterations performed |
| `functionCalls` | number | Function evaluations |
| `converged` | boolean | Whether convergence was achieved |
| `message` | string | Termination description |

## Function

### brent1d

@provenance: Brent, "Algorithms for Minimization without Derivatives", 1973, Ch. 5
@provenance: Default tol = √ε matches scipy.optimize.brent and Optim.jl Brent()

Signature: `(f, a, b, options?) -> Brent1dResult`

Parameters:
- `f`: Univariate function `(x: number) -> number`
- `a`: Left endpoint of bracket
- `b`: Right endpoint of bracket (a > b is accepted; endpoints are swapped)
- `options`: Optional `Brent1dOptions`

## Algorithm

1. Initialize golden section point x = a + golden*(b-a), evaluate f(x)
2. Maintain three points: x (best), w (second best), v (previous w)
3. At each iteration:
   a. Check convergence: `|x - midpoint| <= 2*tol1 - 0.5*(b-a)`
   b. Try parabolic interpolation through (v, fv), (w, fw), (x, fx)
   c. Accept parabolic step if inside bracket and sufficiently small
   d. Otherwise use golden section step
   e. Evaluate new point, update bracket and best points
4. Golden ratio constant: `(3 - √5) / 2 ≈ 0.381966`

## Test Vectors

### Quadratic: x^2 on [-2, 2]
- Expected: x ≈ 0, fun ≈ 0

### Shifted quadratic: (x-3)^2 on [0, 10]
- Expected: x ≈ 3, fun ≈ 0

### Transcendental: -sin(x) on [0, π]
- Expected: x ≈ π/2, fun ≈ -1

### Transcendental: x*log(x) on [0.1, 3]
- Expected: x ≈ 1/e ≈ 0.3679

### Non-smooth: |x| on [-3, 2]
- Expected: x ≈ 0, fun ≈ 0

### Reversed bracket: x^2 on [2, -2]
- Endpoints swapped internally, still converges to x ≈ 0

### Failure mode: maxIter=3 on [-100, 100]
- Expected: converged = false, message = "Maximum iterations exceeded"
