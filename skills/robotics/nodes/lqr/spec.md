# lqr — Spec

Depends on: `mat-ops`

## Purpose

Linear Quadratic Regulator (LQR) for continuous and discrete-time linear systems.
Solves the algebraic Riccati equation to compute the optimal state-feedback gain K
that minimizes the cost functional `J = integral(x'Qx + u'Ru) dt` (continuous) or
`J = sum(x'Qx + u'Ru)` (discrete).

## Conventions

@provenance ControlSystems.jl v1.12.0 (cross-validation), python-control v0.10.2

- **CARE** (Continuous Algebraic Riccati Equation): `A'P + PA - PBR^{-1}B'P + Q = 0`.
  Solved via matrix sign function method on the Hamiltonian.
- **DARE** (Discrete Algebraic Riccati Equation):
  `P = A'PA - A'PB(R + B'PB)^{-1}B'PA + Q`. Solved via fixed-point iteration.
- **Gain**: Continuous `K = R^{-1} B' P`. Discrete `K = (R + B'PB)^{-1} B' P A`.
- **Stability**: Continuous closed-loop `A - BK` has all eigenvalues with negative
  real part. Discrete closed-loop `A - BK` has all eigenvalues inside the unit circle.
- **P properties**: Solution P is symmetric positive definite for stabilizable (A,B)
  and detectable (A,Q).

## Types

### RiccatiResult

| Field | Type | Description |
|-------|------|-------------|
| `P` | Matrix | Solution to the Riccati equation (n x n) |
| `K` | Matrix | Optimal state-feedback gain (m x n) |

### LqrOptions

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'continuous' \| 'discrete'` | Riccati variant (default: `'continuous'`) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `solveCARE` | `(A, B, Q, R, maxIter?, tol?) → RiccatiResult` | Solve CARE via matrix sign function |
| `solveDARE` | `(A, B, Q, R, maxIter?, tol?) → RiccatiResult` | Solve DARE via fixed-point iteration |
| `lqr` | `(A, B, Q, R, options?) → RiccatiResult` | Dispatcher (defaults to continuous) |
| `dlqr` | `(A, B, Q, R) → RiccatiResult` | Convenience wrapper for discrete LQR |

## Test Vectors

### CARE: 1D double integrator

@provenance ControlSystems.jl v1.12.0, analytical solution

A = [[0,1],[0,0]], B = [[0],[1]], Q = I(2), R = [[1]]

| Output | Expected |
|--------|----------|
| K[0,0] | 1.0 |
| K[0,1] | sqrt(3) ≈ 1.7321 |
| P[0,0] | sqrt(3) ≈ 1.7321 |
| P[0,1] | 1.0 |
| P[1,0] | 1.0 |
| P[1,1] | sqrt(3) ≈ 1.7321 |
| Closed-loop eigenvalues | Re < 0 (stable) |

### CARE: scalar system

@provenance analytical solution

A = [[2]], B = [[1]], Q = [[1]], R = [[1]]

CARE: `P^2 - 4P - 1 = 0` => `P = 2 + sqrt(5) ≈ 4.2361`

| Output | Expected |
|--------|----------|
| P[0,0] | 2 + sqrt(5) ≈ 4.2361 |
| K[0,0] | 2 + sqrt(5) ≈ 4.2361 |

### CARE: identity check

@provenance mathematical-definition

A = zeros(2,2), B = I(2), Q = I(2), R = I(2)

CARE: `P^2 = I` => `P = I`

| Output | Expected |
|--------|----------|
| P | I(2) |
| K | I(2) |

### CARE: spring-mass system

@provenance python-control v0.10.2

A = [[0,1],[-2,-1]], B = [[0],[1]], Q = I(2), R = [[1]]

| Property | Expected |
|----------|----------|
| K dimensions | 1 x 2 |
| P symmetric | Yes |
| P positive definite | Yes |
| Closed-loop eigenvalues Re < 0 | Yes |

### CARE: residual check

@provenance mathematical-definition

| Test | Expected |
|------|----------|
| `\|A'P + PA - PBR^{-1}B'P + Q\|_F` for double integrator | < 1e-6 |
| `\|A'P + PA - PBR^{-1}B'P + Q\|_F` for 3x3 system | < 1e-5 |

### DARE: discrete double integrator

@provenance ControlSystems.jl v1.12.0

A = [[1,1],[0,1]], B = [[0],[1]], Q = I(2), R = [[1]]

| Property | Expected |
|----------|----------|
| K dimensions | 1 x 2 |
| P symmetric | Yes |
| P positive definite | Yes |
| Closed-loop spectral radius < 1 | Yes (inside unit circle) |
| DARE residual `\|P - (A'PA - correction + Q)\|_F` | < 1e-6 |

### DARE: scalar system

@provenance analytical solution

A = [[1.5]], B = [[1]], Q = [[1]], R = [[1]]

DARE: `P^2 - 2.25P - 1 = 0` => `P = (2.25 + sqrt(2.25^2 + 4)) / 2 ≈ 2.6514`

| Output | Expected |
|--------|----------|
| P[0,0] | (2.25 + sqrt(9.0625)) / 2 ≈ 2.6314 |
| K[0,0] | P * 1.5 / (1 + P) |
| Closed-loop eigenvalue | |A - BK| < 1 |

### Gain scaling with R

@provenance mathematical-definition

| Test | Expected |
|------|----------|
| CARE: R=0.01 vs R=100 (double integrator) | small R => larger K entries |
| DARE: R=0.01 vs R=100 (discrete double integrator) | small R => larger K entries |

### K dimensions for multi-input systems

@provenance implementation-invariant

| System | Expected K dimensions |
|--------|----------------------|
| CARE: 3x3 A, 3x2 B | K is 2 x 3 |
| DARE: 3x3 A, 3x2 B | K is 2 x 3 |

### Dispatcher and convenience

@provenance implementation-invariant

| Test | Verified |
|------|----------|
| `lqr(A,B,Q,R)` defaults to CARE | K matches `solveCARE` |
| `lqr(A,B,Q,R, {type:'continuous'})` matches CARE | Yes |
| `lqr(A,B,Q,R, {type:'discrete'})` matches DARE | Yes |
| `dlqr(A,B,Q,R)` matches `solveDARE` | Yes |

## Cross-validation

@provenance ControlSystems.jl v1.12.0, python-control v0.10.2

The double integrator CARE solution `K = [1, sqrt(3)]` and `P = [[sqrt(3), 1], [1, sqrt(3)]]`
is a well-known analytical result verified against both ControlSystems.jl and python-control.
The residual `A'P + PA - PBR^{-1}B'P + Q ≈ 0` confirms correctness to machine precision.
