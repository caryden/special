# estimate-state — Spec

Depends on: `state-types`, `any-of(kalman-filter, ekf, ukf)`

## Purpose

Unified dispatcher for Bayesian state estimation. Routes to the linear Kalman
filter, Extended Kalman Filter (EKF), or Unscented Kalman Filter (UKF) based on
a `method` parameter in the model specification. This is a thin routing layer --
all real logic lives in the downstream filter nodes.

### Key design decisions

- **Discriminated union dispatch.** The `ModelSpec` type uses a `method` string
  literal to select the filter. The dispatcher is a single `switch` on
  `spec.method` -- no conditional logic, no defaulting, no fallback.
- **One function, one step.** `estimateState` performs a combined predict + update
  (delegating to `kalmanStep`, `ekfStep`, or `ukfStep`). Callers who need
  separated predict/update should call the downstream nodes directly.
- **Transparent passthrough.** The dispatcher does not transform inputs or
  outputs. Each branch forwards arguments directly to the underlying filter's
  step function and returns its result unmodified.

## Types

### EstimationMethod

```
'kalman' | 'ekf' | 'ukf'
```

### KalmanModelSpec

| Field | Type | Description |
|-------|------|-------------|
| `method` | `'kalman'` | Discriminant for linear Kalman filter |
| `model` | `LinearSystemModel` | Linear system matrices (F, H, Q, R, optional B) |

### EKFModelSpec

| Field | Type | Description |
|-------|------|-------------|
| `method` | `'ekf'` | Discriminant for Extended Kalman Filter |
| `dynamics` | `EKFDynamicsModel` | Nonlinear dynamics with analytic Jacobians (f, F, Q) |
| `measurement` | `EKFMeasurementModel` | Nonlinear measurement with analytic Jacobians (h, H, R) |

### UKFModelSpec

| Field | Type | Description |
|-------|------|-------------|
| `method` | `'ukf'` | Discriminant for Unscented Kalman Filter |
| `f` | `(x: Matrix, u?: Matrix) => Matrix` | State transition function |
| `h` | `(x: Matrix) => Matrix` | Measurement function |
| `Q` | `Matrix` | Process noise covariance |
| `R` | `Matrix` | Measurement noise covariance |
| `params?` | `UKFParams` | Sigma point parameters (defaults to alpha=1e-3, beta=2, kappa=0) |

### ModelSpec

Union type: `KalmanModelSpec | EKFModelSpec | UKFModelSpec`

### EstimationResult

Union type: `KalmanUpdateResult | EKFUpdateResult | UKFUpdateResult`

All variants include at minimum:
- `state`: `GaussianState` -- updated posterior state
- `innovation`: `Matrix` -- measurement residual
- `kalmanGain`: `Matrix` -- gain used in the update

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `estimateState` | `(state: GaussianState, measurement: Matrix, spec: ModelSpec, control?: Matrix) => EstimationResult` | Run one estimation step (predict + update) using the specified method |

## Test Vectors

### Kalman method

@provenance API design -- routes to kalmanStep from kalman-filter node

| Test | Setup | Expected |
|------|-------|----------|
| One step: mean moves toward measurement | state=[0], P=[[1]], F=[[1]], H=[[1]], Q=[[0.01]], R=[[1]], z=[5] | 0 < updated mean < 5 |
| 20 steps: converges to measurement value | state=[0], P=[[10]], same model, z=[10] repeated 20 times | mean close to 10 (tol 1) |

### EKF method

@provenance API design -- routes to ekfStep from ekf node

| Test | Setup | Expected |
|------|-------|----------|
| One step with identity Jacobians | state=[0], P=[[1]], f(x)=x, F=[[1]], h(x)=x, H=[[1]], Q=[[0.01]], R=[[1]], z=[3] | 0 < updated mean < 3 |
| Nonlinear range measurement converges | 2D state=[3,4], P=I_2, h(x)=sqrt(x1^2+x2^2), H=[x1/r, x2/r], Q=0.01*I_2, R=[[0.1]], z=[5] repeated 10 times | estimated range within 1 of true distance 5 |

### UKF method

@provenance API design -- routes to ukfStep from ukf node

| Test | Setup | Expected |
|------|-------|----------|
| One step: mean moves toward measurement | state=[0], P=[[1]], f(x)=x, h(x)=x, Q=[[0.01]], R=[[1]], z=[5] | 0 < updated mean < 5 |
| 20 steps: converges to measurement value | state=[0], P=[[10]], f(x)=x, h(x)=x, Q=[[0.01]], R=[[1]], z=[10] repeated 20 times | mean close to 10 (tol 1) |

### Method routing

@provenance API design -- all methods handle the same 1D problem

| Test | Setup | Expected |
|------|-------|----------|
| All three methods produce valid updates | 1D identity model for each method, state=[0], P=[[1]], Q=[[0.01]], R=[[1]], z=[5] | For each: updated mean > 0 and covariance < 1 |
