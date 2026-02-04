import { describe, test, expect } from 'bun:test';
import { solveCARE, solveDARE, lqr, dlqr } from './lqr.ts';
import {
  Matrix,
  matMultiply,
  matTranspose,
  matAdd,
  matSub,
  matIdentity,
  matInverse,
  matNorm,
  matEigen,
} from './mat-ops.ts';

/** Helper: check that a matrix is approximately symmetric. */
function expectSymmetric(P: Matrix, tol: number = 1e-6): void {
  const Pt = matTranspose(P);
  for (let r = 0; r < P.rows; r++) {
    for (let c = 0; c < P.cols; c++) {
      expect(Math.abs(P.get(r, c) - Pt.get(r, c))).toBeLessThan(tol);
    }
  }
}

/** Helper: check that all eigenvalues of symmetric M are positive. */
function expectPositiveDefinite(M: Matrix, tol: number = 1e-6): void {
  const { values } = matEigen(M);
  for (const v of values) {
    expect(v).toBeGreaterThan(-tol);
  }
}

/** Helper: compute eigenvalues of a (possibly non-symmetric) 2x2 matrix. */
function eig2x2(M: Matrix): { re: number; im: number }[] {
  const a = M.get(0, 0);
  const b = M.get(0, 1);
  const c = M.get(1, 0);
  const d = M.get(1, 1);
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc >= 0) {
    const sqrtDisc = Math.sqrt(disc);
    return [
      { re: (tr + sqrtDisc) / 2, im: 0 },
      { re: (tr - sqrtDisc) / 2, im: 0 },
    ];
  }
  const sqrtDisc = Math.sqrt(-disc);
  return [
    { re: tr / 2, im: sqrtDisc / 2 },
    { re: tr / 2, im: -sqrtDisc / 2 },
  ];
}

/** Helper: eigenvalues of 1x1 matrix. */
function eig1x1(M: Matrix): { re: number; im: number }[] {
  return [{ re: M.get(0, 0), im: 0 }];
}

/** Helper: spectral radius for 2x2 (max absolute eigenvalue). */
function spectralRadius2x2(M: Matrix): number {
  const eigs = eig2x2(M);
  return Math.max(
    ...eigs.map((e) => Math.sqrt(e.re * e.re + e.im * e.im)),
  );
}

describe('solveCARE', () => {
  test('1D double integrator: K ≈ [1, √3]', () => {
    // A = [[0,1],[0,0]], B = [[0],[1]], Q = I(2), R = [[1]]
    // Analytical CARE solution:
    //   P = [[√3, 1],[1, √3]], K = R^{-1}B'P = [1, √3]
    // Verified: residual A'P + PA - PBR^{-1}B'P + Q ≈ 0
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P, K } = solveCARE(A, B, Q, R);

    const sqrt3 = Math.sqrt(3);
    expect(K.rows).toBe(1);
    expect(K.cols).toBe(2);
    expect(K.get(0, 0)).toBeCloseTo(1.0, 4);
    expect(K.get(0, 1)).toBeCloseTo(sqrt3, 4);

    expect(P.get(0, 0)).toBeCloseTo(sqrt3, 4);
    expect(P.get(0, 1)).toBeCloseTo(1.0, 4);
    expect(P.get(1, 0)).toBeCloseTo(1.0, 4);
    expect(P.get(1, 1)).toBeCloseTo(sqrt3, 4);
  });

  test('1D double integrator: closed-loop is stable', () => {
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { K } = solveCARE(A, B, Q, R);

    // A_cl = A - B*K
    const Acl = matSub(A, matMultiply(B, K));
    const eigs = eig2x2(Acl);
    for (const e of eigs) {
      expect(e.re).toBeLessThan(0); // negative real part => stable
    }
  });

  test('spring-mass system: closed-loop stable', () => {
    const A = Matrix.fromArray([[0, 1], [-2, -1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P, K } = solveCARE(A, B, Q, R);

    // K has correct dimensions
    expect(K.rows).toBe(1);
    expect(K.cols).toBe(2);

    // P is symmetric positive definite
    expectSymmetric(P);
    expectPositiveDefinite(P);

    // Closed-loop stable
    const Acl = matSub(A, matMultiply(B, K));
    const eigs = eig2x2(Acl);
    for (const e of eigs) {
      expect(e.re).toBeLessThan(0);
    }
  });

  test('scalar system: A=[[2]], B=[[1]], Q=[[1]], R=[[1]]', () => {
    // CARE: A'P + PA - PBR^{-1}B'P + Q = 0
    // 2P + 2P - P^2 + 1 = 0 => P^2 - 4P - 1 = 0 => P = 2 + √5
    const A = Matrix.fromArray([[2]]);
    const B = Matrix.fromArray([[1]]);
    const Q = Matrix.fromArray([[1]]);
    const R = Matrix.fromArray([[1]]);

    const { P, K } = solveCARE(A, B, Q, R);

    const expectedP = 2 + Math.sqrt(5);
    expect(P.get(0, 0)).toBeCloseTo(expectedP, 4);
    expect(K.get(0, 0)).toBeCloseTo(expectedP, 4); // K = R^{-1} B' P = P
  });

  test('identity check: A=0, B=I, Q=I, R=I => P=I, K=I', () => {
    const n = 2;
    const A = Matrix.zeros(n, n);
    const B = matIdentity(n);
    const Q = matIdentity(n);
    const R = matIdentity(n);

    const { P, K } = solveCARE(A, B, Q, R);

    // CARE: 0 + 0 - P*I*I*I*P + I = 0 => P^2 = I => P = I
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const expected = r === c ? 1.0 : 0.0;
        expect(P.get(r, c)).toBeCloseTo(expected, 4);
        expect(K.get(r, c)).toBeCloseTo(expected, 4);
      }
    }
  });

  test('CARE residual is small', () => {
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P } = solveCARE(A, B, Q, R);

    // Residual: A'P + PA - PBR^{-1}B'P + Q should be ≈ 0
    const At = matTranspose(A);
    const Bt = matTranspose(B);
    const Rinv = matInverse(R);
    const residual = matAdd(
      matAdd(matMultiply(At, P), matMultiply(P, A)),
      matSub(Q, matMultiply(matMultiply(P, matMultiply(B, matMultiply(Rinv, Bt))), P)),
    );

    expect(matNorm(residual)).toBeLessThan(1e-6);
  });

  test('P is symmetric positive definite for double integrator', () => {
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P } = solveCARE(A, B, Q, R);

    expectSymmetric(P);
    expectPositiveDefinite(P);
  });

  test('large gain with small R', () => {
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const Rsmall = Matrix.fromArray([[0.01]]);
    const Rlarge = Matrix.fromArray([[100]]);

    const { K: Ksmall } = solveCARE(A, B, Q, Rsmall);
    const { K: Klarge } = solveCARE(A, B, Q, Rlarge);

    // Small R => larger gains (more aggressive control)
    expect(Math.abs(Ksmall.get(0, 0))).toBeGreaterThan(Math.abs(Klarge.get(0, 0)));
    expect(Math.abs(Ksmall.get(0, 1))).toBeGreaterThan(Math.abs(Klarge.get(0, 1)));
  });
});

describe('solveDARE', () => {
  test('discrete double integrator: K has correct dimensions', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P, K } = solveDARE(A, B, Q, R);

    expect(K.rows).toBe(1);
    expect(K.cols).toBe(2);
    expect(P.rows).toBe(2);
    expect(P.cols).toBe(2);
  });

  test('discrete double integrator: closed-loop eigenvalues inside unit circle', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { K } = solveDARE(A, B, Q, R);

    const Acl = matSub(A, matMultiply(B, K));
    const sr = spectralRadius2x2(Acl);
    expect(sr).toBeLessThan(1.0); // inside unit circle
  });

  test('discrete double integrator: P is symmetric positive definite', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P } = solveDARE(A, B, Q, R);

    expectSymmetric(P);
    expectPositiveDefinite(P);
  });

  test('DARE residual is small', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const { P } = solveDARE(A, B, Q, R);

    // Residual: P - (A'PA - A'PB(R+B'PB)^{-1}B'PA + Q) should be ≈ 0
    const At = matTranspose(A);
    const Bt = matTranspose(B);
    const AtP = matMultiply(At, P);
    const AtPA = matMultiply(AtP, A);
    const BtP = matMultiply(Bt, P);
    const BtPB = matMultiply(BtP, B);
    const BtPA = matMultiply(BtP, A);
    const AtPB = matMultiply(AtP, B);
    const correction = matMultiply(matMultiply(AtPB, matInverse(matAdd(R, BtPB))), BtPA);
    const Prhs = matAdd(matSub(AtPA, correction), Q);

    const residual = matSub(P, Prhs);
    expect(matNorm(residual)).toBeLessThan(1e-6);
  });

  test('scalar discrete system', () => {
    // A=[[1.5]], B=[[1]], Q=[[1]], R=[[1]]
    // DARE: P = 1.5^2 P - 1.5^2 P^2/(1+P) + 1
    //      = 2.25P - 2.25P^2/(1+P) + 1
    //      = (2.25P(1+P) - 2.25P^2)/(1+P) + 1
    //      = 2.25P/(1+P) + 1
    // P(1+P) = 2.25P + 1 + P => P + P^2 = 2.25P + 1 + P => P^2 = 2.25P + 1
    // P^2 - 2.25P - 1 = 0 => P = (2.25 + sqrt(2.25^2 + 4))/2
    const A = Matrix.fromArray([[1.5]]);
    const B = Matrix.fromArray([[1]]);
    const Q = Matrix.fromArray([[1]]);
    const R = Matrix.fromArray([[1]]);

    const { P, K } = solveDARE(A, B, Q, R);

    const expectedP = (2.25 + Math.sqrt(2.25 * 2.25 + 4)) / 2;
    expect(P.get(0, 0)).toBeCloseTo(expectedP, 4);

    // K = (R + B'PB)^{-1} B' P A = P*1.5 / (1+P)
    const expectedK = (expectedP * 1.5) / (1 + expectedP);
    expect(K.get(0, 0)).toBeCloseTo(expectedK, 4);

    // Closed-loop: A - BK stable (|eigenvalue| < 1)
    const eig = (A.get(0, 0) - B.get(0, 0) * K.get(0, 0));
    expect(Math.abs(eig)).toBeLessThan(1);
  });

  test('large gain with small R (discrete)', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const Rsmall = Matrix.fromArray([[0.01]]);
    const Rlarge = Matrix.fromArray([[100]]);

    const { K: Ksmall } = solveDARE(A, B, Q, Rsmall);
    const { K: Klarge } = solveDARE(A, B, Q, Rlarge);

    // Small R => larger gains
    expect(Math.abs(Ksmall.get(0, 0))).toBeGreaterThan(Math.abs(Klarge.get(0, 0)));
  });
});

describe('lqr', () => {
  test('defaults to continuous', () => {
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const result = lqr(A, B, Q, R);
    const carResult = solveCARE(A, B, Q, R);

    // Should match CARE result
    expect(result.K.get(0, 0)).toBeCloseTo(carResult.K.get(0, 0), 10);
    expect(result.K.get(0, 1)).toBeCloseTo(carResult.K.get(0, 1), 10);
  });

  test('explicit continuous option', () => {
    const A = Matrix.fromArray([[0, 1], [0, 0]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const result = lqr(A, B, Q, R, { type: 'continuous' });
    const carResult = solveCARE(A, B, Q, R);

    expect(result.K.get(0, 0)).toBeCloseTo(carResult.K.get(0, 0), 10);
  });

  test('discrete option calls DARE', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const result = lqr(A, B, Q, R, { type: 'discrete' });
    const dareResult = solveDARE(A, B, Q, R);

    expect(result.K.get(0, 0)).toBeCloseTo(dareResult.K.get(0, 0), 10);
    expect(result.K.get(0, 1)).toBeCloseTo(dareResult.K.get(0, 1), 10);
  });
});

describe('dlqr', () => {
  test('convenience wrapper matches solveDARE', () => {
    const A = Matrix.fromArray([[1, 1], [0, 1]]);
    const B = Matrix.fromArray([[0], [1]]);
    const Q = matIdentity(2);
    const R = Matrix.fromArray([[1]]);

    const result = dlqr(A, B, Q, R);
    const dareResult = solveDARE(A, B, Q, R);

    expect(result.K.get(0, 0)).toBeCloseTo(dareResult.K.get(0, 0), 10);
    expect(result.K.get(0, 1)).toBeCloseTo(dareResult.K.get(0, 1), 10);
    expect(result.P.get(0, 0)).toBeCloseTo(dareResult.P.get(0, 0), 10);
  });
});

describe('property tests', () => {
  test('K dimensions are m x n for CARE', () => {
    // 3x3 system with 2 inputs
    const A = Matrix.fromArray([[0, 1, 0], [0, 0, 1], [-1, -2, -3]]);
    const B = Matrix.fromArray([[0, 0], [1, 0], [0, 1]]);
    const Q = matIdentity(3);
    const R = matIdentity(2);

    const { K } = solveCARE(A, B, Q, R);

    expect(K.rows).toBe(2); // m = 2 inputs
    expect(K.cols).toBe(3); // n = 3 states
  });

  test('K dimensions are m x n for DARE', () => {
    const A = Matrix.fromArray([[1, 0.1, 0], [0, 1, 0.1], [0, 0, 1]]);
    const B = Matrix.fromArray([[0, 0], [0.1, 0], [0, 0.1]]);
    const Q = matIdentity(3);
    const R = matIdentity(2);

    const { K } = solveDARE(A, B, Q, R);

    expect(K.rows).toBe(2);
    expect(K.cols).toBe(3);
  });

  test('3x3 CARE: closed-loop stability', () => {
    const A = Matrix.fromArray([[0, 1, 0], [0, 0, 1], [-1, -2, -3]]);
    const B = Matrix.fromArray([[0, 0], [1, 0], [0, 1]]);
    const Q = matIdentity(3);
    const R = matIdentity(2);

    const { P, K } = solveCARE(A, B, Q, R);

    expectSymmetric(P);
    expectPositiveDefinite(P);

    // Check CARE residual
    const At = matTranspose(A);
    const Bt = matTranspose(B);
    const Rinv = matInverse(R);
    const residual = matAdd(
      matAdd(matMultiply(At, P), matMultiply(P, A)),
      matSub(Q, matMultiply(matMultiply(P, matMultiply(B, matMultiply(Rinv, Bt))), P)),
    );
    expect(matNorm(residual)).toBeLessThan(1e-5);
  });
});
