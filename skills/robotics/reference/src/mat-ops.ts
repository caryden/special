/**
 * Matrix operations for robotics algorithms.
 *
 * All operations are pure — they return new Matrix instances and never mutate inputs.
 * The Matrix class uses row-major flat storage for efficient translation to
 * numpy (row-major), Eigen (column-major with explicit mapping), and other backends.
 *
 * @node mat-ops
 * @contract mat-ops.test.ts
 * @hint types: Lightweight Matrix class with row-major flat array storage
 * @hint purity: Every function returns a new Matrix. Never mutate inputs.
 * @hint translation: Map Matrix to numpy.ndarray (Python), Eigen::MatrixXd (C++),
 *       DenseMatrix (Kotlin), nalgebra::DMatrix (Rust), mat (Go gonum)
 */

/** Lightweight immutable matrix with row-major flat array storage. */
export class Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: number[];

  constructor(rows: number, cols: number, data?: number[]) {
    this.rows = rows;
    this.cols = cols;
    if (data !== undefined) {
      if (data.length !== rows * cols) {
        throw new Error(
          `Data length ${data.length} does not match ${rows}x${cols} = ${rows * cols}`,
        );
      }
      this.data = data.slice(); // defensive copy
    } else {
      this.data = new Array(rows * cols).fill(0);
    }
  }

  /** Get element at (row, col). */
  get(row: number, col: number): number {
    return this.data[row * this.cols + col];
  }

  /** Return a new Matrix with element at (row, col) replaced. */
  set(row: number, col: number, value: number): Matrix {
    const newData = this.data.slice();
    newData[row * this.cols + col] = value;
    return new Matrix(this.rows, this.cols, newData);
  }

  /** Convert to 2D array for debugging/testing. */
  toArray(): number[][] {
    const result: number[][] = [];
    for (let r = 0; r < this.rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(this.data[r * this.cols + c]);
      }
      result.push(row);
    }
    return result;
  }

  /** Create a Matrix from a 2D array. */
  static fromArray(arr: number[][]): Matrix {
    const rows = arr.length;
    const cols = arr[0].length;
    const data: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        data.push(arr[r][c]);
      }
    }
    return new Matrix(rows, cols, data);
  }

  /** Create an n x n identity matrix. */
  static identity(n: number): Matrix {
    const data = new Array(n * n).fill(0);
    for (let i = 0; i < n; i++) {
      data[i * n + i] = 1;
    }
    return new Matrix(n, n, data);
  }

  /** Create an rows x cols zero matrix. */
  static zeros(rows: number, cols: number): Matrix {
    return new Matrix(rows, cols);
  }
}

/** Matrix multiplication: A (m x n) * B (n x p) -> C (m x p). */
export function matMultiply(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) {
    throw new Error(
      `Incompatible dimensions: ${a.rows}x${a.cols} * ${b.rows}x${b.cols}`,
    );
  }
  const m = a.rows;
  const n = a.cols;
  const p = b.cols;
  const data = new Array(m * p).fill(0);
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const aik = a.data[i * n + k];
      for (let j = 0; j < p; j++) {
        data[i * p + j] += aik * b.data[k * p + j];
      }
    }
  }
  return new Matrix(m, p, data);
}

/** Transpose of a matrix. */
export function matTranspose(a: Matrix): Matrix {
  const data = new Array(a.rows * a.cols);
  for (let r = 0; r < a.rows; r++) {
    for (let c = 0; c < a.cols; c++) {
      data[c * a.rows + r] = a.data[r * a.cols + c];
    }
  }
  return new Matrix(a.cols, a.rows, data);
}

/** Element-wise addition: A + B. */
export function matAdd(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error(
      `Dimension mismatch: ${a.rows}x${a.cols} vs ${b.rows}x${b.cols}`,
    );
  }
  const data = new Array(a.data.length);
  for (let i = 0; i < a.data.length; i++) {
    data[i] = a.data[i] + b.data[i];
  }
  return new Matrix(a.rows, a.cols, data);
}

/** Element-wise subtraction: A - B. */
export function matSub(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error(
      `Dimension mismatch: ${a.rows}x${a.cols} vs ${b.rows}x${b.cols}`,
    );
  }
  const data = new Array(a.data.length);
  for (let i = 0; i < a.data.length; i++) {
    data[i] = a.data[i] - b.data[i];
  }
  return new Matrix(a.rows, a.cols, data);
}

/** Scalar multiplication: s * A. */
export function matScale(a: Matrix, s: number): Matrix {
  const data = new Array(a.data.length);
  for (let i = 0; i < a.data.length; i++) {
    data[i] = a.data[i] * s;
  }
  return new Matrix(a.rows, a.cols, data);
}

/** Sum of diagonal elements. */
export function matTrace(a: Matrix): number {
  const n = Math.min(a.rows, a.cols);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += a.data[i * a.cols + i];
  }
  return sum;
}

/** Outer product: a * b^T where a and b are vectors (1D arrays). */
export function matOuterProduct(a: number[], b: number[]): Matrix {
  const m = a.length;
  const n = b.length;
  const data = new Array(m * n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      data[i * n + j] = a[i] * b[j];
    }
  }
  return new Matrix(m, n, data);
}

/** Create a diagonal matrix from a vector. */
export function matFromDiag(d: number[]): Matrix {
  const n = d.length;
  const data = new Array(n * n).fill(0);
  for (let i = 0; i < n; i++) {
    data[i * n + i] = d[i];
  }
  return new Matrix(n, n, data);
}

/** Extract column as a vector. */
export function matColumn(a: Matrix, col: number): number[] {
  const result = new Array(a.rows);
  for (let r = 0; r < a.rows; r++) {
    result[r] = a.data[r * a.cols + col];
  }
  return result;
}

/** Extract row as a vector. */
export function matRow(a: Matrix, row: number): number[] {
  const result = new Array(a.cols);
  for (let c = 0; c < a.cols; c++) {
    result[c] = a.data[row * a.cols + c];
  }
  return result;
}

/** Frobenius norm: sqrt(sum of squares of all elements). */
export function matNorm(a: Matrix): number {
  let sum = 0;
  for (let i = 0; i < a.data.length; i++) {
    sum += a.data[i] * a.data[i];
  }
  return Math.sqrt(sum);
}

/** Approximate element-wise equality within tolerance (default 1e-14). */
export function matEqual(a: Matrix, b: Matrix, tol: number = 1e-14): boolean {
  if (a.rows !== b.rows || a.cols !== b.cols) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (Math.abs(a.data[i] - b.data[i]) > tol) return false;
  }
  return true;
}

/** n x n identity matrix. Convenience wrapper for Matrix.identity(n). */
export function matIdentity(n: number): Matrix {
  return Matrix.identity(n);
}

/** m x n zero matrix. Convenience wrapper for Matrix.zeros(m, n). */
export function matZeros(m: number, n: number): Matrix {
  return Matrix.zeros(m, n);
}

/** Extract column as a Matrix column vector (rows x 1). */
export function matGetColumn(a: Matrix, col: number): Matrix {
  const data = new Array(a.rows);
  for (let r = 0; r < a.rows; r++) {
    data[r] = a.data[r * a.cols + col];
  }
  return new Matrix(a.rows, 1, data);
}

/** Extract row as a Matrix row vector (1 x cols). */
export function matGetRow(a: Matrix, row: number): Matrix {
  const data = new Array(a.cols);
  for (let c = 0; c < a.cols; c++) {
    data[c] = a.data[row * a.cols + c];
  }
  return new Matrix(1, a.cols, data);
}

/** Matrix inverse via Gauss-Jordan elimination. Throws if singular. */
export function matInverse(a: Matrix): Matrix {
  if (a.rows !== a.cols) {
    throw new Error("Matrix must be square");
  }
  const n = a.rows;

  // Build augmented matrix [A | I] as mutable working copy
  const aug: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row = new Array(2 * n);
    for (let c = 0; c < n; c++) {
      row[c] = a.data[r * n + c];
    }
    for (let c = 0; c < n; c++) {
      row[n + c] = r === c ? 1 : 0;
    }
    aug.push(row);
  }

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(aug[r][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }
    if (maxVal < 1e-14) {
      throw new Error("Matrix is singular");
    }
    if (maxRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = tmp;
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let c = 0; c < 2 * n; c++) {
      aug[col][c] /= pivot;
    }

    // Eliminate column
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let c = 0; c < 2 * n; c++) {
        aug[r][c] -= factor * aug[col][c];
      }
    }
  }

  // Extract right half
  const data = new Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      data[r * n + c] = aug[r][n + c];
    }
  }
  return new Matrix(n, n, data);
}

/**
 * LU decomposition with partial pivoting.
 * Returns { L, U, perm } where P*A = L*U.
 * perm is the permutation vector.
 */
function luDecompose(a: Matrix): { L: number[][]; U: number[][]; perm: number[]; swaps: number } {
  const n = a.rows;
  // Copy into mutable 2D array
  const U: number[][] = [];
  for (let r = 0; r < n; r++) {
    U.push(a.data.slice(r * n, (r + 1) * n));
  }
  const L: number[][] = [];
  for (let r = 0; r < n; r++) {
    L.push(new Array(n).fill(0));
    L[r][r] = 1;
  }
  const perm: number[] = [];
  for (let i = 0; i < n; i++) perm.push(i);
  let swaps = 0;

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(U[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(U[r][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }
    if (maxRow !== col) {
      // Swap rows in U
      const tmpU = U[col];
      U[col] = U[maxRow];
      U[maxRow] = tmpU;
      // Swap rows in L (only the part before col)
      for (let c = 0; c < col; c++) {
        const tmpL = L[col][c];
        L[col][c] = L[maxRow][c];
        L[maxRow][c] = tmpL;
      }
      // Swap perm
      const tmpP = perm[col];
      perm[col] = perm[maxRow];
      perm[maxRow] = tmpP;
      swaps++;
    }

    if (Math.abs(U[col][col]) < 1e-14) continue;

    for (let r = col + 1; r < n; r++) {
      const factor = U[r][col] / U[col][col];
      L[r][col] = factor;
      for (let c = col; c < n; c++) {
        U[r][c] -= factor * U[col][c];
      }
    }
  }

  return { L, U, perm, swaps };
}

/** Solve Ax = b via LU decomposition with partial pivoting. A must be square. */
export function matSolve(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== a.cols) {
    throw new Error("Matrix A must be square");
  }
  if (a.rows !== b.rows) {
    throw new Error("Dimension mismatch between A and b");
  }
  const n = a.rows;
  const nrhs = b.cols;
  const { L, U, perm } = luDecompose(a);

  const results = new Array(n * nrhs);

  for (let rhs = 0; rhs < nrhs; rhs++) {
    // Apply permutation to b column
    const pb = new Array(n);
    for (let i = 0; i < n; i++) {
      pb[i] = b.data[perm[i] * nrhs + rhs];
    }

    // Forward substitution: Ly = Pb
    const y = new Array(n);
    for (let i = 0; i < n; i++) {
      let sum = pb[i];
      for (let j = 0; j < i; j++) {
        sum -= L[i][j] * y[j];
      }
      y[i] = sum;
    }

    // Back substitution: Ux = y
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let j = i + 1; j < n; j++) {
        sum -= U[i][j] * x[j];
      }
      if (Math.abs(U[i][i]) < 1e-14) {
        throw new Error("Matrix is singular");
      }
      x[i] = sum / U[i][i];
    }

    for (let i = 0; i < n; i++) {
      results[i * nrhs + rhs] = x[i];
    }
  }

  return new Matrix(n, nrhs, results);
}

/** Determinant via LU decomposition. */
export function matDeterminant(a: Matrix): number {
  if (a.rows !== a.cols) {
    throw new Error("Matrix must be square");
  }
  const n = a.rows;
  if (n === 1) return a.data[0];

  const { U, swaps } = luDecompose(a);
  let det = swaps % 2 === 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    det *= U[i][i];
  }
  return det;
}

/**
 * Cholesky decomposition: A = L * L^T.
 * A must be symmetric positive definite. Returns lower triangular L.
 */
export function matCholesky(a: Matrix): Matrix {
  if (a.rows !== a.cols) {
    throw new Error("Matrix must be square");
  }
  const n = a.rows;
  const L = new Array(n * n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i * n + k] * L[j * n + k];
      }
      if (i === j) {
        const diag = a.data[i * n + i] - sum;
        if (diag <= 0) {
          throw new Error("Matrix is not positive definite");
        }
        L[i * n + j] = Math.sqrt(diag);
      } else {
        L[i * n + j] = (a.data[i * n + j] - sum) / L[j * n + j];
      }
    }
  }

  return new Matrix(n, n, L);
}

/**
 * Eigenvalue decomposition for symmetric matrices via Jacobi iteration.
 * Returns eigenvalues (descending by absolute value) and corresponding eigenvectors as columns.
 */
export function matEigen(a: Matrix): { values: number[]; vectors: Matrix } {
  if (a.rows !== a.cols) {
    throw new Error("Matrix must be square");
  }
  const n = a.rows;

  // Work on a mutable copy
  const A: number[][] = [];
  for (let r = 0; r < n; r++) {
    A.push(a.data.slice(r * n, (r + 1) * n));
  }

  // Eigenvector accumulator starts as identity
  const V: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row = new Array(n).fill(0);
    row[r] = 1;
    V.push(row);
  }

  const maxIter = 100 * n * n;
  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const v = Math.abs(A[i][j]);
        if (v > maxVal) {
          maxVal = v;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < 1e-12) break;

    // Compute rotation
    const apq = A[p][q];
    const diff = A[q][q] - A[p][p];
    let t: number;
    if (Math.abs(apq) < 1e-14 * Math.abs(diff)) {
      t = apq / diff;
    } else {
      const phi = diff / (2 * apq);
      t = 1 / (Math.abs(phi) + Math.sqrt(1 + phi * phi));
      if (phi < 0) t = -t;
    }

    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;
    const tau = s / (1 + c);

    // Update A
    const app = A[p][p] - t * apq;
    const aqq = A[q][q] + t * apq;
    A[p][p] = app;
    A[q][q] = aqq;
    A[p][q] = 0;
    A[q][p] = 0;

    for (let r = 0; r < n; r++) {
      if (r === p || r === q) continue;
      const arp = A[r][p];
      const arq = A[r][q];
      A[r][p] = arp - s * (arq + tau * arp);
      A[p][r] = A[r][p];
      A[r][q] = arq + s * (arp - tau * arq);
      A[q][r] = A[r][q];
    }

    // Update V
    for (let r = 0; r < n; r++) {
      const vrp = V[r][p];
      const vrq = V[r][q];
      V[r][p] = vrp - s * (vrq + tau * vrp);
      V[r][q] = vrq + s * (vrp - tau * vrq);
    }
  }

  // Extract eigenvalues and sort by descending absolute value
  const eigenPairs: { value: number; col: number[] }[] = [];
  for (let i = 0; i < n; i++) {
    const col: number[] = [];
    for (let r = 0; r < n; r++) {
      col.push(V[r][i]);
    }
    eigenPairs.push({ value: A[i][i], col });
  }
  eigenPairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const values = eigenPairs.map((p) => p.value);
  const vecData = new Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      vecData[r * n + c] = eigenPairs[c].col[r];
    }
  }

  return { values, vectors: new Matrix(n, n, vecData) };
}

/**
 * Singular Value Decomposition via one-sided Jacobi.
 * Returns { U, S, V } where A = U * diag(S) * V^T.
 * S contains singular values in descending order.
 */
export function matSVD(a: Matrix): { U: Matrix; S: number[]; V: Matrix } {
  const m = a.rows;
  const n = a.cols;

  // Compute A^T * A
  const ata = matMultiply(matTranspose(a), a);

  // Eigendecompose A^T * A to get V and singular values squared
  const eigen = matEigen(ata);

  // Singular values are sqrt of eigenvalues (which should be non-negative)
  const S: number[] = [];
  const rank: number[] = [];
  for (let i = 0; i < eigen.values.length; i++) {
    const sv = Math.sqrt(Math.max(0, eigen.values[i]));
    S.push(sv);
    if (sv > 1e-10) {
      rank.push(i);
    }
  }

  // V = eigenvectors of A^T A (already columns of eigen.vectors)
  const V = eigen.vectors;

  // U = A * V * diag(1/S) for non-zero singular values
  const uData = new Array(m * n).fill(0);
  const av = matMultiply(a, V);
  for (let j = 0; j < n; j++) {
    if (S[j] > 1e-10) {
      for (let i = 0; i < m; i++) {
        uData[i * n + j] = av.data[i * n + j] / S[j];
      }
    }
  }

  // If m > n, we return U as m x n (thin SVD)
  const U = new Matrix(m, n, uData);

  return { U, S, V };
}
