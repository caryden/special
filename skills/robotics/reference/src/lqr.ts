/**
 * Linear Quadratic Regulator (LQR) for continuous and discrete-time systems.
 *
 * Solves the algebraic Riccati equation (ARE/DARE) to compute the optimal
 * state-feedback gain K that minimizes J = ∫(x'Qx + u'Ru) dt.
 *
 * @node lqr
 * @depends-on mat-ops
 * @contract lqr.test.ts
 * @hint off-policy: Continuous (CARE) vs discrete (DARE) default. We provide both
 *       and let the caller choose. Default is continuous.
 * @hint algorithm: CARE solved via iterative Newton method on the Riccati equation.
 *       DARE solved via iterative method. Both converge for stabilizable (A,B) pairs.
 * @provenance ControlSystems.jl v1.12.0 (cross-validation), python-control v0.10.2
 */

import {
  Matrix,
  matMultiply,
  matTranspose,
  matAdd,
  matSub,
  matScale,
  matInverse,
  matIdentity,
  matNorm,
} from './mat-ops.ts';

/** Result of solving a Riccati equation. */
export interface RiccatiResult {
  /** Solution to the Riccati equation. */
  P: Matrix;
  /** Optimal state-feedback gain matrix. */
  K: Matrix;
}

/** Options for the LQR dispatcher. */
export interface LqrOptions {
  /** 'continuous' (default) or 'discrete'. */
  type?: 'continuous' | 'discrete';
}

/**
 * Build a 2n x 2n block matrix from four n x n blocks:
 *   [ A  B ]
 *   [ C  D ]
 */
function blockMatrix(topLeft: Matrix, topRight: Matrix, botLeft: Matrix, botRight: Matrix): Matrix {
  const n = topLeft.rows;
  const data = new Array(4 * n * n);
  const cols = 2 * n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      data[r * cols + c] = topLeft.get(r, c);
      data[r * cols + (n + c)] = topRight.get(r, c);
      data[(n + r) * cols + c] = botLeft.get(r, c);
      data[(n + r) * cols + (n + c)] = botRight.get(r, c);
    }
  }
  return new Matrix(2 * n, 2 * n, data);
}

/**
 * Extract an n x n block from a 2n x 2n matrix.
 * blockRow and blockCol are 0 or 1.
 */
function extractBlock(M: Matrix, blockRow: number, blockCol: number, n: number): Matrix {
  const data = new Array(n * n);
  const cols = M.cols;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      data[r * n + c] = M.get(blockRow * n + r, blockCol * n + c);
    }
  }
  return new Matrix(n, n, data);
}

/**
 * Solve the Continuous Algebraic Riccati Equation (CARE):
 *   A'P + PA - PBR^{-1}B'P + Q = 0
 *
 * Uses the matrix sign function method on the Hamiltonian matrix:
 *   H = [  A    -B R^{-1} B' ]
 *       [ -Q        -A'      ]
 *
 * The sign function iteration: H_{k+1} = 0.5 * (H_k + H_k^{-1})
 * converges to sign(H). Then P is extracted from the stable invariant subspace.
 *
 * @param A - State matrix (n x n)
 * @param B - Input matrix (n x m)
 * @param Q - State cost matrix (n x n), positive semi-definite
 * @param R - Input cost matrix (m x m), positive definite
 * @param maxIter - Maximum iterations (default 1000)
 * @param tol - Convergence tolerance (default 1e-10)
 * @returns { P, K } where K = R^{-1} B' P
 */
export function solveCARE(
  A: Matrix,
  B: Matrix,
  Q: Matrix,
  R: Matrix,
  maxIter: number = 1000,
  tol: number = 1e-10,
): RiccatiResult {
  const n = A.rows;
  const Bt = matTranspose(B);
  const At = matTranspose(A);
  const Rinv = matInverse(R);

  // S = B R^{-1} B'
  const S = matMultiply(B, matMultiply(Rinv, Bt));

  // Hamiltonian: H = [ A, -S; -Q, -A' ]
  const negS = matScale(S, -1);
  const negQ = matScale(Q, -1);
  const negAt = matScale(At, -1);

  let H = blockMatrix(A, negS, negQ, negAt);
  const I2n = matIdentity(2 * n);

  for (let i = 0; i < maxIter; i++) {
    const Hinv = matInverse(H);
    const Hnew = matScale(matAdd(H, Hinv), 0.5);
    const diff = matNorm(matSub(Hnew, H));
    H = Hnew;
    if (diff < tol) break;
  }

  // sign(H) converged. Now: W = I - sign(H), the stable subspace projector (scaled by 2)
  // Extract blocks: W = I_{2n} - H_converged
  // W = [ W11  W12 ]
  //     [ W21  W22 ]
  // P = -W21^{-1} * W11... actually:
  // From sign(H), the stable invariant subspace is spanned by columns of (I - sign(H)).
  // [ I - S11,   -S12  ] has rank n. The stable subspace basis gives:
  // [ -S21,    I - S22  ]
  // P = W21 * W11^{-1} where W = I_{2n} - sign(H)
  // Actually: the columns of W = (I - sign(H))/2 span the stable subspace.
  // If we write W = [W1; W2] (each n x 2n), then P = W2 * W1^{-1}...
  // But we need to extract an n-rank subspace.

  // Standard extraction: from sign(H) = [ S11 S12; S21 S22 ]
  // P = -S21^{-1} when W21 is nonsingular, but more robustly:
  // W11 = (I_n - S11)/2, W21 = -S21/2
  // P = W21 * inv(W11)

  const S11 = extractBlock(H, 0, 0, n);
  const S21 = extractBlock(H, 1, 0, n);

  const In = matIdentity(n);
  const W11 = matScale(matSub(In, S11), 0.5);
  const W21 = matScale(S21, -0.5);

  const P = matMultiply(W21, matInverse(W11));

  // K = R^{-1} B' P
  const K = matMultiply(matMultiply(Rinv, Bt), P);

  return { P, K };
}

/**
 * Solve the Discrete Algebraic Riccati Equation (DARE):
 *   P = A'PA - A'PB(R + B'PB)^{-1}B'PA + Q
 *
 * Uses fixed-point iteration directly on the DARE formula.
 *
 * @param A - State transition matrix (n x n)
 * @param B - Input matrix (n x m)
 * @param Q - State cost matrix (n x n), positive semi-definite
 * @param R - Input cost matrix (m x m), positive definite
 * @param maxIter - Maximum iterations (default 10000)
 * @param tol - Convergence tolerance on Frobenius norm of ΔP (default 1e-10)
 * @returns { P, K } where K = (R + B'PB)^{-1} B' P A
 */
export function solveDARE(
  A: Matrix,
  B: Matrix,
  Q: Matrix,
  R: Matrix,
  maxIter: number = 10000,
  tol: number = 1e-10,
): RiccatiResult {
  const Bt = matTranspose(B);
  const At = matTranspose(A);
  const n = A.rows;

  let P = new Matrix(n, n, Q.data.slice());

  for (let i = 0; i < maxIter; i++) {
    // A'PA
    const AtP = matMultiply(At, P);
    const AtPA = matMultiply(AtP, A);
    // B'PB
    const BtP = matMultiply(Bt, P);
    const BtPB = matMultiply(BtP, B);
    // (R + B'PB)^{-1}
    const RpBtPB_inv = matInverse(matAdd(R, BtPB));
    // B'PA
    const BtPA = matMultiply(BtP, A);
    // A'PB(R + B'PB)^{-1}B'PA
    const AtPB = matMultiply(AtP, B);
    const correction = matMultiply(matMultiply(AtPB, RpBtPB_inv), BtPA);

    const Pnew = matAdd(matSub(AtPA, correction), Q);

    const diff = matNorm(matSub(Pnew, P));
    P = Pnew;
    if (diff < tol) break;
  }

  // K = (R + B'PB)^{-1} B' P A
  const BtP = matMultiply(Bt, P);
  const BtPB = matMultiply(BtP, B);
  const K = matMultiply(matInverse(matAdd(R, BtPB)), matMultiply(BtP, A));

  return { P, K };
}

/**
 * LQR dispatcher. Computes the optimal state-feedback gain K.
 *
 * @param A - State (transition) matrix (n x n)
 * @param B - Input matrix (n x m)
 * @param Q - State cost matrix (n x n)
 * @param R - Input cost matrix (m x m)
 * @param options - { type: 'continuous' | 'discrete' }, defaults to 'continuous'
 * @returns { K, P } - gain and Riccati solution
 */
export function lqr(
  A: Matrix,
  B: Matrix,
  Q: Matrix,
  R: Matrix,
  options?: LqrOptions,
): RiccatiResult {
  const type = options?.type ?? 'continuous';
  if (type === 'discrete') {
    return solveDARE(A, B, Q, R);
  }
  return solveCARE(A, B, Q, R);
}

/**
 * Convenience function for discrete LQR.
 * Equivalent to lqr(A, B, Q, R, { type: 'discrete' }).
 */
export function dlqr(
  A: Matrix,
  B: Matrix,
  Q: Matrix,
  R: Matrix,
): RiccatiResult {
  return solveDARE(A, B, Q, R);
}
