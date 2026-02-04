/**
 * Linear Kalman filter — predict and update steps.
 *
 * @node kalman-filter
 * @depends-on mat-ops, state-types
 * @contract kalman-filter.test.ts
 * @hint predict-update: Separated predict/update is the standard decomposition.
 *       Some libraries fuse them; ours keeps them separate for composability.
 * @hint off-policy: Fused vs separated predict/update is the key design choice.
 *       We separate them (like FilterPy, GTSAM). Some libraries fuse (like scipy.signal).
 * @provenance FilterPy v1.4.5 (API shape), LowLevelParticleFilters.jl v3.7.0 (cross-validation)
 */

import {
  Matrix,
  matMultiply,
  matTranspose,
  matAdd,
  matSub,
  matIdentity,
  matInverse,
} from './mat-ops.ts';

import {
  GaussianState,
  LinearSystemModel,
  gaussianState,
} from './state-types.ts';

/** Result of a Kalman update step. */
export interface KalmanUpdateResult {
  /** Updated (posterior) state */
  state: GaussianState;
  /** Innovation (measurement residual): z - H * x_pred */
  innovation: Matrix;
  /** Innovation covariance: H * P_pred * H^T + R */
  innovationCovariance: Matrix;
  /** Kalman gain: P_pred * H^T * S^{-1} */
  kalmanGain: Matrix;
}

/**
 * Kalman filter predict step.
 *
 * Propagates the state forward through the linear dynamics model:
 *   x_pred = F * x + B * u  (with control)
 *   x_pred = F * x           (without control)
 *   P_pred = F * P * F^T + Q
 *
 * @param state  Current Gaussian state (mean and covariance)
 * @param model  Linear system model (F, B, H, Q, R)
 * @param control  Optional control input vector (m×1)
 * @returns Predicted Gaussian state
 */
export function kalmanPredict(
  state: GaussianState,
  model: LinearSystemModel,
  control?: Matrix,
): GaussianState {
  const { F, B, Q } = model;
  const { mean, covariance } = state;

  // Validate dimensions
  if (F.rows !== F.cols) {
    throw new Error(`F must be square, got ${F.rows}×${F.cols}`);
  }
  if (F.cols !== mean.rows) {
    throw new Error(
      `F columns (${F.cols}) must match state dimension (${mean.rows})`,
    );
  }
  if (Q.rows !== F.rows || Q.cols !== F.cols) {
    throw new Error(
      `Q dimensions (${Q.rows}×${Q.cols}) must match F (${F.rows}×${F.cols})`,
    );
  }

  // x_pred = F * x
  let meanPred = matMultiply(F, mean);

  // Add control input if provided
  if (control !== undefined) {
    if (B === null) {
      throw new Error('Control input provided but model has no B matrix');
    }
    if (B.rows !== F.rows) {
      throw new Error(
        `B rows (${B.rows}) must match state dimension (${F.rows})`,
      );
    }
    if (B.cols !== control.rows) {
      throw new Error(
        `B columns (${B.cols}) must match control dimension (${control.rows})`,
      );
    }
    if (control.cols !== 1) {
      throw new Error(
        `Control must be a column vector, got ${control.rows}×${control.cols}`,
      );
    }
    meanPred = matAdd(meanPred, matMultiply(B, control));
  }

  // P_pred = F * P * F^T + Q
  const Ft = matTranspose(F);
  const covPred = matAdd(matMultiply(matMultiply(F, covariance), Ft), Q);

  return gaussianState(meanPred, covPred);
}

/**
 * Kalman filter update step.
 *
 * Incorporates a measurement to refine the predicted state:
 *   y = z - H * x_pred          (innovation)
 *   S = H * P_pred * H^T + R    (innovation covariance)
 *   K = P_pred * H^T * S^{-1}   (Kalman gain)
 *   x_new = x_pred + K * y
 *   P_new = (I - K * H) * P_pred
 *
 * @param predicted  Predicted Gaussian state from kalmanPredict
 * @param measurement  Measurement vector (p×1)
 * @param model  Linear system model (F, B, H, Q, R)
 * @returns Update result with posterior state, innovation, innovation covariance, and Kalman gain
 */
export function kalmanUpdate(
  predicted: GaussianState,
  measurement: Matrix,
  model: LinearSystemModel,
): KalmanUpdateResult {
  const { H, R } = model;
  const { mean, covariance } = predicted;

  // Validate dimensions
  if (measurement.cols !== 1) {
    throw new Error(
      `Measurement must be a column vector, got ${measurement.rows}×${measurement.cols}`,
    );
  }
  if (H.cols !== mean.rows) {
    throw new Error(
      `H columns (${H.cols}) must match state dimension (${mean.rows})`,
    );
  }
  if (H.rows !== measurement.rows) {
    throw new Error(
      `H rows (${H.rows}) must match measurement dimension (${measurement.rows})`,
    );
  }
  if (R.rows !== H.rows || R.cols !== H.rows) {
    throw new Error(
      `R dimensions (${R.rows}×${R.cols}) must match measurement dimension (${H.rows})`,
    );
  }

  // Innovation: y = z - H * x_pred
  const innovation = matSub(measurement, matMultiply(H, mean));

  // Innovation covariance: S = H * P * H^T + R
  const Ht = matTranspose(H);
  const innovationCovariance = matAdd(
    matMultiply(matMultiply(H, covariance), Ht),
    R,
  );

  // Kalman gain: K = P * H^T * S^{-1}
  const Sinv = matInverse(innovationCovariance);
  const kalmanGain = matMultiply(matMultiply(covariance, Ht), Sinv);

  // Updated state: x_new = x_pred + K * y
  const meanNew = matAdd(mean, matMultiply(kalmanGain, innovation));

  // Updated covariance: P_new = (I - K * H) * P
  const n = mean.rows;
  const I = matIdentity(n);
  const covNew = matMultiply(matSub(I, matMultiply(kalmanGain, H)), covariance);

  return {
    state: gaussianState(meanNew, covNew),
    innovation,
    innovationCovariance,
    kalmanGain,
  };
}

/**
 * Combined Kalman filter step: predict then update.
 *
 * Convenience function that calls kalmanPredict followed by kalmanUpdate.
 *
 * @param state  Current Gaussian state
 * @param measurement  Measurement vector (p×1)
 * @param model  Linear system model
 * @param control  Optional control input vector
 * @returns Update result with posterior state, innovation, innovation covariance, and Kalman gain
 */
export function kalmanStep(
  state: GaussianState,
  measurement: Matrix,
  model: LinearSystemModel,
  control?: Matrix,
): KalmanUpdateResult {
  const predicted = kalmanPredict(state, model, control);
  return kalmanUpdate(predicted, measurement, model);
}
