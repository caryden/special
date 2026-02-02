# finite-hessian — Spec

Depends on: `vec-ops`, `finite-diff`

## Purpose

Estimate the Hessian matrix (second derivatives) via finite differences. Required
by Newton and Newton Trust Region methods when the user doesn't provide an analytic
Hessian. Also provides Hessian-vector products for Hessian-free methods.

## Functions

### finiteDiffHessian

@provenance: Nocedal & Wright, Numerical Optimization, Section 8.1
@provenance: Step size eps^(1/4) for optimal O(h^2) accuracy with central differences

Signature: `(f, x) -> number[][]`

Returns the full n x n symmetric Hessian matrix.

- Diagonal: `H_ii ≈ (f(x+h*e_i) - 2f(x) + f(x-h*e_i)) / h^2`
- Off-diagonal: `H_ij ≈ (f(x+h*e_i+h*e_j) - f(x+h*e_i-h*e_j) - f(x-h*e_i+h*e_j) + f(x-h*e_i-h*e_j)) / (4h^2)`
- Step size: `h = eps^(1/4) * max(|x_i|, 1)` ≈ 1.22e-4
- Symmetry exploited: only upper triangle computed, lower filled by mirroring
- Cost: 1 + 2n + n*(n-1) function evaluations

### hessianVectorProduct

@provenance: Nocedal & Wright, Section 8.1 (Hessian-free approach)

Signature: `(grad, x, v, gx) -> number[]`

Approximate `H*v` using finite differences of the gradient:
`Hv ≈ (grad(x + h*v) - grad(x)) / h`

- Cost: 1 gradient evaluation (caller provides gx = grad(x))
- Step size: `h = eps^(1/4) * max(||v||, 1)`

## Test Vectors

### Sphere: H = 2*I everywhere
- At [0,0]: H = [[2,0],[0,2]]
- At [5,3]: H = [[2,0],[0,2]]

### Booth: H = [[10,8],[8,10]] (constant, quadratic)
- At [0,0] and [1,3]: same Hessian

### Rosenbrock: H varies with position
- At [1,1] (minimum): H = [[802,-400],[-400,200]]
- At [-1.2,1.0]: H = [[1330,480],[480,200]]

### Hessian-vector products
- Sphere: H*v = 2*v for any v
- Booth: H*[1,0] = [10,8], H*[1,1] = [18,18]
- Rosenbrock at [1,1]: H*[1,1] = [402,-200]
