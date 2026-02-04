# ekf — Spec

Depends on: `mat-ops`, `state-types`

## Purpose

Extended Kalman Filter (EKF) for nonlinear systems. Uses first-order Taylor
expansion (analytic Jacobians) to linearize dynamics and measurement models at
each time step. The caller provides explicit Jacobian functions rather than
relying on numerical differentiation — this keeps the node self-contained and
makes linearization errors visible to the user.

Predict and update are separated into distinct functions (matching the linear
Kalman filter API) so callers can inspect the predicted state before
incorporating a measurement. A convenience `ekfStep` combines both.

### Key design decisions

- **Caller-supplied analytic Jacobians.** `EKFDynamicsModel.F` and
  `EKFMeasurementModel.H` are functions the caller writes. This avoids a
  dependency on numerical differentiation and makes the linearization point
  explicit. If analytic Jacobians are unavailable, the caller can pair this
  node with a finite-difference utility externally.
- **Separated predict/update steps.** Mirrors the linear Kalman filter
  (`kalmanPredict`/`kalmanUpdate`) so EKF is a drop-in replacement when the
  system is nonlinear. On a linear system the two filters produce identical
  results (tested).

## Types

### EKFDynamicsModel

| Field | Type | Description |
|-------|------|-------------|
| `f` | `(state: Matrix, control?: Matrix) => Matrix` | Nonlinear state transition: x_pred = f(x, u) |
| `F` | `(state: Matrix, control?: Matrix) => Matrix` | Jacobian of f w.r.t. state: df/dx evaluated at (x, u) |
| `Q` | `Matrix` | Process noise covariance (n x n) |

### EKFMeasurementModel

| Field | Type | Description |
|-------|------|-------------|
| `h` | `(state: Matrix) => Matrix` | Nonlinear measurement function: z_pred = h(x) |
| `H` | `(state: Matrix) => Matrix` | Jacobian of h w.r.t. state: dh/dx evaluated at x |
| `R` | `Matrix` | Measurement noise covariance (p x p) |

### EKFUpdateResult

| Field | Type | Description |
|-------|------|-------------|
| `state` | `GaussianState` | Updated (posterior) Gaussian state |
| `innovation` | `Matrix` | Measurement residual: z - h(x_pred), dimensions p x 1 |
| `kalmanGain` | `Matrix` | Kalman gain K, dimensions n x p |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ekfPredict` | `(state: GaussianState, dynamics: EKFDynamicsModel, control?: Matrix) => GaussianState` | Propagate state: x_pred = f(x, u), P_pred = F P F^T + Q |
| `ekfUpdate` | `(predicted: GaussianState, measurement: Matrix, model: EKFMeasurementModel) => EKFUpdateResult` | Incorporate measurement: K = P H^T (H P H^T + R)^{-1}, x_new = x_pred + K y, P_new = (I - K H) P_pred |
| `ekfStep` | `(state: GaussianState, measurement: Matrix, dynamics: EKFDynamicsModel, model: EKFMeasurementModel, control?: Matrix) => EKFUpdateResult` | Convenience: ekfPredict then ekfUpdate |

## Test Vectors

### 1. Linear system — EKF matches KF exactly

@provenance FilterPy v1.4.5, linear equivalence property

When dynamics and measurement functions are linear (f(x) = F*x, h(x) = H*x with
constant Jacobians), the EKF must produce identical results to the standard
Kalman filter.

| Test | Setup | Expected |
|------|-------|----------|
| 1D predict | state=[0], P=[[1]], F=[[1]], Q=[[0.01]] | EKF predict mean and covariance match KF predict to 10 decimal places |
| 1D update | predicted=[0], P=[[1.01]], z=[[0.5]], H=[[1]], R=[[1]] | EKF update mean and covariance match KF update to 10 decimal places |
| 1D convergence | initial=[0], P=[[10]], measurements=[1.1, 0.9, 1.05, 0.95, 1.0] | Mean within 0.2 of 1.0; covariance < 1 (shrinks from 10) |
| 2D linear | F=[[1,0.1],[0,1]], H=[[1,0]], Q=diag(0.01), R=[[0.5]], 5 measurements [1.0,1.2,1.5,1.9,2.4] | EKF and KF means match to 8 decimal places after all updates |

### 2. Nonlinear range measurement

@provenance FilterPy v1.4.5 (range-bearing model pattern)

Static 2D target at (3, 4), true range = 5. Measurement function h(x) =
sqrt(x[0]^2 + x[1]^2). Jacobian H = [x/r, y/r] with safe-guard against r=0.

| Test | Setup | Expected |
|------|-------|----------|
| Range convergence | initial=[2.5, 3.5], P=diag(2), Q=diag(0.001), R=[[0.1]], 8 measurements near 5.0: [5.0, 4.95, 5.05, 5.0, 4.98, 5.02, 5.0, 5.01] | Estimated range within 0.5 of true range 5 |
| Covariance decrease | Same model, 10 measurements of z=5.0 | trace(P_final) < trace(P_initial) where P_initial trace = 4 |

### 3. Nonlinear pendulum

@provenance LowLevelParticleFilters.jl v3.7.0 (nonlinear dynamics pattern)

State = [theta, omega], dynamics: theta' = theta + omega*dt, omega' = omega -
(g/L)*sin(theta)*dt with g=9.81, L=1.0, dt=0.01. Measurement observes theta
directly.

| Test | Setup | Expected |
|------|-------|----------|
| Small-angle tracking | true theta0=0.1, omega0=0, EKF initial=[0,0], P=diag(0.1), Q=diag(1e-6), R=[[0.01]], 100 steps | Estimated theta within 0.1 of true theta |
| Nonlinear predict | state=[0.5, 0.2], P=diag(0.01) | theta_pred = 0.502, omega_pred = 0.2 - 9.81*sin(0.5)*0.01 ~= 0.15297 |

### 4. Properties

| Test | Setup | Expected |
|------|-------|----------|
| Predicted cov trace >= prior | state=[1,2], P=diag(0.5), Q=diag(0.1), identity dynamics | trace(P_pred) >= trace(P_prior) (P_pred = P + Q) |
| Updated cov trace <= predicted | predicted=[1,2], P=diag(1), h(x)=x[0], R=[[0.5]], z=[[1.5]] | trace(P_updated) <= trace(P_predicted) + 1e-10 |
| Innovation dimensions | 2D state, 1D measurement z=[[1.5]] | innovation is 1x1 |
| Kalman gain dimensions | 2D state, 1D measurement | gain is 2x1 |

### 5. ekfStep equivalence

| Test | Setup | Expected |
|------|-------|----------|
| 1D equivalence | state=[1], P=[[2]], Q=[[0.05]], R=[[0.3]], z=[[1.5]], identity dynamics/measurement | Manual predict+update matches ekfStep: mean, covariance, innovation, gain all match to 10 decimal places |
| 2D equivalence | state=[1,2], P=[[0.5,0.1],[0.1,0.5]], Q=diag(0.01), h(x)=x[0]+x[1], H=[[1,1]], R=[[0.5]], z=[[3.2]] | Manual predict+update matches ekfStep to 10 decimal places |

### 6. Control input

| Test | Setup | Expected |
|------|-------|----------|
| Control affects prediction | f(x,u)=x+u, F=I_2, state=[1,2], u=[0.5,0.3] | predicted mean = [1.5, 2.3] |
| No control passthrough | f(x,u)=x+u if u else x, state=[5], no control | predicted mean = [5] |
| Full step with control | f(x,u)=x+u, state=[0], P=[[1]], Q=[[0.1]], R=[[0.5]], u=[[1]], z=[[1.2]] | After predict x_pred=1, update toward z=1.2: mean in (0.9, 1.3) |
| Control-dependent Jacobian | f(x,u)=x*(1+u[0]), F=[[1+u[0]]], state=[2], P=[[0.5]], u=[[0.1]] | mean = 2.2, P_pred = 1.1*0.5*1.1 + 0.01 = 0.615 |

### 7. Multi-dimensional measurement

| Test | Setup | Expected |
|------|-------|----------|
| 2D state, 2D measurement | identity dynamics/measurement, state=[0,0], P=diag(1), Q=diag(0.01), R=diag(0.1), z=[[3],[4]] | Updated mean within 0.5 of [3, 4] (low R, high P favors measurement) |

### 8. Zero innovation

| Test | Setup | Expected |
|------|-------|----------|
| Measurement matches prediction | predicted=[3,2], P=diag(1), h(x)=x[0], z=[[3]] | innovation = 0 (to 10 decimal places), state unchanged: mean = [3, 2] |

### 9. initialGaussianState integration

| Test | Setup | Expected |
|------|-------|----------|
| 3D from initialGaussianState | initialGaussianState(3, 10), identity dynamics, Q=diag(0.01) | predicted mean is 3x1, predicted covariance is 3x3 |
