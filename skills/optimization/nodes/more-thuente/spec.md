# more-thuente — Spec

Depends on: `vec-ops`, `line-search` (for `LineSearchResult` type)

## Purpose

More-Thuente line search: a robust algorithm that finds a step satisfying **strong
Wolfe conditions** using safeguarded cubic/quadratic interpolation. Originally from
the MINPACK library (Argonne National Laboratory, 1983).

Compared to the other line searches in this skill:
- Uses cubic interpolation (vs. bisection in Strong Wolfe, secant in Hager-Zhang)
- Maintains an "interval of uncertainty" with guaranteed narrowing
- Two-stage approach: first optimizes a modified function, then switches to standard
- More robust than Strong Wolfe on difficult functions; sometimes more efficient
  than Hager-Zhang (e.g., 17 vs 44 function calls on Rosenbrock with Newton)

## Types

### MoreThuenteOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fTol` | number | 1e-4 | Sufficient decrease parameter (Wolfe c1) |
| `gtol` | number | 0.9 | Curvature condition parameter (Wolfe c2) |
| `xTol` | number | 1e-8 | Relative width tolerance for interval |
| `alphaMin` | number | 1e-16 | Minimum allowed step size |
| `alphaMax` | number | 65536.0 | Maximum allowed step size |
| `maxFev` | number | 100 | Maximum function evaluations |

### CstepResult

Internal result type for the cstep helper. Contains updated interval endpoints
(stx, sty), new trial step alpha, bracketed flag, and info code.

## Functions

### moreThuente

@provenance: More & Thuente, "Line search algorithms with guaranteed sufficient
             decrease", ACM TOMS 20(3), 1994, pp. 286-307
@provenance: LineSearches.jl MoreThuente() — Julia translation of MINPACK cvsrch
@provenance: Default parameters match scipy.optimize.line_search and Optim.jl

Finds step size `alpha > 0` satisfying strong Wolfe conditions:

1. **Sufficient decrease**: `f(x + alpha*d) <= f(x) + fTol*alpha*f'(x)*d`
2. **Curvature**: `|f'(x + alpha*d)*d| <= gtol*|f'(x)*d|`

Signature: `(f, grad, x, d, fx, gx, options?) -> LineSearchResult`

Returns `LineSearchResult` with `success: true` when both conditions are met
(info code 1). Other termination codes (2-6) return `success: false`.

#### Algorithm

1. Evaluate at initial step alpha = 1
2. Enter main loop:
   a. Evaluate function and gradient at trial alpha
   b. Check 6 termination conditions (Wolfe, width, bounds, max evals, rounding)
   c. If in stage 1 (modified function), apply modified function values
   d. Call `cstep` to update interval and suggest next trial step
   e. Force bisection if interval hasn't shrunk by 2/3

#### Termination info codes

| Code | Meaning |
|------|---------|
| 1 | Strong Wolfe conditions satisfied (success) |
| 2 | Interval width below xTol (relative) |
| 3 | Maximum function evaluations reached |
| 4 | Step at lower bound alphaMin |
| 5 | Step at upper bound alphaMax |
| 6 | Rounding errors prevent progress |

### cstep

@provenance: More & Thuente 1994, Subroutine cstep (MINPACK)

Updates the interval of uncertainty and computes the next trial step. Selects
between four interpolation strategies based on the relationship between function
values and derivatives at the current best point (stx) and trial point (alpha):

| Case | Condition | Interpolation |
|------|-----------|---------------|
| 1 | `f > fstx` (higher value) | Cubic vs quadratic, closer to stx |
| 2 | `f <= fstx`, opposite-sign derivatives | Cubic vs secant, closer to alpha |
| 3 | `f <= fstx`, same-sign, `|dg| < |dgx|` | Cubic with safeguards |
| 4 | `f <= fstx`, same-sign, `|dg| >= |dgx|` | Cubic if bracketed, else bounds |

Signature: `(stx, fstx, dgx, sty, fsty, dgy, alpha, f, dg, bracketed, stmin, stmax) -> CstepResult`

## Test vectors

### Basic convergence

| Function | Start | Direction | Expected |
|----------|-------|-----------|----------|
| Sphere (x^2+y^2) | [5, 5] | -gradient | alpha > 0, f(new) < 50, Wolfe satisfied |
| Rosenbrock | [-1.2, 1.0] | -gradient | alpha > 0, f(new) < f(start), Wolfe satisfied |

### Termination codes

| Scenario | Parameters | Expected code |
|----------|------------|---------------|
| Normal convergence (sphere) | defaults | info=1, success=true |
| Max evals (linear f=-x) | maxFev=3 | info=3, success=false |
| Width tolerance (non-smooth) | gtol=1e-15, xTol=0.5 | info=2, success=false |
| Lower bound (x^2, alpha=0.5) | alphaMin=alphaMax=0.5 | info=4, success=false |
| Upper bound (-log(1+x)) | alphaMax=2.0 | step near bound |

### cstep cases (direct)

| Case | stx | fstx | dgx | alpha | f | dg | bracketed | Expected info |
|------|-----|------|-----|-------|---|----|-----------|---------------|
| 3 (stmin) | 5 | 10 | -10 | 2 | 8 | -5 | false | 3 |
| 4 (bracketed) | 1 | 2 | -1 | 3 | 1 | -2 | true | 4 |
| 4 (stmin) | 5 | 10 | -1 | 2 | 5 | -3 | false | 4 |
