/**
 * Unscented Kalman Filter (UKF) using Van der Merwe scaled sigma points.
 *
 * The UKF avoids explicit Jacobian computation by propagating a deterministic
 * set of sigma points through the nonlinear model, then recovering statistics.
 *
 * @node ukf
 * @depends-on mat-ops, state-types
 * @contract ukf.test.ts
 * @hint sigma-points: Van der Merwe scaled sigma points (default alpha=1e-3, beta=2, kappa=0)
 * @hint off-policy: UKF vs EKF is the key design choice. UKF is preferred when
 *       Jacobians are difficult to derive or the system is highly nonlinear.
 * @provenance FilterPy v1.4.5 (API shape and sigma point scheme)
 * @provenance Wan & van der Merwe "The Unscented Kalman Filter for Nonlinear Estimation" 2000
 */

import {
  Matrix,
  matMultiply,
  matTranspose,
  matAdd,
  matSub,
  matScale,
  matIdentity,
  matInverse,
  matCholesky,
} from './mat-ops.ts';

import type { GaussianState } from './state-types.ts';
import { gaussianState } from './state-types.ts';

/** UKF tuning parameters for sigma point generation. */
export interface UKFParams {
  /** Spread of sigma points around mean. Typically 1e-3. */
  alpha: number;
  /** Prior knowledge of distribution (2 for Gaussian). */
  beta: number;
  /** Secondary scaling parameter. Typically 0. */
  kappa: number;
}

/** Default UKF parameters matching FilterPy defaults. */
export const DEFAULT_UKF_PARAMS: UKFParams = {
  alpha: 1e-3,
  beta: 2,
  kappa: 0,
};

/** Computed sigma point weights. */
export interface SigmaWeights {
  /** Weights for mean reconstruction (2n+1 values) */
  weightsMean: number[];
  /** Weights for covariance reconstruction (2n+1 values) */
  weightsCov: number[];
}

/**
 * Compute sigma point weights for a given state dimension.
 *
 * The Van der Merwe scaled scheme generates 2n+1 sigma points:
 *   lambda = alpha^2 * (n + kappa) - n
 *   W_m[0] = lambda / (n + lambda)
 *   W_c[0] = lambda / (n + lambda) + (1 - alpha^2 + beta)
 *   W_m[i] = W_c[i] = 1 / (2*(n + lambda))   for i = 1..2n
 *
 * @param n  State dimension
 * @param params  UKF tuning parameters
 * @returns Sigma point weights for mean and covariance
 */
export function ukfComputeWeights(n: number, params: UKFParams = DEFAULT_UKF_PARAMS): SigmaWeights {
  const { alpha, beta, kappa } = params;
  const lambda = alpha * alpha * (n + kappa) - n;
  const nPlusLambda = n + lambda;

  const weightsMean: number[] = new Array(2 * n + 1);
  const weightsCov: number[] = new Array(2 * n + 1);

  weightsMean[0] = lambda / nPlusLambda;
  weightsCov[0] = lambda / nPlusLambda + (1 - alpha * alpha + beta);

  const w = 1 / (2 * nPlusLambda);
  for (let i = 1; i <= 2 * n; i++) {
    weightsMean[i] = w;
    weightsCov[i] = w;
  }

  return { weightsMean, weightsCov };
}

/**
 * Generate 2n+1 sigma points from a Gaussian state.
 *
 * Sigma points are computed as:
 *   X_0 = mean
 *   X_i = mean + sqrt((n + lambda) * P)_i       for i = 1..n
 *   X_{n+i} = mean - sqrt((n + lambda) * P)_i   for i = 1..n
 *
 * where sqrt(P) is the Cholesky decomposition (lower triangular).
 *
 * @param state  Gaussian state (mean and covariance)
 * @param params  UKF tuning parameters
 * @returns Array of 2n+1 sigma points, each as a column vector (Matrix n×1)
 */
export function ukfGenerateSigmaPoints(
  state: GaussianState,
  params: UKFParams = DEFAULT_UKF_PARAMS,
): Matrix[] {
  const { mean, covariance } = state;
  const n = mean.rows;
  const { alpha, kappa } = params;
  const lambda = alpha * alpha * (n + kappa) - n;
  const scaleFactor = n + lambda;

  // Scale covariance and compute Cholesky
  const scaledP = matScale(covariance, scaleFactor);
  const L = matCholesky(scaledP);

  const sigmaPoints: Matrix[] = new Array(2 * n + 1);

  // X_0 = mean
  sigmaPoints[0] = new Matrix(n, 1, mean.data.slice());

  // X_i and X_{n+i}
  for (let i = 0; i < n; i++) {
    // Extract column i of L as a column vector
    const colData = new Array(n);
    for (let r = 0; r < n; r++) {
      colData[r] = L.get(r, i);
    }
    const col = new Matrix(n, 1, colData);

    sigmaPoints[i + 1] = matAdd(mean, col);
    sigmaPoints[n + i + 1] = matSub(mean, col);
  }

  return sigmaPoints;
}

/**
 * Compute weighted mean and covariance from sigma points.
 *
 * Used internally after propagating sigma points through a nonlinear function.
 *
 * @param sigmaPoints  Array of 2n+1 transformed sigma points
 * @param weights  Sigma point weights
 * @param noiseCov  Additive noise covariance (Q for process, R for measurement)
 * @returns Gaussian state with reconstructed mean and covariance
 */
export function ukfUnscentedTransform(
  sigmaPoints: Matrix[],
  weights: SigmaWeights,
  noiseCov: Matrix,
): GaussianState {
  const numPoints = sigmaPoints.length;
  const dim = sigmaPoints[0].rows;
  const { weightsMean, weightsCov } = weights;

  // Weighted mean: x = sum(W_m[i] * X_i)
  let meanData = new Array(dim).fill(0);
  for (let i = 0; i < numPoints; i++) {
    for (let r = 0; r < dim; r++) {
      meanData[r] += weightsMean[i] * sigmaPoints[i].get(r, 0);
    }
  }
  const mean = new Matrix(dim, 1, meanData);

  // Weighted covariance: P = sum(W_c[i] * (X_i - x)(X_i - x)^T) + noiseCov
  const covData = new Array(dim * dim).fill(0);
  for (let i = 0; i < numPoints; i++) {
    const diff = new Array(dim);
    for (let r = 0; r < dim; r++) {
      diff[r] = sigmaPoints[i].get(r, 0) - mean.get(r, 0);
    }
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        covData[r * dim + c] += weightsCov[i] * diff[r] * diff[c];
      }
    }
  }
  const cov = matAdd(new Matrix(dim, dim, covData), noiseCov);

  return gaussianState(mean, cov);
}

/**
 * Compute weighted cross-covariance between two sets of sigma points.
 *
 * P_xz = sum(W_c[i] * (X_i - x_mean)(Z_i - z_mean)^T)
 *
 * @param sigmaPointsX  State sigma points
 * @param meanX  State mean
 * @param sigmaPointsZ  Measurement sigma points
 * @param meanZ  Measurement mean
 * @param weights  Sigma point weights
 * @returns Cross-covariance matrix (n_x × n_z)
 */
export function ukfCrossCovariance(
  sigmaPointsX: Matrix[],
  meanX: Matrix,
  sigmaPointsZ: Matrix[],
  meanZ: Matrix,
  weights: SigmaWeights,
): Matrix {
  const nx = meanX.rows;
  const nz = meanZ.rows;
  const numPoints = sigmaPointsX.length;
  const { weightsCov } = weights;

  const crossCovData = new Array(nx * nz).fill(0);
  for (let i = 0; i < numPoints; i++) {
    const diffX = new Array(nx);
    const diffZ = new Array(nz);
    for (let r = 0; r < nx; r++) {
      diffX[r] = sigmaPointsX[i].get(r, 0) - meanX.get(r, 0);
    }
    for (let r = 0; r < nz; r++) {
      diffZ[r] = sigmaPointsZ[i].get(r, 0) - meanZ.get(r, 0);
    }
    for (let r = 0; r < nx; r++) {
      for (let c = 0; c < nz; c++) {
        crossCovData[r * nz + c] += weightsCov[i] * diffX[r] * diffZ[c];
      }
    }
  }

  return new Matrix(nx, nz, crossCovData);
}

/** Result of a UKF update step. */
export interface UKFUpdateResult {
  /** Updated (posterior) state */
  state: GaussianState;
  /** Innovation (measurement residual) */
  innovation: Matrix;
  /** Kalman gain */
  kalmanGain: Matrix;
}

/**
 * UKF predict step.
 *
 * Generates sigma points, propagates them through the dynamics function,
 * then reconstructs mean and covariance via unscented transform.
 *
 * @param state  Current Gaussian state
 * @param f  Nonlinear state transition: x_{k+1} = f(x_k, u_k)
 * @param Q  Process noise covariance
 * @param control  Optional control input
 * @param params  UKF tuning parameters
 * @returns Predicted Gaussian state
 */
export function ukfPredict(
  state: GaussianState,
  f: (x: Matrix, u?: Matrix) => Matrix,
  Q: Matrix,
  control?: Matrix,
  params: UKFParams = DEFAULT_UKF_PARAMS,
): { predicted: GaussianState; sigmaPoints: Matrix[] } {
  const n = state.mean.rows;
  const weights = ukfComputeWeights(n, params);

  // Generate sigma points from current state
  const sigmaPoints = ukfGenerateSigmaPoints(state, params);

  // Propagate each sigma point through dynamics
  const propagated: Matrix[] = new Array(sigmaPoints.length);
  for (let i = 0; i < sigmaPoints.length; i++) {
    propagated[i] = f(sigmaPoints[i], control);
  }

  // Reconstruct mean and covariance
  const predicted = ukfUnscentedTransform(propagated, weights, Q);

  return { predicted, sigmaPoints: propagated };
}

/**
 * UKF update step.
 *
 * Generates sigma points from the predicted state, propagates them through
 * the measurement function, then computes innovation and Kalman gain.
 *
 * @param predicted  Predicted Gaussian state from ukfPredict
 * @param measurement  Measurement vector (p×1)
 * @param h  Nonlinear measurement function: z = h(x)
 * @param R  Measurement noise covariance
 * @param params  UKF tuning parameters
 * @returns Update result with posterior state, innovation, and Kalman gain
 */
export function ukfUpdate(
  predicted: GaussianState,
  measurement: Matrix,
  h: (x: Matrix) => Matrix,
  R: Matrix,
  params: UKFParams = DEFAULT_UKF_PARAMS,
): UKFUpdateResult {
  const n = predicted.mean.rows;
  const weights = ukfComputeWeights(n, params);

  // Generate sigma points from predicted state
  const sigmaPoints = ukfGenerateSigmaPoints(predicted, params);

  // Propagate sigma points through measurement function
  const zSigma: Matrix[] = new Array(sigmaPoints.length);
  for (let i = 0; i < sigmaPoints.length; i++) {
    zSigma[i] = h(sigmaPoints[i]);
  }

  // Measurement mean and covariance via unscented transform
  const measurementState = ukfUnscentedTransform(zSigma, weights, R);

  // Cross-covariance P_xz
  const Pxz = ukfCrossCovariance(
    sigmaPoints,
    predicted.mean,
    zSigma,
    measurementState.mean,
    weights,
  );

  // Kalman gain: K = P_xz * S^{-1}
  const Sinv = matInverse(measurementState.covariance);
  const kalmanGain = matMultiply(Pxz, Sinv);

  // Innovation
  const innovation = matSub(measurement, measurementState.mean);

  // Updated state: x = x_pred + K * innovation
  const meanNew = matAdd(predicted.mean, matMultiply(kalmanGain, innovation));

  // Updated covariance: P = P_pred - K * S * K^T
  const KSKt = matMultiply(
    matMultiply(kalmanGain, measurementState.covariance),
    matTranspose(kalmanGain),
  );
  const covNew = matSub(predicted.covariance, KSKt);

  return {
    state: gaussianState(meanNew, covNew),
    innovation,
    kalmanGain,
  };
}

/**
 * Combined UKF step: predict then update.
 *
 * @param state  Current Gaussian state
 * @param measurement  Measurement vector (p×1)
 * @param f  Nonlinear state transition function
 * @param h  Nonlinear measurement function
 * @param Q  Process noise covariance
 * @param R  Measurement noise covariance
 * @param control  Optional control input
 * @param params  UKF tuning parameters
 * @returns Update result with posterior state, innovation, and Kalman gain
 */
export function ukfStep(
  state: GaussianState,
  measurement: Matrix,
  f: (x: Matrix, u?: Matrix) => Matrix,
  h: (x: Matrix) => Matrix,
  Q: Matrix,
  R: Matrix,
  control?: Matrix,
  params: UKFParams = DEFAULT_UKF_PARAMS,
): UKFUpdateResult {
  const { predicted } = ukfPredict(state, f, Q, control, params);
  return ukfUpdate(predicted, measurement, h, R, params);
}
