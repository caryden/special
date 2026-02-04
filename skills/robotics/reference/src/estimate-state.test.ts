import { describe, expect, it } from 'bun:test';
import { estimateState, type KalmanModelSpec, type EKFModelSpec, type UKFModelSpec } from './estimate-state.ts';
import { Matrix, matIdentity } from './mat-ops.ts';
import { gaussianState, type LinearSystemModel } from './state-types.ts';

// 1D constant-value model for linear Kalman
function make1DLinearModel(): LinearSystemModel {
  const F = new Matrix(1, 1, [1]);
  const H = new Matrix(1, 1, [1]);
  const Q = new Matrix(1, 1, [0.01]);
  const R = new Matrix(1, 1, [1]);
  return { F, B: null, H, Q, R };
}

describe('estimateState — kalman', () => {
  it('runs one step', () => {
    const model = make1DLinearModel();
    const state = gaussianState(new Matrix(1, 1, [0]), new Matrix(1, 1, [1]));
    const measurement = new Matrix(1, 1, [5]);
    const spec: KalmanModelSpec = { method: 'kalman', model };

    const result = estimateState(state, measurement, spec);
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
    expect(result.state.mean.get(0, 0)).toBeLessThan(5);
  });

  it('converges toward measurements over time', () => {
    const model = make1DLinearModel();
    let state = gaussianState(new Matrix(1, 1, [0]), new Matrix(1, 1, [10]));
    const spec: KalmanModelSpec = { method: 'kalman', model };

    for (let i = 0; i < 20; i++) {
      const result = estimateState(state, new Matrix(1, 1, [10]), spec);
      state = result.state;
    }
    expect(state.mean.get(0, 0)).toBeCloseTo(10, 0);
  });
});

describe('estimateState — ekf', () => {
  it('runs one step with identity Jacobians', () => {
    const Q = new Matrix(1, 1, [0.01]);
    const R = new Matrix(1, 1, [1]);
    const dynamics = {
      f: (x: Matrix) => x,
      F: () => new Matrix(1, 1, [1]),
      Q,
    };
    const measurement = {
      h: (x: Matrix) => x,
      H: () => new Matrix(1, 1, [1]),
      R,
    };
    const spec: EKFModelSpec = { method: 'ekf', dynamics, measurement };

    const state = gaussianState(new Matrix(1, 1, [0]), new Matrix(1, 1, [1]));
    const result = estimateState(state, new Matrix(1, 1, [3]), spec);
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
    expect(result.state.mean.get(0, 0)).toBeLessThan(3);
  });

  it('converges for nonlinear measurement', () => {
    const Q = new Matrix(2, 2, [0.01, 0, 0, 0.01]);
    const R = new Matrix(1, 1, [0.1]);
    const dynamics = {
      f: (x: Matrix) => x,
      F: () => matIdentity(2),
      Q,
    };
    // Measure range: h(x) = sqrt(x1^2 + x2^2)
    const measurementModel = {
      h: (x: Matrix) => {
        const r = Math.sqrt(x.get(0, 0) ** 2 + x.get(1, 0) ** 2);
        return new Matrix(1, 1, [r]);
      },
      H: (x: Matrix) => {
        const r = Math.sqrt(x.get(0, 0) ** 2 + x.get(1, 0) ** 2) + 1e-10;
        return new Matrix(1, 2, [x.get(0, 0) / r, x.get(1, 0) / r]);
      },
      R,
    };
    const spec: EKFModelSpec = { method: 'ekf', dynamics, measurement: measurementModel };

    let state = gaussianState(new Matrix(2, 1, [3, 4]), new Matrix(2, 2, [1, 0, 0, 1]));
    for (let i = 0; i < 10; i++) {
      const result = estimateState(state, new Matrix(1, 1, [5]), spec);
      state = result.state;
    }
    const r = Math.sqrt(state.mean.get(0, 0) ** 2 + state.mean.get(1, 0) ** 2);
    expect(r).toBeCloseTo(5, 0);
  });
});

describe('estimateState — ukf', () => {
  it('runs one step', () => {
    const Q = new Matrix(1, 1, [0.01]);
    const R = new Matrix(1, 1, [1]);
    const spec: UKFModelSpec = {
      method: 'ukf',
      f: (x: Matrix) => x,
      h: (x: Matrix) => x,
      Q,
      R,
    };

    const state = gaussianState(new Matrix(1, 1, [0]), new Matrix(1, 1, [1]));
    const result = estimateState(state, new Matrix(1, 1, [5]), spec);
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
    expect(result.state.mean.get(0, 0)).toBeLessThan(5);
  });

  it('converges toward measurements over time', () => {
    const Q = new Matrix(1, 1, [0.01]);
    const R = new Matrix(1, 1, [1]);
    const spec: UKFModelSpec = {
      method: 'ukf',
      f: (x: Matrix) => x,
      h: (x: Matrix) => x,
      Q,
      R,
    };

    let state = gaussianState(new Matrix(1, 1, [0]), new Matrix(1, 1, [10]));
    for (let i = 0; i < 20; i++) {
      const result = estimateState(state, new Matrix(1, 1, [10]), spec);
      state = result.state;
    }
    expect(state.mean.get(0, 0)).toBeCloseTo(10, 0);
  });
});

describe('estimateState — method routing', () => {
  it('all methods produce updated state', () => {
    const Q1 = new Matrix(1, 1, [0.01]);
    const R1 = new Matrix(1, 1, [1]);
    const state = gaussianState(new Matrix(1, 1, [0]), new Matrix(1, 1, [1]));
    const measurement = new Matrix(1, 1, [5]);

    const kalmanSpec: KalmanModelSpec = {
      method: 'kalman',
      model: make1DLinearModel(),
    };
    const ekfSpec: EKFModelSpec = {
      method: 'ekf',
      dynamics: {
        f: (x: Matrix) => x,
        F: () => new Matrix(1, 1, [1]),
        Q: Q1,
      },
      measurement: {
        h: (x: Matrix) => x,
        H: () => new Matrix(1, 1, [1]),
        R: R1,
      },
    };
    const ukfSpec: UKFModelSpec = {
      method: 'ukf',
      f: (x: Matrix) => x,
      h: (x: Matrix) => x,
      Q: Q1,
      R: R1,
    };

    for (const spec of [kalmanSpec, ekfSpec, ukfSpec]) {
      const result = estimateState(state, measurement, spec);
      expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
      expect(result.state.covariance.get(0, 0)).toBeLessThan(1);
    }
  });
});
