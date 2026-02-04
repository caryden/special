import { describe, test, expect } from 'bun:test';
import {
  kalmanPredict,
  kalmanUpdate,
  kalmanStep,
  KalmanUpdateResult,
} from './kalman-filter.ts';
import {
  Matrix,
  matMultiply,
  matTranspose,
  matTrace,
  matIdentity,
  matEqual,
} from './mat-ops.ts';
import {
  GaussianState,
  LinearSystemModel,
  gaussianStateFromArrays,
  meanToArray,
  covarianceToArray,
  stateDimension,
} from './state-types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mat(arr: number[][]): Matrix {
  return Matrix.fromArray(arr);
}

function col(arr: number[]): Matrix {
  return Matrix.fromArray(arr.map((v) => [v]));
}

function approxEqual(a: number, b: number, tol = 1e-6): void {
  expect(Math.abs(a - b)).toBeLessThan(tol);
}

// ---------------------------------------------------------------------------
// 1D constant-position model (simplest possible)
// @provenance FilterPy documentation — "estimating a constant" example
// ---------------------------------------------------------------------------

describe('1D constant-position model', () => {
  const model: LinearSystemModel = {
    F: mat([[1]]),
    B: null,
    H: mat([[1]]),
    Q: mat([[0.01]]),
    R: mat([[1]]),
  };

  test('predict increases covariance', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    // P_pred = 1*1*1 + 0.01 = 1.01
    approxEqual(pred.covariance.get(0, 0), 1.01);
    approxEqual(pred.mean.get(0, 0), 0);
  });

  test('update pulls mean toward measurement', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    const result = kalmanUpdate(pred, col([1]), model);
    // Mean should move toward 1
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
    expect(result.state.mean.get(0, 0)).toBeLessThan(1);
  });

  test('update reduces covariance', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    const result = kalmanUpdate(pred, col([1]), model);
    expect(result.state.covariance.get(0, 0)).toBeLessThan(
      pred.covariance.get(0, 0),
    );
  });

  test('sequential measurements converge toward observation', () => {
    const measurements = [1, 2, 3];
    let state = gaussianStateFromArrays([0], [[1]]);
    let prevCov = state.covariance.get(0, 0);

    for (const z of measurements) {
      const result = kalmanStep(state, col([z]), model);
      state = result.state;
      const cov = state.covariance.get(0, 0);
      // Covariance should decrease or stay same
      expect(cov).toBeLessThanOrEqual(prevCov + 1e-10);
      prevCov = cov;
    }

    // After processing [1, 2, 3], mean should be closer to recent measurements
    expect(state.mean.get(0, 0)).toBeGreaterThan(0);
  });

  test('three steps give correct innovation dimensions', () => {
    let state = gaussianStateFromArrays([0], [[1]]);
    for (const z of [1, 2, 3]) {
      const result = kalmanStep(state, col([z]), model);
      expect(result.innovation.rows).toBe(1);
      expect(result.innovation.cols).toBe(1);
      expect(result.innovationCovariance.rows).toBe(1);
      expect(result.innovationCovariance.cols).toBe(1);
      expect(result.kalmanGain.rows).toBe(1);
      expect(result.kalmanGain.cols).toBe(1);
      state = result.state;
    }
  });
});

// ---------------------------------------------------------------------------
// 2D constant-velocity model (standard tracking)
// @provenance FilterPy constant-velocity tracking example
// ---------------------------------------------------------------------------

describe('2D constant-velocity model', () => {
  const dt = 1;
  const model: LinearSystemModel = {
    F: mat([
      [1, dt],
      [0, 1],
    ]),
    B: null,
    H: mat([[1, 0]]), // observe position only
    Q: mat([
      [0.01, 0],
      [0, 0.01],
    ]),
    R: mat([[1]]),
  };

  test('predict propagates position with velocity', () => {
    const state = gaussianStateFromArrays(
      [10, 5],
      [
        [1, 0],
        [0, 1],
      ],
    );
    const pred = kalmanPredict(state, model);
    // x_pred = F * [10, 5]^T = [10 + 5*1, 5] = [15, 5]
    approxEqual(pred.mean.get(0, 0), 15);
    approxEqual(pred.mean.get(1, 0), 5);
  });

  test('velocity estimate converges for quadratic positions', () => {
    // Positions from x = t^2: at t=1,2,3,4,5 -> 1,4,9,16,25
    const measurements = [1, 4, 9, 16, 25];
    let state = gaussianStateFromArrays(
      [0, 0],
      [
        [10, 0],
        [0, 10],
      ],
    );

    for (const z of measurements) {
      const result = kalmanStep(state, col([z]), model);
      state = result.state;
    }

    // Velocity should be positive and reflecting acceleration
    expect(state.mean.get(1, 0)).toBeGreaterThan(0);
    // Position estimate should be near recent measurement
    expect(state.mean.get(0, 0)).toBeGreaterThan(10);
  });

  test('gain dimensions are correct for 2D state / 1D measurement', () => {
    const state = gaussianStateFromArrays(
      [0, 0],
      [
        [10, 0],
        [0, 10],
      ],
    );
    const pred = kalmanPredict(state, model);
    const result = kalmanUpdate(pred, col([1]), model);
    expect(result.kalmanGain.rows).toBe(2);
    expect(result.kalmanGain.cols).toBe(1);
    expect(result.innovation.rows).toBe(1);
    expect(result.innovationCovariance.rows).toBe(1);
    expect(result.innovationCovariance.cols).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Textbook test vectors
// @provenance FilterPy documentation — 10 measurements of constant value
// ---------------------------------------------------------------------------

describe('textbook: 10 measurements of constant 10', () => {
  const model: LinearSystemModel = {
    F: mat([[1]]),
    B: null,
    H: mat([[1]]),
    Q: mat([[0.01]]),
    R: mat([[1]]),
  };

  test('posterior converges to 10 with small variance', () => {
    let state = gaussianStateFromArrays([0], [[100]]);

    for (let i = 0; i < 10; i++) {
      const result = kalmanStep(state, col([10]), model);
      state = result.state;
    }

    // Mean should be close to 10
    approxEqual(state.mean.get(0, 0), 10, 0.5);
    // Variance should be much less than 1
    expect(state.covariance.get(0, 0)).toBeLessThan(1);
  });

  test('covariance monotonically decreases over 10 steps', () => {
    let state = gaussianStateFromArrays([0], [[100]]);
    let prevCov = 100;

    for (let i = 0; i < 10; i++) {
      const result = kalmanStep(state, col([10]), model);
      state = result.state;
      const cov = state.covariance.get(0, 0);
      expect(cov).toBeLessThan(prevCov + 1e-10);
      prevCov = cov;
    }
  });
});

// ---------------------------------------------------------------------------
// Property: predicted covariance >= prior covariance (trace test)
// ---------------------------------------------------------------------------

describe('covariance properties', () => {
  test('predicted covariance trace >= prior covariance trace', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0.1],
        [0, 1],
      ]),
      B: null,
      H: mat([[1, 0]]),
      Q: mat([
        [0.1, 0],
        [0, 0.1],
      ]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays(
      [0, 0],
      [
        [1, 0],
        [0, 1],
      ],
    );
    const pred = kalmanPredict(state, model);
    // trace(P_pred) >= trace(P) because Q is PSD
    expect(matTrace(pred.covariance)).toBeGreaterThanOrEqual(
      matTrace(state.covariance) - 1e-10,
    );
  });

  test('updated covariance trace <= predicted covariance trace', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[5]]);
    const pred = kalmanPredict(state, model);
    const result = kalmanUpdate(pred, col([1]), model);
    expect(matTrace(result.state.covariance)).toBeLessThanOrEqual(
      matTrace(pred.covariance) + 1e-10,
    );
  });

  test('innovation covariance S is symmetric', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0.5],
        [0, 1],
      ]),
      B: null,
      H: mat([
        [1, 0],
        [0, 1],
      ]),
      Q: mat([
        [0.1, 0.02],
        [0.02, 0.1],
      ]),
      R: mat([
        [1, 0.1],
        [0.1, 1],
      ]),
    };
    const state = gaussianStateFromArrays(
      [0, 0],
      [
        [2, 0.5],
        [0.5, 2],
      ],
    );
    const pred = kalmanPredict(state, model);
    const result = kalmanUpdate(pred, col([1, 0.5]), model);
    const S = result.innovationCovariance;
    const St = matTranspose(S);
    expect(matEqual(S, St, 1e-10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zero measurement noise: posterior tracks measurements closely
// ---------------------------------------------------------------------------

describe('near-zero measurement noise', () => {
  test('posterior mean closely tracks measurement', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1e-6]]), // very small measurement noise
    };
    let state = gaussianStateFromArrays([0], [[1]]);

    const result = kalmanStep(state, col([42]), model);
    // With near-zero R, posterior should nearly equal measurement
    approxEqual(result.state.mean.get(0, 0), 42, 0.01);
  });
});

// ---------------------------------------------------------------------------
// Zero process noise: posterior converges and stops moving
// ---------------------------------------------------------------------------

describe('zero process noise', () => {
  test('state converges and stops updating', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0]]), // zero process noise
      R: mat([[1]]),
    };
    let state = gaussianStateFromArrays([0], [[100]]);

    // Feed same measurement many times
    for (let i = 0; i < 50; i++) {
      const result = kalmanStep(state, col([10]), model);
      state = result.state;
    }

    // Covariance should converge toward 0
    expect(state.covariance.get(0, 0)).toBeLessThan(0.05);
    // Mean should converge to 10
    approxEqual(state.mean.get(0, 0), 10, 0.1);

    // Now further steps should barely change anything
    const before = state.mean.get(0, 0);
    const result = kalmanStep(state, col([10]), model);
    const after = result.state.mean.get(0, 0);
    approxEqual(before, after, 0.001);
  });
});

// ---------------------------------------------------------------------------
// Control input
// ---------------------------------------------------------------------------

describe('predict with control input', () => {
  test('B * u is added to predicted mean', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: mat([[1]]), // 1D control
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([5], [[1]]);
    const control = col([3]);
    const pred = kalmanPredict(state, model, control);
    // x_pred = 1*5 + 1*3 = 8
    approxEqual(pred.mean.get(0, 0), 8);
  });

  test('2D state with 1D control input', () => {
    const dt = 0.1;
    const model: LinearSystemModel = {
      F: mat([
        [1, dt],
        [0, 1],
      ]),
      B: mat([[0.5 * dt * dt], [dt]]), // acceleration input
      H: mat([[1, 0]]),
      Q: mat([
        [0.01, 0],
        [0, 0.01],
      ]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays(
      [0, 0],
      [
        [1, 0],
        [0, 1],
      ],
    );
    const accel = col([10]); // 10 m/s^2
    const pred = kalmanPredict(state, model, accel);
    // position: 0 + 0*0.1 + 0.5*0.01*10 = 0.05
    approxEqual(pred.mean.get(0, 0), 0.05);
    // velocity: 0 + 0.1*10 = 1.0
    approxEqual(pred.mean.get(1, 0), 1.0);
  });

  test('no control gives same as predict without control argument', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: mat([[1]]),
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([5], [[1]]);
    const predNoControl = kalmanPredict(state, model);
    const predZeroControl = kalmanPredict(state, model, col([0]));
    expect(matEqual(predNoControl.mean, predZeroControl.mean, 1e-14)).toBe(
      true,
    );
    expect(
      matEqual(predNoControl.covariance, predZeroControl.covariance, 1e-14),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// kalmanStep = predict + update
// ---------------------------------------------------------------------------

describe('kalmanStep equivalence', () => {
  test('kalmanStep gives same result as manual predict+update', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 1],
        [0, 1],
      ]),
      B: null,
      H: mat([[1, 0]]),
      Q: mat([
        [0.1, 0],
        [0, 0.1],
      ]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays(
      [0, 1],
      [
        [5, 0],
        [0, 5],
      ],
    );
    const z = col([3]);

    // Manual
    const pred = kalmanPredict(state, model);
    const manual = kalmanUpdate(pred, z, model);

    // Combined
    const combined = kalmanStep(state, z, model);

    expect(
      matEqual(manual.state.mean, combined.state.mean, 1e-12),
    ).toBe(true);
    expect(
      matEqual(manual.state.covariance, combined.state.covariance, 1e-12),
    ).toBe(true);
    expect(
      matEqual(manual.innovation, combined.innovation, 1e-12),
    ).toBe(true);
    expect(
      matEqual(manual.kalmanGain, combined.kalmanGain, 1e-12),
    ).toBe(true);
  });

  test('kalmanStep with control gives same as manual predict+update', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: mat([[0.5]]),
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    const z = col([5]);
    const u = col([2]);

    const pred = kalmanPredict(state, model, u);
    const manual = kalmanUpdate(pred, z, model);
    const combined = kalmanStep(state, z, model, u);

    expect(matEqual(manual.state.mean, combined.state.mean, 1e-12)).toBe(true);
    expect(
      matEqual(manual.state.covariance, combined.state.covariance, 1e-12),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error cases: dimension mismatches
// ---------------------------------------------------------------------------

describe('dimension mismatch errors', () => {
  test('F columns must match state dimension', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0],
        [0, 1],
      ]),
      B: null,
      H: mat([[1, 0]]),
      Q: mat([
        [0.01, 0],
        [0, 0.01],
      ]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]); // 1D state, 2D model
    expect(() => kalmanPredict(state, model)).toThrow();
  });

  test('Q dimensions must match F', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([
        [0.01, 0],
        [0, 0.01],
      ]), // 2x2 Q for 1D model
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    expect(() => kalmanPredict(state, model)).toThrow();
  });

  test('control provided but B is null', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    expect(() => kalmanPredict(state, model, col([1]))).toThrow();
  });

  test('control dimension mismatch with B', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: mat([[1]]),
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    // B is 1x1 but control is 2x1
    expect(() => kalmanPredict(state, model, col([1, 2]))).toThrow();
  });

  test('H columns must match state dimension in update', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1, 0]]), // 1x2 H for 1D state
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    expect(() => kalmanUpdate(pred, col([1]), model)).toThrow();
  });

  test('measurement dimension must match H rows', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    // measurement is 2x1, but H has 1 row
    expect(() => kalmanUpdate(pred, col([1, 2]), model)).toThrow();
  });

  test('R dimensions must match measurement dimension', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0],
        [0, 1],
      ]),
      B: null,
      H: mat([
        [1, 0],
        [0, 1],
      ]),
      Q: mat([
        [0.01, 0],
        [0, 0.01],
      ]),
      R: mat([[1]]), // 1x1 R for 2D measurement
    };
    const state = gaussianStateFromArrays(
      [0, 0],
      [
        [1, 0],
        [0, 1],
      ],
    );
    const pred = kalmanPredict(state, model);
    expect(() => kalmanUpdate(pred, col([1, 2]), model)).toThrow();
  });

  test('measurement must be a column vector', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    // 1x2 matrix instead of column vector
    expect(() => kalmanUpdate(pred, mat([[1, 2]]), model)).toThrow();
  });

  test('F must be square', () => {
    const model: LinearSystemModel = {
      F: mat([[1, 0]]), // 1x2
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    expect(() => kalmanPredict(state, model)).toThrow();
  });

  test('control must be column vector', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: mat([[1]]),
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    expect(() => kalmanPredict(state, model, mat([[1, 2]]))).toThrow();
  });

  test('B rows must match state dimension', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0],
        [0, 1],
      ]),
      B: mat([[1]]), // 1x1, but state is 2D
      H: mat([[1, 0]]),
      Q: mat([
        [0.01, 0],
        [0, 0.01],
      ]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays(
      [0, 0],
      [
        [1, 0],
        [0, 1],
      ],
    );
    expect(() => kalmanPredict(state, model, col([1]))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Multi-dimensional measurement
// ---------------------------------------------------------------------------

describe('multi-dimensional measurement', () => {
  test('2D state with 2D measurement', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0],
        [0, 1],
      ]),
      B: null,
      H: mat([
        [1, 0],
        [0, 1],
      ]), // observe full state
      Q: mat([
        [0.01, 0],
        [0, 0.01],
      ]),
      R: mat([
        [0.5, 0],
        [0, 0.5],
      ]),
    };
    let state = gaussianStateFromArrays(
      [0, 0],
      [
        [10, 0],
        [0, 10],
      ],
    );

    const result = kalmanStep(state, col([5, 3]), model);
    // Both state components should move toward measurement
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
    expect(result.state.mean.get(1, 0)).toBeGreaterThan(0);
    // Kalman gain should be 2x2
    expect(result.kalmanGain.rows).toBe(2);
    expect(result.kalmanGain.cols).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Identity model (sanity check)
// ---------------------------------------------------------------------------

describe('identity dynamics', () => {
  test('predict with identity F and zero Q preserves state', () => {
    const model: LinearSystemModel = {
      F: mat([
        [1, 0],
        [0, 1],
      ]),
      B: null,
      H: mat([[1, 0]]),
      Q: mat([
        [0, 0],
        [0, 0],
      ]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays(
      [3, 7],
      [
        [2, 0.5],
        [0.5, 2],
      ],
    );
    const pred = kalmanPredict(state, model);
    expect(matEqual(pred.mean, state.mean, 1e-14)).toBe(true);
    expect(matEqual(pred.covariance, state.covariance, 1e-14)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Steady-state convergence
// ---------------------------------------------------------------------------

describe('steady-state Kalman gain', () => {
  test('gain converges after many iterations', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    let state = gaussianStateFromArrays([0], [[100]]);
    let prevGain = Infinity;

    for (let i = 0; i < 50; i++) {
      const pred = kalmanPredict(state, model);
      const result = kalmanUpdate(pred, col([10]), model);
      const gain = result.kalmanGain.get(0, 0);
      state = result.state;
      if (i > 40) {
        // Gain should have essentially converged
        approxEqual(gain, prevGain, 1e-4);
      }
      prevGain = gain;
    }
  });
});

// ---------------------------------------------------------------------------
// KalmanUpdateResult interface fields
// ---------------------------------------------------------------------------

describe('KalmanUpdateResult fields', () => {
  test('all fields are present and have correct types', () => {
    const model: LinearSystemModel = {
      F: mat([[1]]),
      B: null,
      H: mat([[1]]),
      Q: mat([[0.01]]),
      R: mat([[1]]),
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    const pred = kalmanPredict(state, model);
    const result = kalmanUpdate(pred, col([5]), model);

    expect(result.state).toBeDefined();
    expect(result.state.mean).toBeInstanceOf(Matrix);
    expect(result.state.covariance).toBeInstanceOf(Matrix);
    expect(result.innovation).toBeInstanceOf(Matrix);
    expect(result.innovationCovariance).toBeInstanceOf(Matrix);
    expect(result.kalmanGain).toBeInstanceOf(Matrix);
  });
});
