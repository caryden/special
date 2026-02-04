import { describe, expect, test } from 'bun:test';
import { Matrix, matIdentity, matZeros, matScale } from './mat-ops.ts';
import {
  initialGaussianState,
  gaussianState,
  gaussianStateFromArrays,
  stateDimension,
  meanToArray,
  covarianceToArray,
  type GaussianState,
  type LinearSystemModel,
} from './state-types.ts';

describe('initialGaussianState', () => {
  test('default variance produces identity covariance', () => {
    const state = initialGaussianState(3);
    expect(state.mean.rows).toBe(3);
    expect(state.mean.cols).toBe(1);
    expect(state.covariance.rows).toBe(3);
    expect(state.covariance.cols).toBe(3);
    // Mean should be all zeros
    for (let i = 0; i < 3; i++) {
      expect(state.mean.get(i, 0)).toBe(0);
    }
    // Covariance should be identity
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(state.covariance.get(i, j)).toBe(i === j ? 1 : 0);
      }
    }
  });

  test('custom variance scales identity covariance', () => {
    const state = initialGaussianState(2, 5.0);
    expect(state.covariance.get(0, 0)).toBe(5.0);
    expect(state.covariance.get(1, 1)).toBe(5.0);
    expect(state.covariance.get(0, 1)).toBe(0);
    expect(state.covariance.get(1, 0)).toBe(0);
  });

  test('dimension determines matrix sizes', () => {
    const state = initialGaussianState(4);
    expect(state.mean.rows).toBe(4);
    expect(state.mean.cols).toBe(1);
    expect(state.covariance.rows).toBe(4);
    expect(state.covariance.cols).toBe(4);
  });
});

describe('gaussianState', () => {
  test('valid construction from Matrix objects', () => {
    const mean = Matrix.fromArray([[1], [2], [3]]);
    const cov = Matrix.fromArray([
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 3],
    ]);
    const state = gaussianState(mean, cov);
    expect(state.mean.get(0, 0)).toBe(1);
    expect(state.mean.get(1, 0)).toBe(2);
    expect(state.mean.get(2, 0)).toBe(3);
    expect(state.covariance.get(1, 1)).toBe(2);
  });

  test('throws if mean is not a column vector', () => {
    const mean = Matrix.fromArray([[1, 2, 3]]); // 1×3 row vector
    const cov = matIdentity(3);
    expect(() => gaussianState(mean, cov)).toThrow('Mean must be a column vector');
  });

  test('throws on dimension mismatch between mean and covariance', () => {
    const mean = Matrix.fromArray([[1], [2]]); // 2×1
    const cov = matIdentity(3); // 3×3
    expect(() => gaussianState(mean, cov)).toThrow('Dimension mismatch');
  });
});

describe('gaussianStateFromArrays', () => {
  test('simple 2D state', () => {
    const state = gaussianStateFromArrays(
      [1, 2],
      [
        [4, 0],
        [0, 9],
      ],
    );
    expect(state.mean.rows).toBe(2);
    expect(state.mean.cols).toBe(1);
    expect(state.mean.get(0, 0)).toBe(1);
    expect(state.mean.get(1, 0)).toBe(2);
    expect(state.covariance.get(0, 0)).toBe(4);
    expect(state.covariance.get(1, 1)).toBe(9);
  });

  test('4D state', () => {
    const mean = [1, 2, 3, 4];
    const cov = [
      [1, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 3, 0],
      [0, 0, 0, 4],
    ];
    const state = gaussianStateFromArrays(mean, cov);
    expect(state.mean.rows).toBe(4);
    expect(state.covariance.rows).toBe(4);
    expect(state.covariance.cols).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(state.mean.get(i, 0)).toBe(i + 1);
      expect(state.covariance.get(i, i)).toBe(i + 1);
    }
  });
});

describe('stateDimension', () => {
  test('returns correct dimension', () => {
    const state = initialGaussianState(5);
    expect(stateDimension(state)).toBe(5);
  });
});

describe('meanToArray', () => {
  test('simple conversion', () => {
    const state = gaussianStateFromArrays([3, 7], [[1, 0], [0, 1]]);
    expect(meanToArray(state)).toEqual([3, 7]);
  });

  test('verify values from initialGaussianState', () => {
    const state = initialGaussianState(3);
    expect(meanToArray(state)).toEqual([0, 0, 0]);
  });
});

describe('covarianceToArray', () => {
  test('identity covariance', () => {
    const state = initialGaussianState(2);
    expect(covarianceToArray(state)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  test('diagonal covariance', () => {
    const state = gaussianStateFromArrays(
      [0, 0, 0],
      [
        [2, 0, 0],
        [0, 5, 0],
        [0, 0, 8],
      ],
    );
    const arr = covarianceToArray(state);
    expect(arr[0][0]).toBe(2);
    expect(arr[1][1]).toBe(5);
    expect(arr[2][2]).toBe(8);
    expect(arr[0][1]).toBe(0);
    expect(arr[1][2]).toBe(0);
  });
});

describe('LinearSystemModel', () => {
  test('construct with B matrix', () => {
    const model: LinearSystemModel = {
      F: matIdentity(2),
      B: Matrix.fromArray([[1], [0]]),
      H: Matrix.fromArray([[1, 0]]),
      Q: matScale(matIdentity(2), 0.1),
      R: Matrix.fromArray([[1]]),
    };
    expect(model.F.rows).toBe(2);
    expect(model.B).not.toBeNull();
    expect(model.B!.rows).toBe(2);
    expect(model.B!.cols).toBe(1);
    expect(model.H.rows).toBe(1);
    expect(model.H.cols).toBe(2);
    expect(model.Q.get(0, 0)).toBe(0.1);
    expect(model.R.get(0, 0)).toBe(1);
  });

  test('construct without B matrix (null)', () => {
    const model: LinearSystemModel = {
      F: matIdentity(3),
      B: null,
      H: Matrix.fromArray([[1, 0, 0]]),
      Q: matScale(matIdentity(3), 0.01),
      R: Matrix.fromArray([[0.5]]),
    };
    expect(model.B).toBeNull();
    expect(model.F.rows).toBe(3);
    expect(model.H.cols).toBe(3);
  });
});
