/**
 * State estimation types for Kalman filters and related algorithms.
 *
 * @node state-types
 * @depends-on mat-ops
 * @contract state-types.test.ts
 * @hint types: Use Matrix class from mat-ops for mean vectors and covariance matrices.
 * @hint translation: Map GaussianState to language-native structs/classes.
 */

import { Matrix, matIdentity, matZeros, matScale } from './mat-ops.ts';

/** Gaussian-distributed state: mean vector and covariance matrix */
export interface GaussianState {
  /** State mean vector (n×1 column vector) */
  mean: Matrix;
  /** State covariance matrix (n×n symmetric positive semi-definite) */
  covariance: Matrix;
}

/** Linear system model matrices for Kalman filter */
export interface LinearSystemModel {
  /** State transition matrix F (n×n) */
  F: Matrix;
  /** Control input matrix B (n×m), or null if no control */
  B: Matrix | null;
  /** Measurement matrix H (p×n) */
  H: Matrix;
  /** Process noise covariance Q (n×n) */
  Q: Matrix;
  /** Measurement noise covariance R (p×p) */
  R: Matrix;
}

/**
 * Create a GaussianState with given dimension, initialized to zero mean
 * and identity covariance (scaled by initialVariance).
 */
export function initialGaussianState(dimension: number, initialVariance?: number): GaussianState {
  const mean = matZeros(dimension, 1);
  const variance = initialVariance ?? 1.0;
  const covariance = matScale(matIdentity(dimension), variance);
  return { mean, covariance };
}

/**
 * Create a GaussianState from explicit mean and covariance.
 * Mean should be n×1, covariance should be n×n.
 */
export function gaussianState(mean: Matrix, covariance: Matrix): GaussianState {
  if (mean.cols !== 1) throw new Error(`Mean must be a column vector (n×1), got ${mean.rows}×${mean.cols}`);
  if (covariance.rows !== covariance.cols) throw new Error(`Covariance must be square, got ${covariance.rows}×${covariance.cols}`);
  if (mean.rows !== covariance.rows) throw new Error(`Dimension mismatch: mean is ${mean.rows}×1, covariance is ${covariance.rows}×${covariance.cols}`);
  return { mean, covariance };
}

/**
 * Create a GaussianState from a plain number array for mean
 * and a 2D array for covariance.
 */
export function gaussianStateFromArrays(mean: number[], covariance: number[][]): GaussianState {
  const meanMatrix = Matrix.fromArray(mean.map(v => [v]));
  const covMatrix = Matrix.fromArray(covariance);
  return gaussianState(meanMatrix, covMatrix);
}

/**
 * Get the state dimension from a GaussianState.
 */
export function stateDimension(state: GaussianState): number {
  return state.mean.rows;
}

/**
 * Extract the mean as a plain number array.
 */
export function meanToArray(state: GaussianState): number[] {
  const result: number[] = [];
  for (let i = 0; i < state.mean.rows; i++) {
    result.push(state.mean.get(i, 0));
  }
  return result;
}

/**
 * Extract the covariance as a 2D array.
 */
export function covarianceToArray(state: GaussianState): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < state.covariance.rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < state.covariance.cols; j++) {
      row.push(state.covariance.get(i, j));
    }
    result.push(row);
  }
  return result;
}
