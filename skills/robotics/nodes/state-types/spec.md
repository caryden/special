# state-types — Spec

Depends on: `mat-ops`

## Purpose

State estimation types for Kalman filters and related algorithms. Uses the Matrix
class from mat-ops for mean vectors and covariance matrices.

@provenance FilterPy v1.4.5 — GaussianState structure (mean vector + covariance matrix representation)
@provenance python-control conventions — LinearSystemModel field naming (F, B, H, Q, R)

## Types

### GaussianState

| Field | Type | Description |
|-------|------|-------------|
| `mean` | Matrix | State mean vector (n×1 column vector) |
| `covariance` | Matrix | Covariance matrix (n×n symmetric positive semi-definite) |

### LinearSystemModel

| Field | Type | Description |
|-------|------|-------------|
| `F` | Matrix | State transition matrix (n×n) |
| `B` | Matrix or null | Control input matrix (n×m), null if no control |
| `H` | Matrix | Measurement matrix (p×n) |
| `Q` | Matrix | Process noise covariance (n×n) |
| `R` | Matrix | Measurement noise covariance (p×p) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `initialGaussianState` | `(dim, variance?) → GaussianState` | Zero mean, scaled identity covariance |
| `gaussianState` | `(mean, cov) → GaussianState` | From explicit Matrix objects |
| `gaussianStateFromArrays` | `(mean[], cov[][]) → GaussianState` | From plain arrays |
| `stateDimension` | `(state) → number` | Dimension of state vector |
| `meanToArray` | `(state) → number[]` | Extract mean as plain array |
| `covarianceToArray` | `(state) → number[][]` | Extract covariance as 2D array |

## Test Vectors

### initialGaussianState

@provenance FilterPy — default initialization pattern (zero mean, scaled identity covariance)

| Input | Expected |
|-------|----------|
| `initialGaussianState(3)` | mean=zeros(3,1), cov=I_3 |
| `initialGaussianState(2, 5.0)` | mean=zeros(2,1), cov=5*I_2 |
| `initialGaussianState(4)` | mean=(4×1), cov=(4×4) |

### gaussianState validation

@provenance Defensive validation — dimension and shape checks

| Input | Expected |
|-------|----------|
| Column vector + square matching cov | valid construction |
| Row vector (1×3) + 3×3 cov | throws "must be a column vector" |
| 2×1 mean + 3×3 cov | throws "Dimension mismatch" |

### Array conversions

@provenance Structural — round-trip array conversion verification

| Input | Expected |
|-------|----------|
| `gaussianStateFromArrays([1,2], [[4,0],[0,9]])` | mean=[1,2], cov=diag(4,9) |
| `meanToArray(gaussianStateFromArrays([3,7], ...))` | `[3, 7]` |
| `covarianceToArray(initialGaussianState(2))` | `[[1,0],[0,1]]` |
| `stateDimension(initialGaussianState(5))` | `5` |

### LinearSystemModel

@provenance Interface contract — field presence and optional B verification

| Test | Expected |
|------|----------|
| Construct with B matrix (2×1) | B.rows=2, B.cols=1 |
| Construct with B=null | B is null |
