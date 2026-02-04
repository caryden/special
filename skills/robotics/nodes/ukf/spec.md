# ukf — Spec

Depends on: `mat-ops`, `state-types`

## Purpose

Unscented Kalman Filter using Van der Merwe scaled sigma points. Propagates a
GaussianState through nonlinear dynamics and measurement functions without computing
explicit Jacobians. Instead, it deterministically samples "sigma points" from the
current distribution, pushes them through the nonlinear function, and recovers the
transformed mean and covariance from the weighted samples.

## Conventions

### Sigma point parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `alpha` | 1e-3 | Controls spread of sigma points around the mean. Smaller values keep points closer. |
| `beta` | 2 | Incorporates prior knowledge of the distribution. beta=2 is optimal for Gaussian. |
| `kappa` | 0 | Secondary scaling parameter. Usually 0 for state estimation. |

Derived quantity: `lambda = alpha^2 * (n + kappa) - n` where `n` is the state dimension.

The number of sigma points is always `2n + 1`.

## Types

### UKFParams

| Field | Type | Description |
|-------|------|-------------|
| `alpha` | number | Spread of sigma points around the mean |
| `beta` | number | Distribution prior knowledge (2 = Gaussian) |
| `kappa` | number | Secondary scaling parameter |

### DEFAULT_UKF_PARAMS

Constant: `{ alpha: 1e-3, beta: 2, kappa: 0 }`

### SigmaWeights

| Field | Type | Description |
|-------|------|-------------|
| `weightsMean` | number[] | Weights for computing the weighted mean (length 2n+1) |
| `weightsCov` | number[] | Weights for computing the weighted covariance (length 2n+1) |

### UKFUpdateResult

| Field | Type | Description |
|-------|------|-------------|
| `state` | GaussianState | Posterior state estimate after incorporating measurement |
| `innovation` | Matrix | Measurement residual: z - h(x_predicted) (p x 1) |
| `kalmanGain` | Matrix | Kalman gain matrix (n x p) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ukfComputeWeights` | `(n, params?) -> SigmaWeights` | Compute mean and covariance weights for n-dimensional state |
| `ukfGenerateSigmaPoints` | `(state, params?) -> Matrix[]` | Generate 2n+1 sigma points from a GaussianState |
| `ukfUnscentedTransform` | `(sigmaPoints, weights, noiseCov) -> GaussianState` | Recover mean and covariance from transformed sigma points |
| `ukfCrossCovariance` | `(sigmaPointsX, meanX, sigmaPointsZ, meanZ, weights) -> Matrix` | Cross-covariance between two sets of sigma points |
| `ukfPredict` | `(state, f, Q, control?, params?) -> { predicted, sigmaPoints }` | Predict step: propagate state through dynamics f, add process noise Q |
| `ukfUpdate` | `(predicted, measurement, h, R, params?) -> UKFUpdateResult` | Update step: incorporate measurement through observation function h |
| `ukfStep` | `(state, measurement, f, h, Q, R, control?, params?) -> UKFUpdateResult` | Combined predict + update in a single call |

## Test Vectors

@provenance Wan & van der Merwe "The Unscented Kalman Filter for Nonlinear Estimation" (2000), FilterPy v1.4.5 (API shape and sigma point scheme)

### Weight computation

| Test | Expected |
|------|----------|
| n=2, default params | 5 mean weights, 5 covariance weights |
| n=4, default params | 9 mean weights, 9 covariance weights |
| Mean weights sum | sum(weightsMean) = 1 |
| W_m[0] formula | lambda / (n + lambda) where lambda = alpha^2 * (n + kappa) - n |
| W_c[0] formula | W_m[0] + (1 - alpha^2 + beta) |
| Subsequent weights | W_m[i] = W_c[i] = 1 / (2*(n + lambda)) for i > 0 |
| Custom params (alpha=0.5, beta=2, kappa=1) | Produces different weights than default |

### Sigma point generation

| Test | Expected |
|------|----------|
| n=2, default params | 5 sigma points (2*2+1) |
| n=4, default params | 9 sigma points (2*4+1) |
| First sigma point | Equals the mean vector |
| Identity covariance | Sigma points symmetric around mean |
| All points shape | Each point is an n x 1 column vector |
| Larger alpha | Greater spread from the mean |

### Unscented transform

| Test | Expected |
|------|----------|
| Identity transform (f = x) | Recovered mean equals original mean |
| Identity transform (f = x) | Recovered covariance equals original covariance |
| With noise covariance R | Result covariance = transformed covariance + R |

### Cross-covariance

| Test | Expected |
|------|----------|
| Identical sigma point sets | Cross-covariance equals self-covariance |
| Different state/measurement dimensions | Result dimensions = n_state x n_meas |

### Predict

| Test | Expected |
|------|----------|
| Linear constant velocity, dt=0.1, state=[0,1] | x_pred = [0.1, 1.0] |
| Return value | Contains 2n+1 propagated sigma points |
| Larger process noise Q | Predicted covariance grows |
| With control input (control=5) | Mean shifts toward control effect (mean ~ 5) |

### Update

| Test | Expected |
|------|----------|
| Direct observation (h = x) | Posterior moves toward measurement |
| Innovation | innovation = measurement - predicted measurement |
| Kalman gain shape | n_state x n_meas |
| High measurement noise R | Posterior stays near prior |
| Covariance reduction | Posterior covariance < prior covariance |

### ukfStep

| Test | Expected |
|------|----------|
| Combines predict and update | Equivalent to calling ukfPredict then ukfUpdate |
| With control input | Control is forwarded to predict |
| Custom UKF params | Params forwarded to both predict and update |

### Multi-step convergence

| Test | Expected |
|------|----------|
| 1D constant position, 10 measurements near 5.0 | State converges to true value ~ 5.0 |
| 2D constant velocity, 20 steps | Velocity ~ 1, position ~ 10 |
| Nonlinear range measurement h = sqrt(x^2 + y^2) | Maintains distance estimate ~ 5 |

### Edge cases

| Test | Expected |
|------|----------|
| 1D state | 3 sigma points (2*1+1) |
| Large state dimension n=6 | 13 sigma points (2*6+1) |
| DEFAULT_UKF_PARAMS values | alpha=1e-3, beta=2, kappa=0 |
