# kalman-filter — Spec

Depends on: `mat-ops`, `state-types`

## Purpose

Linear Kalman filter with separated predict/update steps. The predict step
propagates a Gaussian state forward through a linear dynamics model; the update
step incorporates a measurement to refine the prediction. A convenience
`kalmanStep` function composes both into a single call.

Design choice: predict and update are kept separate (like FilterPy, GTSAM)
rather than fused (like scipy.signal). This makes the filter composable with
different prediction schedules, multi-rate sensors, and out-of-sequence
measurements.

## Types

### KalmanUpdateResult

| Field | Type | Description |
|-------|------|-------------|
| `state` | GaussianState | Updated (posterior) state |
| `innovation` | Matrix | Measurement residual: z - H * x_pred |
| `innovationCovariance` | Matrix | Innovation covariance: H * P_pred * H^T + R |
| `kalmanGain` | Matrix | Kalman gain: P_pred * H^T * S^{-1} |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `kalmanPredict` | `(state, model, control?) -> GaussianState` | Predict step: x_pred = F*x + B*u, P_pred = F*P*F^T + Q |
| `kalmanUpdate` | `(predicted, measurement, model) -> KalmanUpdateResult` | Update step: incorporates measurement via Kalman gain |
| `kalmanStep` | `(state, measurement, model, control?) -> KalmanUpdateResult` | Combined predict + update in one call |

### kalmanPredict equations

```
x_pred = F * x + B * u   (with control)
x_pred = F * x            (without control)
P_pred = F * P * F^T + Q
```

### kalmanUpdate equations

```
y = z - H * x_pred              (innovation)
S = H * P_pred * H^T + R        (innovation covariance)
K = P_pred * H^T * S^{-1}       (Kalman gain)
x_new = x_pred + K * y
P_new = (I - K * H) * P_pred
```

## Test Vectors

### 1D constant-position model

@provenance FilterPy documentation -- "estimating a constant" example

| Test | Input | Expected |
|------|-------|----------|
| Predict increases covariance | F=[[1]], x=[0], P=[[1]], Q=[[0.01]], R=[[1]] | P_pred = 1.01, x_pred = 0 |
| Update pulls mean toward measurement | predict then update with z=[1] | 0 < x_new < 1 |
| Update reduces covariance | predict then update with z=[1] | P_new < P_pred |
| Sequential measurements converge | z=[1,2,3], start x=[0], P=[[1]] | covariance monotonically decreases; mean > 0 |
| Innovation dimensions | three steps with z=[1,2,3] | innovation, S, K are all 1x1 |

### 2D constant-velocity model

@provenance FilterPy constant-velocity tracking example

Model: F=[[1,dt],[0,1]], H=[[1,0]], Q=0.01*I_2, R=[[1]], dt=1

| Test | Input | Expected |
|------|-------|----------|
| Predict propagates position | x=[10,5], P=I_2 | x_pred = [15, 5] |
| Velocity converges for quadratic positions | z=[1,4,9,16,25], start x=[0,0], P=10*I_2 | velocity > 0, position > 10 |
| Gain dimensions | 2D state, 1D measurement | K is 2x1, innovation is 1x1, S is 1x1 |

### Textbook: 10 measurements of constant value

@provenance FilterPy documentation -- 10 measurements of constant value

| Test | Input | Expected |
|------|-------|----------|
| Posterior converges to 10 | z=10 repeated 10 times, start x=[0], P=[[100]] | mean within 0.5 of 10; variance < 1 |
| Covariance monotonically decreases | same setup over 10 steps | each step's covariance < previous |

### Covariance properties

@provenance Kalman filter theory -- standard properties of the Riccati recursion

| Test | Input | Expected |
|------|-------|----------|
| Predicted trace >= prior trace | F=[[1,0.1],[0,1]], Q=0.1*I_2, P=I_2 | trace(P_pred) >= trace(P) |
| Updated trace <= predicted trace | F=[[1]], Q=[[0.01]], R=[[1]], P=[[5]] | trace(P_new) <= trace(P_pred) |
| Innovation covariance is symmetric | 2D state, 2D measurement, off-diagonal Q and R | S = S^T (tol 1e-10) |

### Near-zero measurement noise

@provenance Kalman filter theory -- limiting behavior as R -> 0

| Test | Input | Expected |
|------|-------|----------|
| Posterior tracks measurement | R=[[1e-6]], z=[42], start x=[0], P=[[1]] | x_new within 0.01 of 42 |

### Zero process noise convergence

@provenance Kalman filter theory -- limiting behavior as Q -> 0

| Test | Input | Expected |
|------|-------|----------|
| State converges and stops updating | Q=[[0]], R=[[1]], z=10 repeated 50 times, start P=[[100]] | P < 0.05, mean within 0.1 of 10; further steps change mean by < 0.001 |

### Control input

@provenance FilterPy v1.4.5 (API shape), LowLevelParticleFilters.jl v3.7.0 (cross-validation)

| Test | Input | Expected |
|------|-------|----------|
| B*u added to mean | F=[[1]], B=[[1]], x=[5], u=[3] | x_pred = 8 |
| 2D state, 1D control | F=[[1,0.1],[0,1]], B=[[0.005],[0.1]], x=[0,0], u=[10] | x_pred = [0.05, 1.0] |
| No control = zero control | B=[[1]], x=[5], u omitted vs u=[0] | identical mean and covariance |

### kalmanStep equivalence

@provenance Definition -- kalmanStep is syntactic sugar for predict + update

| Test | Input | Expected |
|------|-------|----------|
| Without control | 2D state, F=[[1,1],[0,1]], Q=0.1*I_2, z=[3] | kalmanStep matches manual predict then update (tol 1e-12) for mean, covariance, innovation, gain |
| With control | 1D state, F=[[1]], B=[[0.5]], z=[5], u=[2] | kalmanStep matches manual predict then update (tol 1e-12) |

### Dimension mismatch errors

@provenance Defensive validation -- every dimension pairing is checked

| Test | Expected error |
|------|---------------|
| F columns != state dimension (2x2 F, 1D state) | throws |
| Q dimensions != F dimensions (2x2 Q, 1x1 F) | throws |
| Control provided but B is null | throws |
| Control dimension mismatch with B (1x1 B, 2x1 control) | throws |
| H columns != state dimension in update (1x2 H, 1D state) | throws |
| Measurement dimension != H rows (2x1 z, 1x1 H) | throws |
| R dimensions != measurement dimension (1x1 R, 2D measurement) | throws |
| Measurement not a column vector (1x2 matrix) | throws |
| F not square (1x2 matrix) | throws |
| Control not a column vector (1x2 matrix) | throws |
| B rows != state dimension (1x1 B, 2D state) | throws |

### Multi-dimensional measurement

@provenance Kalman filter theory -- full-state observation

| Test | Input | Expected |
|------|-------|----------|
| 2D state, 2D measurement | F=I_2, H=I_2, Q=0.01*I_2, R=0.5*I_2, z=[5,3], start P=10*I_2 | both state components > 0; K is 2x2 |

### Identity dynamics

@provenance Kalman filter theory -- identity F with zero Q is a no-op predict

| Test | Input | Expected |
|------|-------|----------|
| Predict preserves state | F=I_2, Q=zeros(2,2), x=[3,7], P=[[2,0.5],[0.5,2]] | x_pred = x, P_pred = P (tol 1e-14) |

### Steady-state gain convergence

@provenance Kalman filter theory -- algebraic Riccati equation convergence

| Test | Input | Expected |
|------|-------|----------|
| Gain converges after many iterations | F=[[1]], Q=[[0.01]], R=[[1]], 50 iterations, start P=[[100]] | gain at iteration 41-50 changes by < 1e-4 per step |

### KalmanUpdateResult fields

@provenance Interface contract

| Test | Input | Expected |
|------|-------|----------|
| All fields present | any valid predict + update | state.mean is Matrix, state.covariance is Matrix, innovation is Matrix, innovationCovariance is Matrix, kalmanGain is Matrix |
