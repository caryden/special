import { describe, expect, it } from 'bun:test';
import {
  ukfComputeWeights,
  ukfGenerateSigmaPoints,
  ukfUnscentedTransform,
  ukfCrossCovariance,
  ukfPredict,
  ukfUpdate,
  ukfStep,
  DEFAULT_UKF_PARAMS,
  type UKFParams,
} from './ukf.ts';
import { Matrix, matIdentity, matScale } from './mat-ops.ts';
import { gaussianState, gaussianStateFromArrays, meanToArray } from './state-types.ts';

const TOL = 1e-8;

describe('ukfComputeWeights', () => {
  it('generates 2n+1 weights for n=2', () => {
    const weights = ukfComputeWeights(2);
    expect(weights.weightsMean.length).toBe(5);
    expect(weights.weightsCov.length).toBe(5);
  });

  it('generates 2n+1 weights for n=4', () => {
    const weights = ukfComputeWeights(4);
    expect(weights.weightsMean.length).toBe(9);
    expect(weights.weightsCov.length).toBe(9);
  });

  it('mean weights sum to 1', () => {
    const weights = ukfComputeWeights(3);
    const sum = weights.weightsMean.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('W_m[0] = lambda / (n + lambda) for default params', () => {
    const n = 2;
    const { alpha, kappa } = DEFAULT_UKF_PARAMS;
    const lambda = alpha * alpha * (n + kappa) - n;
    const expected = lambda / (n + lambda);
    const weights = ukfComputeWeights(n);
    expect(weights.weightsMean[0]).toBeCloseTo(expected, 12);
  });

  it('W_c[0] includes beta correction', () => {
    const n = 2;
    const { alpha, beta, kappa } = DEFAULT_UKF_PARAMS;
    const lambda = alpha * alpha * (n + kappa) - n;
    const expected = lambda / (n + lambda) + (1 - alpha * alpha + beta);
    const weights = ukfComputeWeights(n);
    expect(weights.weightsCov[0]).toBeCloseTo(expected, 12);
  });

  it('subsequent weights are equal: 1 / (2*(n+lambda))', () => {
    const n = 3;
    const { alpha, kappa } = DEFAULT_UKF_PARAMS;
    const lambda = alpha * alpha * (n + kappa) - n;
    const expected = 1 / (2 * (n + lambda));
    const weights = ukfComputeWeights(n);
    for (let i = 1; i <= 2 * n; i++) {
      expect(weights.weightsMean[i]).toBeCloseTo(expected, 12);
      expect(weights.weightsCov[i]).toBeCloseTo(expected, 12);
    }
  });

  it('custom params produce different weights', () => {
    const custom: UKFParams = { alpha: 0.5, beta: 2, kappa: 1 };
    const w1 = ukfComputeWeights(2, DEFAULT_UKF_PARAMS);
    const w2 = ukfComputeWeights(2, custom);
    expect(w1.weightsMean[0]).not.toBeCloseTo(w2.weightsMean[0], 5);
  });
});

describe('ukfGenerateSigmaPoints', () => {
  it('generates 2n+1 sigma points for n=2', () => {
    const state = gaussianStateFromArrays([1, 2], [[1, 0], [0, 1]]);
    const points = ukfGenerateSigmaPoints(state);
    expect(points.length).toBe(5);
  });

  it('first sigma point equals the mean', () => {
    const state = gaussianStateFromArrays([3, 4], [[1, 0], [0, 1]]);
    const points = ukfGenerateSigmaPoints(state);
    expect(points[0].get(0, 0)).toBeCloseTo(3, 10);
    expect(points[0].get(1, 0)).toBeCloseTo(4, 10);
  });

  it('sigma points are symmetric around mean for identity covariance', () => {
    const state = gaussianStateFromArrays([0, 0], [[1, 0], [0, 1]]);
    const points = ukfGenerateSigmaPoints(state);
    const n = 2;
    for (let i = 0; i < n; i++) {
      // X_{i+1} and X_{n+i+1} should be symmetric around mean
      for (let r = 0; r < n; r++) {
        const sum = points[i + 1].get(r, 0) + points[n + i + 1].get(r, 0);
        expect(sum).toBeCloseTo(0, 10); // mean is 0
      }
    }
  });

  it('all sigma points are n×1 column vectors', () => {
    const state = gaussianStateFromArrays([1, 2, 3], [[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
    const points = ukfGenerateSigmaPoints(state);
    for (const p of points) {
      expect(p.rows).toBe(3);
      expect(p.cols).toBe(1);
    }
  });

  it('sigma point spread increases with alpha', () => {
    const state = gaussianStateFromArrays([0, 0], [[1, 0], [0, 1]]);
    const small: UKFParams = { alpha: 1e-3, beta: 2, kappa: 0 };
    const large: UKFParams = { alpha: 1.0, beta: 2, kappa: 0 };
    const pSmall = ukfGenerateSigmaPoints(state, small);
    const pLarge = ukfGenerateSigmaPoints(state, large);
    // First non-center point should be farther from mean with larger alpha
    const distSmall = Math.abs(pSmall[1].get(0, 0));
    const distLarge = Math.abs(pLarge[1].get(0, 0));
    expect(distLarge).toBeGreaterThan(distSmall);
  });
});

describe('ukfUnscentedTransform', () => {
  it('identity transform recovers original mean', () => {
    const state = gaussianStateFromArrays([5, 7], [[2, 0.5], [0.5, 3]]);
    const points = ukfGenerateSigmaPoints(state);
    const weights = ukfComputeWeights(2);
    const zeroCov = new Matrix(2, 2);
    const result = ukfUnscentedTransform(points, weights, zeroCov);
    expect(result.mean.get(0, 0)).toBeCloseTo(5, 6);
    expect(result.mean.get(1, 0)).toBeCloseTo(7, 6);
  });

  it('identity transform recovers original covariance', () => {
    const P = [[4, 1], [1, 3]];
    const state = gaussianStateFromArrays([0, 0], P);
    const points = ukfGenerateSigmaPoints(state);
    const weights = ukfComputeWeights(2);
    const zeroCov = new Matrix(2, 2);
    const result = ukfUnscentedTransform(points, weights, zeroCov);
    expect(result.covariance.get(0, 0)).toBeCloseTo(4, 4);
    expect(result.covariance.get(0, 1)).toBeCloseTo(1, 4);
    expect(result.covariance.get(1, 0)).toBeCloseTo(1, 4);
    expect(result.covariance.get(1, 1)).toBeCloseTo(3, 4);
  });

  it('adds noise covariance to result', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const points = ukfGenerateSigmaPoints(state);
    const weights = ukfComputeWeights(1);
    const Q = Matrix.fromArray([[0.5]]);
    const result = ukfUnscentedTransform(points, weights, Q);
    // Recovered cov ≈ 1 + 0.5 = 1.5
    expect(result.covariance.get(0, 0)).toBeCloseTo(1.5, 3);
  });
});

describe('ukfCrossCovariance', () => {
  it('cross-covariance of identical sets equals self-covariance', () => {
    const state = gaussianStateFromArrays([1, 2], [[2, 0], [0, 3]]);
    const points = ukfGenerateSigmaPoints(state);
    const weights = ukfComputeWeights(2);
    const zeroCov = new Matrix(2, 2);
    const { mean } = ukfUnscentedTransform(points, weights, zeroCov);
    const Pxx = ukfCrossCovariance(points, mean, points, mean, weights);
    expect(Pxx.rows).toBe(2);
    expect(Pxx.cols).toBe(2);
    // Should approximate the covariance
    expect(Pxx.get(0, 0)).toBeCloseTo(2, 3);
    expect(Pxx.get(1, 1)).toBeCloseTo(3, 3);
  });

  it('returns correct dimensions for different state/measurement sizes', () => {
    const state = gaussianStateFromArrays([1, 2, 3], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    const points = ukfGenerateSigmaPoints(state);
    const weights = ukfComputeWeights(3);
    // Transform to 2D measurement
    const zPoints = points.map(p => new Matrix(2, 1, [p.get(0, 0), p.get(1, 0)]));
    const zMean = new Matrix(2, 1, [1, 2]);
    const zeroCov = new Matrix(3, 3);
    const { mean } = ukfUnscentedTransform(points, weights, zeroCov);
    const Pxz = ukfCrossCovariance(points, mean, zPoints, zMean, weights);
    expect(Pxz.rows).toBe(3);
    expect(Pxz.cols).toBe(2);
  });
});

describe('ukfPredict', () => {
  it('linear dynamics: matches Kalman predict for constant velocity', () => {
    const dt = 0.1;
    // State: [x, v], dynamics: x' = x + v*dt, v' = v
    const state = gaussianStateFromArrays([0, 1], [[1, 0], [0, 0.1]]);
    const f = (x: Matrix) => new Matrix(2, 1, [x.get(0, 0) + x.get(1, 0) * dt, x.get(1, 0)]);
    const Q = Matrix.fromArray([[0.01, 0], [0, 0.01]]);

    const { predicted } = ukfPredict(state, f, Q);
    // Predicted mean: [0 + 1*0.1, 1] = [0.1, 1]
    expect(predicted.mean.get(0, 0)).toBeCloseTo(0.1, 4);
    expect(predicted.mean.get(1, 0)).toBeCloseTo(1.0, 4);
  });

  it('returns propagated sigma points', () => {
    const f = (x: Matrix) => new Matrix(2, 1, [x.get(0, 0), x.get(1, 0)]);
    const state = gaussianStateFromArrays([1, 2], [[1, 0], [0, 1]]);
    const Q = new Matrix(2, 2);
    const { sigmaPoints } = ukfPredict(state, f, Q);
    expect(sigmaPoints.length).toBe(5); // 2n+1 = 5
  });

  it('covariance grows with process noise', () => {
    const f = (x: Matrix) => x; // identity dynamics
    const state = gaussianStateFromArrays([0], [[1]]);
    const Q = Matrix.fromArray([[0.5]]);
    const { predicted } = ukfPredict(state, f, Q);
    expect(predicted.covariance.get(0, 0)).toBeGreaterThan(1.0);
  });

  it('accepts control input', () => {
    const f = (x: Matrix, u?: Matrix) => {
      const ux = u ? u.get(0, 0) : 0;
      return new Matrix(1, 1, [x.get(0, 0) + ux]);
    };
    const state = gaussianStateFromArrays([0], [[1]]);
    const Q = new Matrix(1, 1);
    const control = new Matrix(1, 1, [5]);
    const { predicted } = ukfPredict(state, f, Q, control);
    expect(predicted.mean.get(0, 0)).toBeCloseTo(5, 4);
  });
});

describe('ukfUpdate', () => {
  it('direct observation: posterior moves toward measurement', () => {
    const predicted = gaussianStateFromArrays([0], [[10]]);
    const measurement = new Matrix(1, 1, [5]);
    const h = (x: Matrix) => x; // direct observation
    const R = Matrix.fromArray([[1]]);

    const result = ukfUpdate(predicted, measurement, h, R);
    // With high prior uncertainty and low measurement noise,
    // posterior should be close to measurement
    expect(result.state.mean.get(0, 0)).toBeCloseTo(5, 0);
    expect(result.state.covariance.get(0, 0)).toBeLessThan(10);
  });

  it('innovation equals measurement minus predicted measurement', () => {
    const predicted = gaussianStateFromArrays([3], [[1]]);
    const measurement = new Matrix(1, 1, [5]);
    const h = (x: Matrix) => x;
    const R = Matrix.fromArray([[1]]);

    const result = ukfUpdate(predicted, measurement, h, R);
    expect(result.innovation.get(0, 0)).toBeCloseTo(2, 4);
  });

  it('Kalman gain has correct dimensions', () => {
    // 3D state, 2D measurement
    const predicted = gaussianStateFromArrays([1, 2, 3], [
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
    ]);
    const measurement = new Matrix(2, 1, [1.5, 2.5]);
    const h = (x: Matrix) => new Matrix(2, 1, [x.get(0, 0), x.get(1, 0)]);
    const R = Matrix.fromArray([[0.1, 0], [0, 0.1]]);

    const result = ukfUpdate(predicted, measurement, h, R);
    expect(result.kalmanGain.rows).toBe(3);
    expect(result.kalmanGain.cols).toBe(2);
  });

  it('high measurement noise: posterior stays near prior', () => {
    const predicted = gaussianStateFromArrays([0], [[1]]);
    const measurement = new Matrix(1, 1, [100]);
    const h = (x: Matrix) => x;
    const R = Matrix.fromArray([[1e6]]);

    const result = ukfUpdate(predicted, measurement, h, R);
    expect(Math.abs(result.state.mean.get(0, 0))).toBeLessThan(1);
  });

  it('posterior covariance is smaller than prior', () => {
    const predicted = gaussianStateFromArrays([0], [[5]]);
    const measurement = new Matrix(1, 1, [1]);
    const h = (x: Matrix) => x;
    const R = Matrix.fromArray([[1]]);

    const result = ukfUpdate(predicted, measurement, h, R);
    expect(result.state.covariance.get(0, 0)).toBeLessThan(5);
  });
});

describe('ukfStep', () => {
  it('combines predict and update', () => {
    const state = gaussianStateFromArrays([0, 0], [[1, 0], [0, 1]]);
    const measurement = new Matrix(1, 1, [1]);
    const f = (x: Matrix) => x; // identity dynamics
    const h = (x: Matrix) => new Matrix(1, 1, [x.get(0, 0)]); // observe x only
    const Q = Matrix.fromArray([[0.1, 0], [0, 0.1]]);
    const R = Matrix.fromArray([[0.5]]);

    const result = ukfStep(state, measurement, f, h, Q, R);
    // x component should move toward 1
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
    expect(result.state.mean.rows).toBe(2);
  });

  it('accepts control input', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const measurement = new Matrix(1, 1, [10]);
    const f = (x: Matrix, u?: Matrix) => {
      const ux = u ? u.get(0, 0) : 0;
      return new Matrix(1, 1, [x.get(0, 0) + ux]);
    };
    const h = (x: Matrix) => x;
    const Q = Matrix.fromArray([[0.1]]);
    const R = Matrix.fromArray([[0.1]]);
    const control = new Matrix(1, 1, [5]);

    const result = ukfStep(state, measurement, f, h, Q, R, control);
    // After predict: mean ≈ 5, then update toward measurement 10
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(4);
    expect(result.state.mean.get(0, 0)).toBeLessThan(11);
  });

  it('custom UKF params are forwarded', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const measurement = new Matrix(1, 1, [1]);
    const f = (x: Matrix) => x;
    const h = (x: Matrix) => x;
    const Q = Matrix.fromArray([[0.01]]);
    const R = Matrix.fromArray([[0.1]]);
    const params: UKFParams = { alpha: 0.5, beta: 2, kappa: 1 };

    const result = ukfStep(state, measurement, f, h, Q, R, undefined, params);
    expect(result.state.mean.get(0, 0)).toBeGreaterThan(0);
  });
});

describe('UKF multi-step convergence', () => {
  it('converges for 1D constant position with noisy measurements', () => {
    const truePos = 5.0;
    let state = gaussianStateFromArrays([0], [[100]]); // high initial uncertainty
    const f = (x: Matrix) => x; // static
    const h = (x: Matrix) => x; // direct observation
    const Q = Matrix.fromArray([[0.001]]);
    const R = Matrix.fromArray([[1]]);

    // Simulate measurements
    const measurements = [4.8, 5.2, 5.0, 4.9, 5.1, 5.05, 4.95, 5.0, 5.1, 4.9];
    for (const z of measurements) {
      const result = ukfStep(state, new Matrix(1, 1, [z]), f, h, Q, R);
      state = result.state;
    }

    // After 10 measurements, should converge close to true position
    expect(state.mean.get(0, 0)).toBeCloseTo(truePos, 0);
    // Uncertainty should have decreased
    expect(state.covariance.get(0, 0)).toBeLessThan(1);
  });

  it('tracks constant velocity in 2D state', () => {
    const dt = 1.0;
    let state = gaussianStateFromArrays([0, 1], [[10, 0], [0, 10]]); // [position, velocity]
    const f = (x: Matrix) => new Matrix(2, 1, [
      x.get(0, 0) + x.get(1, 0) * dt,
      x.get(1, 0),
    ]);
    const h = (x: Matrix) => new Matrix(1, 1, [x.get(0, 0)]); // observe position only
    const Q = Matrix.fromArray([[0.01, 0], [0, 0.01]]);
    const R = Matrix.fromArray([[0.5]]);

    // True trajectory: position = t, velocity = 1
    for (let t = 1; t <= 10; t++) {
      const z = new Matrix(1, 1, [t + (Math.random() - 0.5) * 0.2]); // noisy position
      const result = ukfStep(state, z, f, h, Q, R);
      state = result.state;
    }

    // Velocity estimate should converge near 1
    expect(state.mean.get(1, 0)).toBeCloseTo(1, 0);
    // Position should be near 10
    expect(state.mean.get(0, 0)).toBeCloseTo(10, 0);
  });

  it('handles nonlinear measurement (range observation)', () => {
    // State: [x, y], observe distance from origin
    let state = gaussianStateFromArrays([3, 4], [[2, 0], [0, 2]]);
    const f = (x: Matrix) => x; // static target
    const h = (x: Matrix) => {
      const range = Math.sqrt(x.get(0, 0) ** 2 + x.get(1, 0) ** 2);
      return new Matrix(1, 1, [range]);
    };
    const Q = Matrix.fromArray([[0.001, 0], [0, 0.001]]);
    const R = Matrix.fromArray([[0.1]]);

    // True distance = 5.0
    const measurements = [5.0, 4.95, 5.1, 5.0, 4.98, 5.02];
    for (const z of measurements) {
      const result = ukfStep(state, new Matrix(1, 1, [z]), f, h, Q, R);
      state = result.state;
    }

    // Position estimate should maintain distance ≈ 5 from origin
    const x = state.mean.get(0, 0);
    const y = state.mean.get(1, 0);
    const dist = Math.sqrt(x * x + y * y);
    expect(dist).toBeCloseTo(5, 0);
  });
});

describe('UKF edge cases', () => {
  it('works with 1D state', () => {
    const state = gaussianStateFromArrays([0], [[1]]);
    const points = ukfGenerateSigmaPoints(state);
    expect(points.length).toBe(3); // 2*1+1
  });

  it('works with large state dimension (n=6)', () => {
    const n = 6;
    const mean = new Array(n).fill(0);
    const cov = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
    const state = gaussianStateFromArrays(mean, cov);
    const points = ukfGenerateSigmaPoints(state);
    expect(points.length).toBe(2 * n + 1);
    for (const p of points) {
      expect(p.rows).toBe(n);
      expect(p.cols).toBe(1);
    }
  });

  it('DEFAULT_UKF_PARAMS has expected values', () => {
    expect(DEFAULT_UKF_PARAMS.alpha).toBe(1e-3);
    expect(DEFAULT_UKF_PARAMS.beta).toBe(2);
    expect(DEFAULT_UKF_PARAMS.kappa).toBe(0);
  });
});
