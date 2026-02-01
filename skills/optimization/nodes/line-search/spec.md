# line-search — Spec

Depends on: `vec-ops`

## Purpose

Given position x, descent direction d, find step size α that satisfies
sufficient decrease conditions. Two strategies:

1. **Backtracking (Armijo)**: Simple, robust. Good default for gradient descent.
2. **Strong Wolfe**: Required for BFGS positive-definite Hessian updates.

## Types

### LineSearchResult

| Field | Type | Description |
|-------|------|-------------|
| `alpha` | number | Step size found |
| `fNew` | number | f(x + α·d) |
| `gNew` | number[] or null | Gradient at new point (if computed) |
| `functionCalls` | number | Function evaluations used |
| `gradientCalls` | number | Gradient evaluations used |
| `success` | boolean | Whether line search succeeded |

## Functions

### backtrackingLineSearch

@provenance: Nocedal & Wright, Numerical Optimization, Algorithm 3.1
@provenance: c1=1e-4 matches scipy.optimize.line_search and Optim.jl
@provenance: ρ=0.5 (halving) is simplest; scipy uses cubic interpolation

Finds α satisfying **Armijo condition**: `f(x + α·d) ≤ f(x) + c1·α·∇f(x)ᵀd`

Signature: `(f, x, d, fx, gx, options?) → LineSearchResult`

Options:
- `initialAlpha`: starting step (default 1.0)
- `c1`: Armijo parameter (default 1e-4)
- `rho`: backtracking factor (default 0.5)
- `maxIter`: max halvings (default 20)

### wolfeLineSearch

@provenance: Nocedal & Wright, Algorithms 3.5 + 3.6
@provenance: c1=1e-4, c2=0.9 matches scipy.optimize.line_search
@provenance: Optim.jl uses HagerZhang by default (different algorithm, similar guarantees)

Finds α satisfying **both** Wolfe conditions:
1. Armijo: `f(x + α·d) ≤ f(x) + c1·α·g₀ᵀd`
2. Curvature: `|∇f(x + α·d)ᵀd| ≤ c2·|g₀ᵀd|`

Uses bracket-and-zoom approach. Internal `zoom` function narrows the bracket.

Signature: `(f, grad, x, d, fx, gx, options?) → LineSearchResult`

Options:
- `c1`: Armijo parameter (default 1e-4)
- `c2`: curvature parameter (default 0.9)
- `alphaMax`: max step size (default 1e6)
- `maxIter`: max outer iterations (default 25)

## Test Vectors

@provenance: mathematical-definition

### Backtracking

| Test | Setup | Expected |
|------|-------|----------|
| Sphere from [10,10] | d = -gradient, α₀=1 | success=true, α=0.5, fNew=0 |
| Rosenbrock from [-1.2,1] | d = -gradient | success=true, fNew < f₀ |
| Ascending direction | d = +gradient | success=false |

### Wolfe

| Test | Setup | Expected |
|------|-------|----------|
| Sphere from [10,10] | d = -gradient | success=true, both Wolfe conditions verified |
| Rosenbrock from [-1.2,1] | d = -gradient | success=true, fNew < f₀ |
| Returns gradient | Sphere from [10,10] | gNew is not null, length=2 |

### Post-hoc verification

For successful Wolfe results, verify:
- Armijo: `result.fNew ≤ fx + c1 * result.alpha * dot(gx, d)`
- Curvature: `|dot(result.gNew, d)| ≤ c2 * |dot(gx, d)|`
