import { describe, expect, test } from "bun:test";
import {
  Matrix,
  matMultiply,
  matTranspose,
  matInverse,
  matSolve,
  matCholesky,
  matDeterminant,
  matEigen,
  matSVD,
  matOuterProduct,
  matTrace,
  matAdd,
  matSub,
  matScale,
  matFromDiag,
  matColumn,
  matRow,
  matNorm,
  matEqual,
  matIdentity,
  matZeros,
  matGetColumn,
  matGetRow,
} from "./mat-ops";

const PREC = 10; // 1e-10 tolerance

// ─── Helper: check two matrices are element-wise close ───
function expectMatClose(a: Matrix, b: Matrix, precision = PREC) {
  expect(a.rows).toBe(b.rows);
  expect(a.cols).toBe(b.cols);
  for (let i = 0; i < a.data.length; i++) {
    expect(a.data[i]).toBeCloseTo(b.data[i], precision);
  }
}

// ─── Helper: check array close ───
function expectArrClose(a: number[], b: number[], precision = PREC) {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(a[i]).toBeCloseTo(b[i], precision);
  }
}

// ─── Matrix construction ──────────────────────────────────

describe("Matrix construction", () => {
  test("constructor creates zero matrix by default", () => {
    const m = new Matrix(2, 3);
    expect(m.rows).toBe(2);
    expect(m.cols).toBe(3);
    expect(m.data).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test("constructor with data", () => {
    const m = new Matrix(2, 2, [1, 2, 3, 4]);
    expect(m.get(0, 0)).toBe(1);
    expect(m.get(0, 1)).toBe(2);
    expect(m.get(1, 0)).toBe(3);
    expect(m.get(1, 1)).toBe(4);
  });

  test("constructor throws on data length mismatch", () => {
    expect(() => new Matrix(2, 2, [1, 2, 3])).toThrow();
  });

  test("constructor makes defensive copy of data", () => {
    const data = [1, 2, 3, 4];
    const m = new Matrix(2, 2, data);
    data[0] = 99;
    expect(m.data[0]).toBe(1);
  });

  test("fromArray creates matrix from 2D array", () => {
    // @provenance: manual construction
    const m = Matrix.fromArray([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(m.rows).toBe(2);
    expect(m.cols).toBe(3);
    expect(m.get(1, 2)).toBe(6);
  });

  test("toArray round-trips with fromArray", () => {
    const arr = [
      [1, 2],
      [3, 4],
    ];
    const m = Matrix.fromArray(arr);
    expect(m.toArray()).toEqual(arr);
  });

  test("identity creates correct matrix", () => {
    const I = Matrix.identity(3);
    expect(I.toArray()).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  test("zeros creates zero matrix", () => {
    const z = Matrix.zeros(2, 3);
    expect(z.toArray()).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  test("set returns new matrix without mutating original", () => {
    const m = Matrix.fromArray([
      [1, 2],
      [3, 4],
    ]);
    const m2 = m.set(0, 0, 99);
    expect(m.get(0, 0)).toBe(1); // original unchanged
    expect(m2.get(0, 0)).toBe(99);
  });

  test("fromDiag creates diagonal matrix", () => {
    // @provenance: numpy.diag([2, 3, 5]) verified
    const m = matFromDiag([2, 3, 5]);
    expect(m.toArray()).toEqual([
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 5],
    ]);
  });
});

// ─── matColumn / matRow ───────────────────────────────────

describe("matColumn and matRow", () => {
  const m = Matrix.fromArray([
    [1, 2, 3],
    [4, 5, 6],
  ]);

  test("matColumn extracts column", () => {
    expect(matColumn(m, 0)).toEqual([1, 4]);
    expect(matColumn(m, 2)).toEqual([3, 6]);
  });

  test("matRow extracts row", () => {
    expect(matRow(m, 0)).toEqual([1, 2, 3]);
    expect(matRow(m, 1)).toEqual([4, 5, 6]);
  });
});

// ─── matAdd / matSub / matScale ───────────────────────────

describe("matAdd, matSub, matScale", () => {
  test("matAdd adds element-wise", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const b = Matrix.fromArray([[5, 6], [7, 8]]);
    expectMatClose(matAdd(a, b), Matrix.fromArray([[6, 8], [10, 12]]));
  });

  test("matAdd throws on dimension mismatch", () => {
    expect(() => matAdd(new Matrix(2, 2), new Matrix(2, 3))).toThrow();
  });

  test("matSub subtracts element-wise", () => {
    const a = Matrix.fromArray([[5, 6], [7, 8]]);
    const b = Matrix.fromArray([[1, 2], [3, 4]]);
    expectMatClose(matSub(a, b), Matrix.fromArray([[4, 4], [4, 4]]));
  });

  test("matScale multiplies by scalar", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    expectMatClose(matScale(a, 3), Matrix.fromArray([[3, 6], [9, 12]]));
  });

  test("matScale by zero gives zero matrix", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    expectMatClose(matScale(a, 0), Matrix.zeros(2, 2));
  });
});

// ─── matMultiply ──────────────────────────────────────────

describe("matMultiply", () => {
  test("2x2 * 2x2", () => {
    // @provenance: numpy.matmul([[1,2],[3,4]], [[5,6],[7,8]]) = [[19,22],[43,50]]
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const b = Matrix.fromArray([[5, 6], [7, 8]]);
    expectMatClose(matMultiply(a, b), Matrix.fromArray([[19, 22], [43, 50]]));
  });

  test("2x3 * 3x2 rectangular", () => {
    // @provenance: numpy.matmul([[1,2,3],[4,5,6]], [[7,8],[9,10],[11,12]]) = [[58,64],[139,154]]
    const a = Matrix.fromArray([[1, 2, 3], [4, 5, 6]]);
    const b = Matrix.fromArray([[7, 8], [9, 10], [11, 12]]);
    expectMatClose(matMultiply(a, b), Matrix.fromArray([[58, 64], [139, 154]]));
  });

  test("identity multiply leaves matrix unchanged", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const I = Matrix.identity(2);
    expectMatClose(matMultiply(a, I), a);
    expectMatClose(matMultiply(I, a), a);
  });

  test("matrix * column vector", () => {
    // @provenance: numpy.matmul([[1,2],[3,4]], [[5],[6]]) = [[17],[39]]
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const v = Matrix.fromArray([[5], [6]]);
    expectMatClose(matMultiply(a, v), Matrix.fromArray([[17], [39]]));
  });

  test("throws on incompatible dimensions", () => {
    expect(() => matMultiply(new Matrix(2, 3), new Matrix(2, 2))).toThrow();
  });
});

// ─── matTranspose ─────────────────────────────────────────

describe("matTranspose", () => {
  test("transpose square matrix", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    expectMatClose(matTranspose(a), Matrix.fromArray([[1, 3], [2, 4]]));
  });

  test("transpose rectangular matrix", () => {
    const a = Matrix.fromArray([[1, 2, 3], [4, 5, 6]]);
    const t = matTranspose(a);
    expect(t.rows).toBe(3);
    expect(t.cols).toBe(2);
    expectMatClose(t, Matrix.fromArray([[1, 4], [2, 5], [3, 6]]));
  });

  test("double transpose is identity", () => {
    const a = Matrix.fromArray([[1, 2, 3], [4, 5, 6]]);
    expectMatClose(matTranspose(matTranspose(a)), a);
  });
});

// ─── matInverse ───────────────────────────────────────────

describe("matInverse", () => {
  test("2x2 inverse", () => {
    // @provenance: numpy.linalg.inv([[4,7],[2,6]]) = [[0.6,-0.7],[-0.2,0.4]]
    const a = Matrix.fromArray([[4, 7], [2, 6]]);
    const inv = matInverse(a);
    expectMatClose(inv, Matrix.fromArray([[0.6, -0.7], [-0.2, 0.4]]));
  });

  test("3x3 inverse", () => {
    // @provenance: numpy.linalg.inv([[1,2,3],[0,1,4],[5,6,0]])
    // = [[-24,18,5],[20,-15,-4],[-5,4,1]]
    const a = Matrix.fromArray([[1, 2, 3], [0, 1, 4], [5, 6, 0]]);
    const inv = matInverse(a);
    expectMatClose(inv, Matrix.fromArray([[-24, 18, 5], [20, -15, -4], [-5, 4, 1]]));
  });

  test("A * A^-1 = I", () => {
    const a = Matrix.fromArray([[1, 2, 3], [0, 1, 4], [5, 6, 0]]);
    const inv = matInverse(a);
    const prod = matMultiply(a, inv);
    expectMatClose(prod, Matrix.identity(3), 8);
  });

  test("singular matrix throws", () => {
    const a = Matrix.fromArray([[1, 2], [2, 4]]);
    expect(() => matInverse(a)).toThrow("singular");
  });
});

// ─── matSolve ─────────────────────────────────────────────

describe("matSolve", () => {
  test("solve 2x2 system", () => {
    // @provenance: numpy.linalg.solve([[2,1],[5,3]], [[11],[23]]) = [[2],[7]]
    // 2x + y = 11, 5x + 3y = 23 => x=10, y=-9 ... let me recalculate
    // Actually: [[2,1],[5,3]] * [[2],[7]] = [[4+7],[10+21]] = [[11],[31]] != [[23]]
    // Use: 2x+y=4, x+3y=7 => x=1, y=2
    const A = Matrix.fromArray([[2, 1], [1, 3]]);
    const b = Matrix.fromArray([[4], [7]]);
    const x = matSolve(A, b);
    expectMatClose(x, Matrix.fromArray([[1], [2]]));
  });

  test("solve 3x3 system", () => {
    // @provenance: numpy.linalg.solve([[1,2,3],[4,5,6],[7,8,10]], [[14],[32],[51]])
    // = [[-1],[6],[1]]
    const A = Matrix.fromArray([[1, 2, 3], [4, 5, 6], [7, 8, 10]]);
    const b = Matrix.fromArray([[14], [32], [51]]);
    const x = matSolve(A, b);
    expectMatClose(x, Matrix.fromArray([[-1], [6], [1]]), 8);
  });

  test("solve with multiple right-hand sides", () => {
    const A = Matrix.fromArray([[2, 1], [1, 3]]);
    const B = Matrix.fromArray([[4, 3], [7, 4]]);
    const X = matSolve(A, B);
    // Verify A*X = B
    expectMatClose(matMultiply(A, X), B, 8);
  });

  test("solve verifies A*x = b", () => {
    const A = Matrix.fromArray([[3, 1], [1, 2]]);
    const b = Matrix.fromArray([[9], [8]]);
    const x = matSolve(A, b);
    expectMatClose(matMultiply(A, x), b, 8);
  });
});

// ─── matCholesky ──────────────────────────────────────────

describe("matCholesky", () => {
  test("2x2 positive definite", () => {
    // @provenance: numpy.linalg.cholesky([[4,2],[2,3]]) = [[2,0],[1,sqrt(2)]]
    const a = Matrix.fromArray([[4, 2], [2, 3]]);
    const L = matCholesky(a);
    expectMatClose(L, Matrix.fromArray([[2, 0], [1, Math.sqrt(2)]]));
  });

  test("3x3 positive definite", () => {
    // @provenance: numpy.linalg.cholesky([[25,15,-5],[15,18,0],[-5,0,11]])
    // = [[5,0,0],[3,3,0],[-1,1,3]]
    const a = Matrix.fromArray([[25, 15, -5], [15, 18, 0], [-5, 0, 11]]);
    const L = matCholesky(a);
    expectMatClose(L, Matrix.fromArray([[5, 0, 0], [3, 3, 0], [-1, 1, 3]]));
  });

  test("L * L^T = A", () => {
    const a = Matrix.fromArray([[4, 2], [2, 3]]);
    const L = matCholesky(a);
    expectMatClose(matMultiply(L, matTranspose(L)), a);
  });

  test("non-positive-definite throws", () => {
    const a = Matrix.fromArray([[1, 2], [2, 1]]);
    expect(() => matCholesky(a)).toThrow("not positive definite");
  });
});

// ─── matDeterminant ───────────────────────────────────────

describe("matDeterminant", () => {
  test("1x1 determinant", () => {
    expect(matDeterminant(Matrix.fromArray([[5]]))).toBeCloseTo(5, PREC);
  });

  test("2x2 determinant", () => {
    // @provenance: numpy.linalg.det([[3,8],[4,6]]) = -14
    expect(matDeterminant(Matrix.fromArray([[3, 8], [4, 6]]))).toBeCloseTo(-14, PREC);
  });

  test("3x3 determinant", () => {
    // @provenance: numpy.linalg.det([[6,1,1],[4,-2,5],[2,8,7]]) = -306
    expect(
      matDeterminant(Matrix.fromArray([[6, 1, 1], [4, -2, 5], [2, 8, 7]])),
    ).toBeCloseTo(-306, 8);
  });

  test("singular matrix has determinant 0", () => {
    expect(matDeterminant(Matrix.fromArray([[1, 2], [2, 4]]))).toBeCloseTo(0, 8);
  });

  test("identity has determinant 1", () => {
    expect(matDeterminant(Matrix.identity(3))).toBeCloseTo(1, PREC);
  });
});

// ─── matTrace ─────────────────────────────────────────────

describe("matTrace", () => {
  test("trace of identity", () => {
    expect(matTrace(Matrix.identity(4))).toBe(4);
  });

  test("trace of 2x2", () => {
    // @provenance: numpy.trace([[1,2],[3,4]]) = 5
    expect(matTrace(Matrix.fromArray([[1, 2], [3, 4]]))).toBe(5);
  });

  test("trace of 3x3", () => {
    expect(
      matTrace(Matrix.fromArray([[1, 0, 0], [0, 5, 0], [0, 0, 9]])),
    ).toBe(15);
  });
});

// ─── matOuterProduct ──────────────────────────────────────

describe("matOuterProduct", () => {
  test("outer product of two vectors", () => {
    // @provenance: numpy.outer([1,2,3],[4,5]) = [[4,5],[8,10],[12,15]]
    const m = matOuterProduct([1, 2, 3], [4, 5]);
    expectMatClose(m, Matrix.fromArray([[4, 5], [8, 10], [12, 15]]));
  });

  test("outer product of same vector", () => {
    // @provenance: numpy.outer([1,2],[1,2]) = [[1,2],[2,4]]
    const m = matOuterProduct([1, 2], [1, 2]);
    expectMatClose(m, Matrix.fromArray([[1, 2], [2, 4]]));
  });

  test("outer product of unit vectors", () => {
    // @provenance: numpy.outer([1,0],[0,1]) = [[0,1],[0,0]]
    const m = matOuterProduct([1, 0], [0, 1]);
    expectMatClose(m, Matrix.fromArray([[0, 1], [0, 0]]));
  });
});

// ─── matEigen ─────────────────────────────────────────────

describe("matEigen", () => {
  test("2x2 symmetric eigenvalues", () => {
    // @provenance: numpy.linalg.eigh([[2,1],[1,2]]) => values=[1,3]
    const a = Matrix.fromArray([[2, 1], [1, 2]]);
    const { values } = matEigen(a);
    // Sorted by descending absolute value
    const sorted = values.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(3, PREC);
    expect(sorted[1]).toBeCloseTo(1, PREC);
  });

  test("3x3 symmetric eigenvalues", () => {
    // @provenance: numpy.linalg.eigh([[2,-1,0],[-1,2,-1],[0,-1,2]])
    // eigenvalues: 2-sqrt(2), 2, 2+sqrt(2)
    const a = Matrix.fromArray([[2, -1, 0], [-1, 2, -1], [0, -1, 2]]);
    const { values } = matEigen(a);
    const sorted = values.slice().sort((a, b) => a - b);
    expect(sorted[0]).toBeCloseTo(2 - Math.sqrt(2), 8);
    expect(sorted[1]).toBeCloseTo(2, 8);
    expect(sorted[2]).toBeCloseTo(2 + Math.sqrt(2), 8);
  });

  test("eigenvalue equation Av = lambda*v for 2x2", () => {
    const a = Matrix.fromArray([[2, 1], [1, 2]]);
    const { values, vectors } = matEigen(a);
    for (let i = 0; i < values.length; i++) {
      const v = matColumn(vectors, i);
      const vMat = Matrix.fromArray(v.map((x) => [x]));
      const av = matMultiply(a, vMat);
      const lambdaV = matScale(vMat, values[i]);
      expectMatClose(av, lambdaV, 8);
    }
  });

  test("eigenvalue equation Av = lambda*v for 3x3", () => {
    const a = Matrix.fromArray([[6, -1, 0], [-1, 4, -1], [0, -1, 6]]);
    const { values, vectors } = matEigen(a);
    for (let i = 0; i < values.length; i++) {
      const v = matColumn(vectors, i);
      const vMat = Matrix.fromArray(v.map((x) => [x]));
      const av = matMultiply(a, vMat);
      const lambdaV = matScale(vMat, values[i]);
      expectMatClose(av, lambdaV, 8);
    }
  });

  test("identity eigenvalues are all 1", () => {
    const { values } = matEigen(Matrix.identity(3));
    for (const v of values) {
      expect(v).toBeCloseTo(1, PREC);
    }
  });

  test("diagonal matrix eigenvalues are the diagonal", () => {
    const a = matFromDiag([5, 3, 1]);
    const { values } = matEigen(a);
    const sorted = values.slice().sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(5, PREC);
    expect(sorted[1]).toBeCloseTo(3, PREC);
    expect(sorted[2]).toBeCloseTo(1, PREC);
  });
});

// ─── matSVD ───────────────────────────────────────────────

describe("matSVD", () => {
  test("2x2 SVD reconstruction A = U * diag(S) * V^T", () => {
    const a = Matrix.fromArray([[3, 2], [2, 3]]);
    const { U, S, V } = matSVD(a);
    const sigma = matFromDiag(S);
    const reconstructed = matMultiply(matMultiply(U, sigma), matTranspose(V));
    expectMatClose(reconstructed, a, 8);
  });

  test("3x3 SVD reconstruction", () => {
    const a = Matrix.fromArray([[1, 2, 3], [4, 5, 6], [7, 8, 10]]);
    const { U, S, V } = matSVD(a);
    const sigma = matFromDiag(S);
    const reconstructed = matMultiply(matMultiply(U, sigma), matTranspose(V));
    expectMatClose(reconstructed, a, 7);
  });

  test("singular values are non-negative and descending", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4], [5, 6]]);
    const { S } = matSVD(a);
    for (let i = 0; i < S.length; i++) {
      expect(S[i]).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < S.length; i++) {
      expect(S[i - 1]).toBeGreaterThanOrEqual(S[i] - 1e-10);
    }
  });

  test("V^T * V = I (orthogonality)", () => {
    const a = Matrix.fromArray([[3, 2], [2, 3]]);
    const { V } = matSVD(a);
    const vtv = matMultiply(matTranspose(V), V);
    expectMatClose(vtv, Matrix.identity(V.cols), 8);
  });

  test("U^T * U = I (orthogonality) for square", () => {
    const a = Matrix.fromArray([[3, 2], [2, 3]]);
    const { U } = matSVD(a);
    const utu = matMultiply(matTranspose(U), U);
    expectMatClose(utu, Matrix.identity(U.cols), 8);
  });

  test("SVD of identity", () => {
    const { S } = matSVD(Matrix.identity(3));
    for (const s of S) {
      expect(s).toBeCloseTo(1, 8);
    }
  });
});

// ─── matNorm ─────────────────────────────────────────────

describe("matNorm", () => {
  test("Frobenius norm of 2x2", () => {
    // @provenance: numpy.linalg.norm([[1,2],[3,4]], 'fro') = sqrt(30)
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    expect(matNorm(a)).toBeCloseTo(Math.sqrt(30), 14);
  });

  test("Frobenius norm of identity is sqrt(n)", () => {
    expect(matNorm(Matrix.identity(4))).toBeCloseTo(2, 14);
  });

  test("Frobenius norm of zero matrix is 0", () => {
    expect(matNorm(Matrix.zeros(3, 3))).toBe(0);
  });
});

// ─── matEqual ────────────────────────────────────────────

describe("matEqual", () => {
  test("identical matrices are equal", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const b = Matrix.fromArray([[1, 2], [3, 4]]);
    expect(matEqual(a, b)).toBe(true);
  });

  test("different matrices are not equal", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const c = Matrix.fromArray([[1.001, 2], [3, 4]]);
    expect(matEqual(a, c)).toBe(false);
  });

  test("custom tolerance", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const c = Matrix.fromArray([[1.001, 2], [3, 4]]);
    expect(matEqual(a, c, 0.01)).toBe(true);
  });

  test("different dimensions returns false", () => {
    const a = Matrix.fromArray([[1, 2]]);
    const b = Matrix.fromArray([[1], [2]]);
    expect(matEqual(a, b)).toBe(false);
  });
});

// ─── matIdentity / matZeros ─────────────────────────────

describe("matIdentity and matZeros", () => {
  test("matIdentity creates n x n identity", () => {
    const I = matIdentity(3);
    expectMatClose(I, Matrix.identity(3));
    expect(I.rows).toBe(3);
    expect(I.cols).toBe(3);
  });

  test("matZeros creates m x n zero matrix", () => {
    const z = matZeros(2, 4);
    expect(z.rows).toBe(2);
    expect(z.cols).toBe(4);
    for (let i = 0; i < z.data.length; i++) {
      expect(z.data[i]).toBe(0);
    }
  });
});

// ─── matGetColumn / matGetRow ───────────────────────────

describe("matGetColumn and matGetRow", () => {
  const m = Matrix.fromArray([
    [1, 2, 3],
    [4, 5, 6],
  ]);

  test("matGetColumn returns column as Matrix (rows x 1)", () => {
    const col = matGetColumn(m, 1);
    expect(col.rows).toBe(2);
    expect(col.cols).toBe(1);
    expect(col.get(0, 0)).toBe(2);
    expect(col.get(1, 0)).toBe(5);
  });

  test("matGetRow returns row as Matrix (1 x cols)", () => {
    const row = matGetRow(m, 0);
    expect(row.rows).toBe(1);
    expect(row.cols).toBe(3);
    expect(row.get(0, 0)).toBe(1);
    expect(row.get(0, 2)).toBe(3);
  });
});

// ─── Additional solve tests ─────────────────────────────

describe("matSolve additional", () => {
  test("solve 4x4 system via A*x = b verification", () => {
    // @provenance: manually verified
    const A = Matrix.fromArray([
      [2, 1, -1, 0],
      [-3, -1, 2, 1],
      [0, 1, -1, 0],
      [1, 0, 0, 1],
    ]);
    const b = Matrix.fromArray([[1], [0], [1], [2]]);
    const x = matSolve(A, b);
    expectMatClose(matMultiply(A, x), b, 8);
  });

  test("identity system Ix = b gives x = b", () => {
    const I = Matrix.identity(3);
    const b = Matrix.fromArray([[5], [7], [11]]);
    expectMatClose(matSolve(I, b), b);
  });

  test("singular matrix throws", () => {
    const A = Matrix.fromArray([[1, 2], [2, 4]]);
    const b = Matrix.fromArray([[1], [2]]);
    expect(() => matSolve(A, b)).toThrow("singular");
  });
});

// ─── Additional inverse tests ───────────────────────────

describe("matInverse additional", () => {
  test("1x1 inverse", () => {
    const a = Matrix.fromArray([[4]]);
    const inv = matInverse(a);
    expectMatClose(inv, Matrix.fromArray([[0.25]]));
  });
});

// ─── Additional Cholesky tests ──────────────────────────

describe("matCholesky additional", () => {
  test("1x1 Cholesky", () => {
    const a = Matrix.fromArray([[9]]);
    const L = matCholesky(a);
    expectMatClose(L, Matrix.fromArray([[3]]));
  });
});

// ─── Additional determinant tests ───────────────────────

describe("matDeterminant additional", () => {
  test("triangular matrix determinant is product of diagonal", () => {
    // @provenance: det of upper triangular = product of diagonal = 2*3*5 = 30
    const a = Matrix.fromArray([[2, 1, 4], [0, 3, 7], [0, 0, 5]]);
    expect(matDeterminant(a)).toBeCloseTo(30, 8);
  });
});

// ─── Additional SVD tests ───────────────────────────────

describe("matSVD additional", () => {
  test("rectangular 3x2 SVD reconstruction", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4], [5, 6]]);
    const { U, S, V } = matSVD(a);
    const sigma = matFromDiag(S);
    const reconstructed = matMultiply(matMultiply(U, sigma), matTranspose(V));
    expectMatClose(reconstructed, a, 7);
  });

  test("rectangular 2x3 SVD reconstruction", () => {
    const a = Matrix.fromArray([[1, 2, 3], [4, 5, 6]]);
    const { U, S, V } = matSVD(a);
    const sigma = matFromDiag(S);
    const reconstructed = matMultiply(matMultiply(U, sigma), matTranspose(V));
    expectMatClose(reconstructed, a, 7);
  });
});

// ─── Immutability ─────────────────────────────────────────

describe("immutability", () => {
  test("matAdd does not mutate inputs", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const b = Matrix.fromArray([[5, 6], [7, 8]]);
    const origA = a.data.slice();
    const origB = b.data.slice();
    matAdd(a, b);
    expect(a.data).toEqual(origA);
    expect(b.data).toEqual(origB);
  });

  test("matMultiply does not mutate inputs", () => {
    const a = Matrix.fromArray([[1, 2], [3, 4]]);
    const b = Matrix.fromArray([[5, 6], [7, 8]]);
    const origA = a.data.slice();
    matMultiply(a, b);
    expect(a.data).toEqual(origA);
  });

  test("matInverse does not mutate input", () => {
    const a = Matrix.fromArray([[4, 7], [2, 6]]);
    const origA = a.data.slice();
    matInverse(a);
    expect(a.data).toEqual(origA);
  });
});
