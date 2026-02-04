/**
 * State estimation dispatcher.
 *
 * Provides a unified interface for Bayesian state estimation using one of
 * three methods: kalman (linear KF), ekf (Extended KF), or ukf (Unscented KF).
 *
 * @node estimate-state
 * @depends-on state-types, any-of(kalman-filter, ekf, ukf)
 * @contract estimate-state.test.ts
 * @hint dispatcher: Thin routing layer — all real logic lives in downstream nodes.
 * @hint default: Uses 'kalman' if no method specified.
 */

import { Matrix } from './mat-ops.ts';
import type { GaussianState, LinearSystemModel } from './state-types.ts';
import { kalmanStep, type KalmanUpdateResult } from './kalman-filter.ts';
import { ekfStep, type EKFDynamicsModel, type EKFMeasurementModel, type EKFUpdateResult } from './ekf.ts';
import { ukfStep, type UKFParams, DEFAULT_UKF_PARAMS, type UKFUpdateResult } from './ukf.ts';

/** Available state estimation methods */
export type EstimationMethod = 'kalman' | 'ekf' | 'ukf';

/** Kalman filter model specification */
export interface KalmanModelSpec {
  method: 'kalman';
  model: LinearSystemModel;
}

/** EKF model specification */
export interface EKFModelSpec {
  method: 'ekf';
  dynamics: EKFDynamicsModel;
  measurement: EKFMeasurementModel;
}

/** UKF model specification */
export interface UKFModelSpec {
  method: 'ukf';
  /** State transition function: x_pred = f(x, u) */
  f: (x: Matrix, u?: Matrix) => Matrix;
  /** Measurement function: z_pred = h(x) */
  h: (x: Matrix) => Matrix;
  /** Process noise covariance */
  Q: Matrix;
  /** Measurement noise covariance */
  R: Matrix;
  /** UKF sigma point parameters */
  params?: UKFParams;
}

/** Union of all model specifications */
export type ModelSpec = KalmanModelSpec | EKFModelSpec | UKFModelSpec;

/** Union of all estimation results */
export type EstimationResult = KalmanUpdateResult | EKFUpdateResult | UKFUpdateResult;

/**
 * Run one estimation step (predict + update) using the specified method.
 *
 * @param state  Current Gaussian state (mean and covariance)
 * @param measurement  Observation vector
 * @param spec  Model specification (includes method selection)
 * @param control  Optional control input
 * @returns Estimation result with updated state, innovation, and gain
 */
export function estimateState(
  state: GaussianState,
  measurement: Matrix,
  spec: ModelSpec,
  control?: Matrix,
): EstimationResult {
  switch (spec.method) {
    case 'kalman':
      return kalmanStep(state, measurement, spec.model, control);

    case 'ekf':
      return ekfStep(state, measurement, spec.dynamics, spec.measurement, control);

    case 'ukf':
      return ukfStep(
        state, measurement, spec.f, spec.h, spec.Q, spec.R,
        control, spec.params ?? DEFAULT_UKF_PARAMS,
      );
  }
}
