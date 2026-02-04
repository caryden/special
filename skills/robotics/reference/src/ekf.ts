/**
 * Extended Kalman Filter (EKF) for nonlinear systems.
 *
 * Uses first-order Taylor expansion (Jacobians) to linearize the
 * dynamics and measurement models at each time step.
 *
 * @node ekf
 * @depends-on mat-ops, state-types
 * @contract ekf.test.ts
 * @hint jacobians: Caller provides analytic Jacobians. Use finite-diff from
 *       the optimization skill if analytic Jacobians are unavailable.
 * @hint off-policy: Analytic vs numerical Jacobian is key design decision.
 *       We require explicit Jacobians for transparency. Numerical option
 *       can be added via finite-diff dependency.
 * @provenance FilterPy v1.4.5 (API shape), LowLevelParticleFilters.jl v3.7.0
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
  gaussianState,
} from './state-types.ts';

/** Nonlinear dynamics model for EKF */
export interface EKFDynamicsModel {
  /** State transition function: x_pred = f(x, u) */
  f: (state: Matrix, control?: Matrix) => Matrix;
  /** Jacobian of f with respect to state: F = df/dx evaluated at (x, u) */
  F: (state: Matrix, control?: Matrix) => Matrix;
  /** Process noise covariance Q */
  Q: Matrix;
}

/** Nonlinear measurement model for EKF */
export interface EKFMeasurementModel {
  /** Measurement function: z_pred = h(x) */
  h: (state: Matrix) => Matrix;
  /** Jacobian of h with respect to state: H = dh/dx evaluated at x */
  H: (state: Matrix) => Matrix;
  /** Measurement noise covariance R */
  R: Matrix;
}

/** Result of an EKF update step. */
export interface EKFUpdateResult {
  /** Updated (posterior) state */
  state: GaussianState;
  /** Innovation (measurement residual): z - h(x_pred) */
  innovation: Matrix;
  /** Kalman gain */
  kalmanGain: Matrix;
}

/**
 * EKF predict step.
 *
 * Propagates the state forward through the nonlinear dynamics model:
 *   x_pred = f(x, u)
 *   F = dynamics.F(x, u)
 *   P_pred = F * P * F^T + Q
 *
 * @param state  Current Gaussian state (mean and covariance)
 * @param dynamics  Nonlinear dynamics model with f, F (Jacobian), and Q
 * @param control  Optional control input vector
 * @returns Predicted Gaussian state
 */
export function ekfPredict(
  state: GaussianState,
  dynamics: EKFDynamicsModel,
  control?: Matrix,
): GaussianState {
  const { mean, covariance } = state;

  // Propagate state through nonlinear dynamics
  const meanPred = dynamics.f(mean, control);

  // Evaluate Jacobian at current state
  const F = dynamics.F(mean, control);

  // Propagate covariance: P_pred = F * P * F^T + Q
  const Ft = matTranspose(F);
  const covPred = matAdd(
    matMultiply(matMultiply(F, covariance), Ft),
    dynamics.Q,
  );

  return gaussianState(meanPred, covPred);
}

/**
 * EKF update step.
 *
 * Incorporates a measurement to refine the predicted state:
 *   z_pred = h(x_pred)
 *   H = measurementModel.H(x_pred)
 *   y = z - z_pred                   (innovation)
 *   S = H * P_pred * H^T + R         (innovation covariance)
 *   K = P_pred * H^T * S^{-1}        (Kalman gain)
 *   x_new = x_pred + K * y
 *   P_new = (I - K * H) * P_pred
 *
 * @param predicted  Predicted Gaussian state from ekfPredict
 * @param measurement  Measurement vector (p x 1)
 * @param measurementModel  Nonlinear measurement model with h, H (Jacobian), and R
 * @returns Update result with posterior state, innovation, and Kalman gain
 */
export function ekfUpdate(
  predicted: GaussianState,
  measurement: Matrix,
  measurementModel: EKFMeasurementModel,
): EKFUpdateResult {
  const { mean, covariance } = predicted;

  // Predicted measurement
  const zPred = measurementModel.h(mean);

  // Measurement Jacobian at predicted state
  const H = measurementModel.H(mean);

  // Innovation: y = z - h(x_pred)
  const innovation = matSub(measurement, zPred);

  // Innovation covariance: S = H * P * H^T + R
  const Ht = matTranspose(H);
  const S = matAdd(matMultiply(matMultiply(H, covariance), Ht), measurementModel.R);

  // Kalman gain: K = P * H^T * S^{-1}
  const Sinv = matInverse(S);
  const kalmanGain = matMultiply(matMultiply(covariance, Ht), Sinv);

  // Updated state: x_new = x_pred + K * y
  const meanNew = matAdd(mean, matMultiply(kalmanGain, innovation));

  // Updated covariance: P_new = (I - K * H) * P_pred
  const n = mean.rows;
  const I = matIdentity(n);
  const covNew = matMultiply(matSub(I, matMultiply(kalmanGain, H)), covariance);

  return {
    state: gaussianState(meanNew, covNew),
    innovation,
    kalmanGain,
  };
}

/**
 * Combined EKF step: predict then update.
 *
 * Convenience function that calls ekfPredict followed by ekfUpdate.
 *
 * @param state  Current Gaussian state
 * @param measurement  Measurement vector (p x 1)
 * @param dynamics  Nonlinear dynamics model
 * @param measurementModel  Nonlinear measurement model
 * @param control  Optional control input vector
 * @returns Update result with posterior state, innovation, and Kalman gain
 */
export function ekfStep(
  state: GaussianState,
  measurement: Matrix,
  dynamics: EKFDynamicsModel,
  measurementModel: EKFMeasurementModel,
  control?: Matrix,
): EKFUpdateResult {
  const predicted = ekfPredict(state, dynamics, control);
  return ekfUpdate(predicted, measurement, measurementModel);
}
