import { describe, test, expect } from 'bun:test';
import {
  Matrix,
  matMultiply,
  matTranspose,
  matAdd,
  matIdentity,
  matInverse,
  matTrace,
} from './mat-ops.ts';
import type { GaussianState } from './state-types.ts';
import {
  gaussianState,
  gaussianStateFromArrays,
  initialGaussianState,
  meanToArray,
  covarianceToArray,
} from './state-types.ts';
import type { EKFDynamicsModel, EKFMeasurementModel, EKFUpdateResult } from './ekf.ts';
import {
  ekfPredict,
  ekfUpdate,
  ekfStep,
} from './ekf.ts';
import {
  kalmanPredict,
  kalmanUpdate,
} from './kalman-filter.ts';
import type { LinearSystemModel } from './state-types.ts';

// ---------------------------------------------------------------------------
// Test 1: Linear system — EKF should match KF
// ---------------------------------------------------------------------------
describe('EKF on linear system matches KF', () => {
  const F_mat = Matrix.fromArray([[1]]);
  const H_mat = Matrix.fromArray([[1]]);
  const Q_mat = Matrix.fromArray([[0.01]]);
  const R_mat = Matrix.fromArray([[1]]);

  const linearModel: LinearSystemModel = {
    F: F_mat,
    B: null,
    H: H_mat,
    Q: Q_mat,
    R: R_mat,
  };

  const ekfDynamics: EKFDynamicsModel = {
    f: (x: Matrix) => matMultiply(F_mat, x),
    F: (_x: Matrix) => F_mat,
    Q: Q_mat,
  };

  const ekfMeasurement: EKFMeasurementModel = {
    h: (x: Matrix) => matMultiply(H_mat, x),
    H: (_x: Matrix) => H_mat,
    R: R_mat,
  };

  test('1D constant model: predict matches KF predict', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const ekfPred = ekfPredict(state, ekfDynamics);
    const kfPred = kalmanPredict(state, linearModel);

    expect(meanToArray(ekfPred)[0]).toBeCloseTo(meanToArray(kfPred)[0], 10);
    expect(covarianceToArray(ekfPred)[0][0]).toBeCloseTo(
      covarianceToArray(kfPred)[0][0],
      10,
    );
  });

  test('1D constant model: update matches KF update', () => {
    const predicted = gaussianStateFromArrays([0], [[1.01]]);
    const z = Matrix.fromArray([[0.5]]);

    const ekfResult = ekfUpdate(predicted, z, ekfMeasurement);
    const kfResult = kalmanUpdate(predicted, z, linearModel);

    expect(meanToArray(ekfResult.state)[0]).toBeCloseTo(
      meanToArray(kfResult.state)[0],
      10,
    );
    expect(covarianceToArray(ekfResult.state)[0][0]).toBeCloseTo(
      covarianceToArray(kfResult.state)[0][0],
      10,
    );
  });

  test('1D constant model: 5 measurements converge', () => {
    const measurements = [1.1, 0.9, 1.05, 0.95, 1.0];
    let state = gaussianStateFromArrays([0], [[10]]);

    for (const z of measurements) {
      const predicted = ekfPredict(state, ekfDynamics);
      const result = ekfUpdate(
        predicted,
        Matrix.fromArray([[z]]),
        ekfMeasurement,
      );
      state = result.state;
    }

    // Mean should converge near 1.0
    const mean = meanToArray(state)[0];
    expect(Math.abs(mean - 1.0)).toBeLessThan(0.2);

    // Covariance should shrink from initial 10
    const cov = covarianceToArray(state)[0][0];
    expect(cov).toBeLessThan(1);
  });

  test('2D linear system matches KF', () => {
    const F2 = Matrix.fromArray([
      [1, 0.1],
      [0, 1],
    ]);
    const H2 = Matrix.fromArray([[1, 0]]);
    const Q2 = Matrix.fromArray([
      [0.01, 0],
      [0, 0.01],
    ]);
    const R2 = Matrix.fromArray([[0.5]]);

    const linearModel2: LinearSystemModel = {
      F: F2,
      B: null,
      H: H2,
      Q: Q2,
      R: R2,
    };

    const ekfDyn2: EKFDynamicsModel = {
      f: (x: Matrix) => matMultiply(F2, x),
      F: (_x: Matrix) => F2,
      Q: Q2,
    };

    const ekfMeas2: EKFMeasurementModel = {
      h: (x: Matrix) => matMultiply(H2, x),
      H: (_x: Matrix) => H2,
      R: R2,
    };

    let ekfState = gaussianStateFromArrays([0, 0], [
      [1, 0],
      [0, 1],
    ]);
    let kfState = gaussianStateFromArrays([0, 0], [
      [1, 0],
      [0, 1],
    ]);

    const measurements = [1.0, 1.2, 1.5, 1.9, 2.4];
    for (const z of measurements) {
      const ekfPred = ekfPredict(ekfState, ekfDyn2);
      const kfPred = kalmanPredict(kfState, linearModel2);
      const ekfRes = ekfUpdate(ekfPred, Matrix.fromArray([[z]]), ekfMeas2);
      const kfRes = kalmanUpdate(kfPred, Matrix.fromArray([[z]]), linearModel2);

      ekfState = ekfRes.state;
      kfState = kfRes.state;
    }

    const ekfMean = meanToArray(ekfState);
    const kfMean = meanToArray(kfState);
    expect(ekfMean[0]).toBeCloseTo(kfMean[0], 8);
    expect(ekfMean[1]).toBeCloseTo(kfMean[1], 8);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Nonlinear range measurement
// ---------------------------------------------------------------------------
describe('Nonlinear range measurement', () => {
  const trueX = 3;
  const trueY = 4;
  const trueRange = 5; // sqrt(9+16)

  const dynamics: EKFDynamicsModel = {
    f: (x: Matrix) => x, // static target
    F: (x: Matrix) => matIdentity(x.rows),
    Q: Matrix.fromArray([
      [0.001, 0],
      [0, 0.001],
    ]),
  };

  const rangeMeasurement: EKFMeasurementModel = {
    h: (x: Matrix) => {
      const px = x.get(0, 0);
      const py = x.get(1, 0);
      const r = Math.sqrt(px * px + py * py);
      return Matrix.fromArray([[r]]);
    },
    H: (x: Matrix) => {
      const px = x.get(0, 0);
      const py = x.get(1, 0);
      const r = Math.sqrt(px * px + py * py);
      // Guard against division by zero
      const safeR = r < 1e-10 ? 1e-10 : r;
      return Matrix.fromArray([[px / safeR, py / safeR]]);
    },
    R: Matrix.fromArray([[0.1]]),
  };

  test('converges toward true position with range measurements', () => {
    // Initial guess near the true position
    let state = gaussianStateFromArrays([2.5, 3.5], [
      [2, 0],
      [0, 2],
    ]);

    // Multiple noisy range measurements
    const rangeMeasurements = [5.0, 4.95, 5.05, 5.0, 4.98, 5.02, 5.0, 5.01];
    for (const r of rangeMeasurements) {
      const result = ekfStep(
        state,
        Matrix.fromArray([[r]]),
        dynamics,
        rangeMeasurement,
      );
      state = result.state;
    }

    const mean = meanToArray(state);
    // Position should move toward the circle of radius 5
    const estimatedRange = Math.sqrt(mean[0] * mean[0] + mean[1] * mean[1]);
    expect(Math.abs(estimatedRange - 5)).toBeLessThan(0.5);
  });

  test('covariance decreases with measurements', () => {
    let state = gaussianStateFromArrays([2.5, 3.5], [
      [2, 0],
      [0, 2],
    ]);
    const initialTrace = matTrace(state.covariance);

    for (let i = 0; i < 10; i++) {
      const result = ekfStep(
        state,
        Matrix.fromArray([[5.0]]),
        dynamics,
        rangeMeasurement,
      );
      state = result.state;
    }

    const finalTrace = matTrace(state.covariance);
    expect(finalTrace).toBeLessThan(initialTrace);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Nonlinear pendulum
// ---------------------------------------------------------------------------
describe('Nonlinear pendulum', () => {
  const g = 9.81;
  const L = 1.0;
  const dt = 0.01;

  const pendulumDynamics: EKFDynamicsModel = {
    f: (x: Matrix) => {
      const theta = x.get(0, 0);
      const omega = x.get(1, 0);
      return Matrix.fromArray([
        [theta + omega * dt],
        [omega - (g / L) * Math.sin(theta) * dt],
      ]);
    },
    F: (x: Matrix) => {
      const theta = x.get(0, 0);
      return Matrix.fromArray([
        [1, dt],
        [-(g / L) * Math.cos(theta) * dt, 1],
      ]);
    },
    Q: Matrix.fromArray([
      [1e-6, 0],
      [0, 1e-6],
    ]),
  };

  const angleMeasurement: EKFMeasurementModel = {
    h: (x: Matrix) => Matrix.fromArray([[x.get(0, 0)]]),
    H: (_x: Matrix) => Matrix.fromArray([[1, 0]]),
    R: Matrix.fromArray([[0.01]]),
  };

  test('tracks small-angle pendulum', () => {
    // True initial state: small angle, zero velocity
    const trueTheta0 = 0.1;
    const trueOmega0 = 0;

    // Simulated true trajectory
    let trueTheta = trueTheta0;
    let trueOmega = trueOmega0;

    // EKF starts with uncertain estimate
    let state = gaussianStateFromArrays([0, 0], [
      [0.1, 0],
      [0, 0.1],
    ]);

    for (let i = 0; i < 100; i++) {
      // True dynamics
      const newTheta = trueTheta + trueOmega * dt;
      const newOmega = trueOmega - (g / L) * Math.sin(trueTheta) * dt;
      trueTheta = newTheta;
      trueOmega = newOmega;

      // Noisy measurement of angle
      const z = trueTheta + (Math.random() - 0.5) * 0.02;
      const result = ekfStep(
        state,
        Matrix.fromArray([[z]]),
        pendulumDynamics,
        angleMeasurement,
      );
      state = result.state;
    }

    // Should track the angle reasonably well
    const estimatedTheta = meanToArray(state)[0];
    expect(Math.abs(estimatedTheta - trueTheta)).toBeLessThan(0.1);
  });

  test('predict step applies nonlinear dynamics', () => {
    const state = gaussianStateFromArrays([0.5, 0.2], [
      [0.01, 0],
      [0, 0.01],
    ]);
    const predicted = ekfPredict(state, pendulumDynamics);
    const mean = meanToArray(predicted);

    // theta_pred = 0.5 + 0.2*0.01 = 0.502
    expect(mean[0]).toBeCloseTo(0.502, 6);
    // omega_pred = 0.2 - 9.81*sin(0.5)*0.01 = 0.2 - 0.04703...
    const expectedOmega = 0.2 - (g / L) * Math.sin(0.5) * dt;
    expect(mean[1]).toBeCloseTo(expectedOmega, 6);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Properties
// ---------------------------------------------------------------------------
describe('EKF properties', () => {
  const dynamics: EKFDynamicsModel = {
    f: (x: Matrix) => x,
    F: (x: Matrix) => matIdentity(x.rows),
    Q: Matrix.fromArray([
      [0.1, 0],
      [0, 0.1],
    ]),
  };

  const measurement: EKFMeasurementModel = {
    h: (x: Matrix) => Matrix.fromArray([[x.get(0, 0)]]),
    H: (_x: Matrix) => Matrix.fromArray([[1, 0]]),
    R: Matrix.fromArray([[0.5]]),
  };

  test('predicted covariance trace >= prior trace', () => {
    const state = gaussianStateFromArrays([1, 2], [
      [0.5, 0],
      [0, 0.5],
    ]);
    const predicted = ekfPredict(state, dynamics);

    const priorTrace = matTrace(state.covariance);
    const predTrace = matTrace(predicted.covariance);
    // P_pred = I*P*I + Q = P + Q, so trace increases by trace(Q)
    expect(predTrace).toBeGreaterThanOrEqual(priorTrace);
  });

  test('updated covariance trace <= predicted trace', () => {
    const predicted = gaussianStateFromArrays([1, 2], [
      [1, 0],
      [0, 1],
    ]);
    const z = Matrix.fromArray([[1.5]]);
    const result = ekfUpdate(predicted, z, measurement);

    const predTrace = matTrace(predicted.covariance);
    const updTrace = matTrace(result.state.covariance);
    expect(updTrace).toBeLessThanOrEqual(predTrace + 1e-10);
  });

  test('innovation dimensions correct', () => {
    const predicted = gaussianStateFromArrays([1, 2], [
      [1, 0],
      [0, 1],
    ]);
    const z = Matrix.fromArray([[1.5]]);
    const result = ekfUpdate(predicted, z, measurement);

    // Innovation should be p x 1 (measurement dimension)
    expect(result.innovation.rows).toBe(1);
    expect(result.innovation.cols).toBe(1);
  });

  test('Kalman gain dimensions correct', () => {
    const predicted = gaussianStateFromArrays([1, 2], [
      [1, 0],
      [0, 1],
    ]);
    const z = Matrix.fromArray([[1.5]]);
    const result = ekfUpdate(predicted, z, measurement);

    // Kalman gain should be n x p (state_dim x measurement_dim)
    expect(result.kalmanGain.rows).toBe(2);
    expect(result.kalmanGain.cols).toBe(1);
  });

  test('zero innovation when measurement matches prediction', () => {
    const predicted = gaussianStateFromArrays([3, 2], [
      [1, 0],
      [0, 1],
    ]);
    // h(x) = x[0] = 3, so z = 3 should give zero innovation
    const z = Matrix.fromArray([[3]]);
    const result = ekfUpdate(predicted, z, measurement);

    expect(result.innovation.get(0, 0)).toBeCloseTo(0, 10);
    // State should not change when innovation is zero
    expect(meanToArray(result.state)[0]).toBeCloseTo(3, 10);
    expect(meanToArray(result.state)[1]).toBeCloseTo(2, 10);
  });
});

// ---------------------------------------------------------------------------
// Test 5: ekfStep equivalence
// ---------------------------------------------------------------------------
describe('ekfStep equivalence', () => {
  const dynamics: EKFDynamicsModel = {
    f: (x: Matrix) => x,
    F: (x: Matrix) => matIdentity(x.rows),
    Q: Matrix.fromArray([[0.05]]),
  };

  const meas: EKFMeasurementModel = {
    h: (x: Matrix) => x,
    H: (_x: Matrix) => Matrix.fromArray([[1]]),
    R: Matrix.fromArray([[0.3]]),
  };

  test('manual predict+update matches ekfStep', () => {
    const state = gaussianStateFromArrays([1], [[2]]);
    const z = Matrix.fromArray([[1.5]]);

    // Manual
    const predicted = ekfPredict(state, dynamics);
    const manual = ekfUpdate(predicted, z, meas);

    // Combined
    const combined = ekfStep(state, z, dynamics, meas);

    expect(meanToArray(manual.state)[0]).toBeCloseTo(
      meanToArray(combined.state)[0],
      10,
    );
    expect(covarianceToArray(manual.state)[0][0]).toBeCloseTo(
      covarianceToArray(combined.state)[0][0],
      10,
    );
    expect(manual.innovation.get(0, 0)).toBeCloseTo(
      combined.innovation.get(0, 0),
      10,
    );
    expect(manual.kalmanGain.get(0, 0)).toBeCloseTo(
      combined.kalmanGain.get(0, 0),
      10,
    );
  });

  test('2D manual predict+update matches ekfStep', () => {
    const dynamics2D: EKFDynamicsModel = {
      f: (x: Matrix) => x,
      F: (x: Matrix) => matIdentity(x.rows),
      Q: Matrix.fromArray([
        [0.01, 0],
        [0, 0.01],
      ]),
    };

    const meas2D: EKFMeasurementModel = {
      h: (x: Matrix) => Matrix.fromArray([[x.get(0, 0) + x.get(1, 0)]]),
      H: (_x: Matrix) => Matrix.fromArray([[1, 1]]),
      R: Matrix.fromArray([[0.5]]),
    };

    const state = gaussianStateFromArrays([1, 2], [
      [0.5, 0.1],
      [0.1, 0.5],
    ]);
    const z = Matrix.fromArray([[3.2]]);

    const predicted = ekfPredict(state, dynamics2D);
    const manual = ekfUpdate(predicted, z, meas2D);
    const combined = ekfStep(state, z, dynamics2D, meas2D);

    const manualMean = meanToArray(manual.state);
    const combinedMean = meanToArray(combined.state);
    expect(manualMean[0]).toBeCloseTo(combinedMean[0], 10);
    expect(manualMean[1]).toBeCloseTo(combinedMean[1], 10);
  });
});

// ---------------------------------------------------------------------------
// Test 6: With control input
// ---------------------------------------------------------------------------
describe('EKF with control input', () => {
  test('control input affects predicted state', () => {
    const dynamics: EKFDynamicsModel = {
      f: (x: Matrix, u?: Matrix) => {
        if (u) {
          return matAdd(x, u);
        }
        return x;
      },
      F: (_x: Matrix, _u?: Matrix) => matIdentity(2),
      Q: Matrix.fromArray([
        [0.01, 0],
        [0, 0.01],
      ]),
    };

    const state = gaussianStateFromArrays([1, 2], [
      [0.1, 0],
      [0, 0.1],
    ]);
    const control = Matrix.fromArray([[0.5], [0.3]]);

    const predicted = ekfPredict(state, dynamics, control);
    const mean = meanToArray(predicted);
    expect(mean[0]).toBeCloseTo(1.5, 10);
    expect(mean[1]).toBeCloseTo(2.3, 10);
  });

  test('without control, state propagates via f alone', () => {
    const dynamics: EKFDynamicsModel = {
      f: (x: Matrix, u?: Matrix) => {
        if (u) {
          return matAdd(x, u);
        }
        return x;
      },
      F: (_x: Matrix, _u?: Matrix) => matIdentity(1),
      Q: Matrix.fromArray([[0.01]]),
    };

    const state = gaussianStateFromArrays([5], [[1]]);
    const predicted = ekfPredict(state, dynamics);
    expect(meanToArray(predicted)[0]).toBeCloseTo(5, 10);
  });

  test('full ekfStep with control input', () => {
    const dynamics: EKFDynamicsModel = {
      f: (x: Matrix, u?: Matrix) => {
        if (u) {
          return matAdd(x, u);
        }
        return x;
      },
      F: (_x: Matrix, _u?: Matrix) => matIdentity(1),
      Q: Matrix.fromArray([[0.1]]),
    };

    const meas: EKFMeasurementModel = {
      h: (x: Matrix) => x,
      H: (_x: Matrix) => Matrix.fromArray([[1]]),
      R: Matrix.fromArray([[0.5]]),
    };

    const state = gaussianStateFromArrays([0], [[1]]);
    const control = Matrix.fromArray([[1]]);
    const z = Matrix.fromArray([[1.2]]);

    const result = ekfStep(state, z, dynamics, meas, control);
    const mean = meanToArray(result.state)[0];
    // After predict: x_pred = 0 + 1 = 1, then update toward z=1.2
    expect(mean).toBeGreaterThan(0.9);
    expect(mean).toBeLessThan(1.3);
  });

  test('control-dependent Jacobian', () => {
    // Dynamics where control affects the Jacobian
    const dynamics: EKFDynamicsModel = {
      f: (x: Matrix, u?: Matrix) => {
        const scale = u ? 1 + u.get(0, 0) : 1;
        return new Matrix(1, 1, [x.get(0, 0) * scale]);
      },
      F: (_x: Matrix, u?: Matrix) => {
        const scale = u ? 1 + u.get(0, 0) : 1;
        return Matrix.fromArray([[scale]]);
      },
      Q: Matrix.fromArray([[0.01]]),
    };

    const state = gaussianStateFromArrays([2], [[0.5]]);
    const control = Matrix.fromArray([[0.1]]);

    const predicted = ekfPredict(state, dynamics, control);
    // f(2, u=0.1) = 2 * 1.1 = 2.2
    expect(meanToArray(predicted)[0]).toBeCloseTo(2.2, 10);
    // P_pred = 1.1 * 0.5 * 1.1 + 0.01 = 0.605 + 0.01 = 0.615
    expect(covarianceToArray(predicted)[0][0]).toBeCloseTo(0.615, 10);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage tests
// ---------------------------------------------------------------------------
describe('EKF additional coverage', () => {
  test('multi-dimensional measurement', () => {
    // State is 2D, measurement is 2D (full observation)
    const dynamics: EKFDynamicsModel = {
      f: (x: Matrix) => x,
      F: (x: Matrix) => matIdentity(x.rows),
      Q: Matrix.fromArray([
        [0.01, 0],
        [0, 0.01],
      ]),
    };

    const meas: EKFMeasurementModel = {
      h: (x: Matrix) => x,
      H: (_x: Matrix) => matIdentity(2),
      R: Matrix.fromArray([
        [0.1, 0],
        [0, 0.1],
      ]),
    };

    const state = gaussianStateFromArrays([0, 0], [
      [1, 0],
      [0, 1],
    ]);
    const z = Matrix.fromArray([[3], [4]]);

    const result = ekfStep(state, z, dynamics, meas);
    const mean = meanToArray(result.state);

    // With high prior uncertainty and low measurement noise, should be close to measurement
    expect(Math.abs(mean[0] - 3)).toBeLessThan(0.5);
    expect(Math.abs(mean[1] - 4)).toBeLessThan(0.5);
  });

  test('initialGaussianState works with EKF', () => {
    const state = initialGaussianState(3, 10);
    const dynamics: EKFDynamicsModel = {
      f: (x: Matrix) => x,
      F: (x: Matrix) => matIdentity(x.rows),
      Q: Matrix.fromArray([
        [0.01, 0, 0],
        [0, 0.01, 0],
        [0, 0, 0.01],
      ]),
    };

    const predicted = ekfPredict(state, dynamics);
    expect(predicted.mean.rows).toBe(3);
    expect(predicted.mean.cols).toBe(1);
    expect(predicted.covariance.rows).toBe(3);
    expect(predicted.covariance.cols).toBe(3);
  });
});
