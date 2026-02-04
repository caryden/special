# mat-ops — Spec

Depends on: _(none — leaf node)_

## Purpose

Pure matrix arithmetic for robotics algorithms. All operations return new Matrix
instances and never mutate inputs. The Matrix class uses row-major flat storage
for efficient translation to numpy (row-major), Eigen (column-major — transpose
on storage), and other backends.

## Types

### Matrix

| Field | Type | Description |
|-------|------|-------------|
| `rows` | number | Number of rows |
| `cols` | number | Number of columns |
| `data` | number[] | Row-major flat array of length rows*cols |

Immutable: `get(row, col)` reads, `set(row, col, value)` returns a new Matrix.

Constructors:
- `Matrix(rows, cols, data?)` — zero-filled if data omitted; defensive copy of data
- `Matrix.fromArray(arr: number[][])` — from 2D array
- `Matrix.identity(n)` — n×n identity
- `Matrix.zeros(rows, cols)` — zero matrix

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `matMultiply` | `(A, B) → Matrix` | Matrix product A*B |
| `matTranspose` | `(A) → Matrix` | Transpose |
| `matAdd` | `(A, B) → Matrix` | Element-wise addition |
| `matSub` | `(A, B) → Matrix` | Element-wise subtraction |
| `matScale` | `(A, s) → Matrix` | Scalar multiplication |
| `matTrace` | `(A) → number` | Sum of diagonal elements |
| `matOuterProduct` | `(a[], b[]) → Matrix` | Outer product a*b^T |
| `matFromDiag` | `(d[]) → Matrix` | Diagonal matrix from vector |
| `matColumn` | `(A, col) → number[]` | Extract column as array |
| `matRow` | `(A, row) → number[]` | Extract row as array |
| `matGetColumn` | `(A, col) → Matrix` | Extract column as (rows×1) Matrix |
| `matGetRow` | `(A, row) → Matrix` | Extract row as (1×cols) Matrix |
| `matNorm` | `(A) → number` | Frobenius norm |
| `matEqual` | `(A, B, tol?) → boolean` | Element-wise approximate equality (default tol=1e-14) |
| `matIdentity` | `(n) → Matrix` | n×n identity (convenience wrapper) |
| `matZeros` | `(m, n) → Matrix` | m×n zeros (convenience wrapper) |
| `matInverse` | `(A) → Matrix` | Gauss-Jordan inverse with partial pivoting |
| `matSolve` | `(A, b) → Matrix` | LU solve Ax=b with partial pivoting |
| `matDeterminant` | `(A) → number` | Determinant via LU decomposition |
| `matCholesky` | `(A) → Matrix` | Cholesky decomposition A=LL^T, returns L |
| `matEigen` | `(A) → {values, vectors}` | Symmetric eigendecomposition via Jacobi |
| `matSVD` | `(A) → {U, S, V}` | SVD via one-sided Jacobi (A = U*diag(S)*V^T) |

## Test Vectors

### Multiply

@provenance numpy.matmul, verified manually

| Input | Expected |
|-------|----------|
| `[[1,2],[3,4]] * [[5,6],[7,8]]` | `[[19,22],[43,50]]` |
| `[[1,2,3],[4,5,6]] * [[7,8],[9,10],[11,12]]` | `[[58,64],[139,154]]` |
| `A * I = A` | identity property |
| `[[1,2],[3,4]] * [[5],[6]]` | `[[17],[39]]` |

### Inverse

@provenance numpy.linalg.inv, verified manually

| Input | Expected |
|-------|----------|
| `inv([[4,7],[2,6]])` | `[[0.6,-0.7],[-0.2,0.4]]` |
| `inv([[1,2,3],[0,1,4],[5,6,0]])` | `[[-24,18,5],[20,-15,-4],[-5,4,1]]` |
| `A * inv(A) ≈ I` | reconstruction test |
| `inv([[1,2],[2,4]])` | throws "singular" |

### Solve (LU)

@provenance numpy.linalg.solve, verified manually

| Input | Expected |
|-------|----------|
| `solve([[2,1],[1,3]], [[4],[7]])` | `[[1],[2]]` |
| `solve([[1,2,3],[4,5,6],[7,8,10]], [[14],[32],[51]])` | `[[-1],[6],[1]]` (tol 1e-8) |
| `A*solve(A,b) ≈ b` | reconstruction test |
| Singular matrix | throws "singular" |

### Cholesky

@provenance numpy.linalg.cholesky, verified manually

| Input | Expected |
|-------|----------|
| `chol([[4,2],[2,3]])` | `[[2,0],[1,sqrt(2)]]` |
| `chol([[25,15,-5],[15,18,0],[-5,0,11]])` | `[[5,0,0],[3,3,0],[-1,1,3]]` |
| `L*L^T ≈ A` | reconstruction test |
| Not positive definite | throws "not positive definite" |

### Determinant

@provenance numpy.linalg.det, verified manually

| Input | Expected |
|-------|----------|
| `det([[5]])` | `5` |
| `det([[3,8],[4,6]])` | `-14` |
| `det([[6,1,1],[4,-2,5],[2,8,7]])` | `-306` |
| `det([[1,2],[2,4]])` | `0` |
| `det(I_3)` | `1` |

### Eigendecomposition

@provenance numpy.linalg.eigh, verified manually

| Input | Expected eigenvalues |
|-------|---------------------|
| `[[2,1],[1,2]]` | `{1, 3}` |
| `[[2,-1,0],[-1,2,-1],[0,-1,2]]` | `{2-sqrt(2), 2, 2+sqrt(2)}` |
| `I_3` | `{1, 1, 1}` |
| `diag([5,3,1])` | `{5, 3, 1}` |
| `Av = λv` | eigenvalue equation holds for all pairs |

### SVD

@provenance numpy.linalg.svd, verified via reconstruction

| Test | Expected |
|------|----------|
| `svd([[3,2],[2,3]])` → reconstruct `U*diag(S)*V^T ≈ A` | tol 1e-8 |
| `svd([[1,2,3],[4,5,6],[7,8,10]])` → reconstruct | tol 1e-7 |
| Singular values non-negative and descending | property test |
| `V^T*V ≈ I` | orthogonality |
| `U^T*U ≈ I` (square) | orthogonality |
| `svd(I_3)` → all singular values ≈ 1 | identity test |

### Other operations

@provenance numpy, verified manually

| Operation | Input | Expected |
|-----------|-------|----------|
| `trace([[1,2],[3,4]])` | — | `5` |
| `trace(I_4)` | — | `4` |
| `outerProduct([1,2,3],[4,5])` | — | `[[4,5],[8,10],[12,15]]` |
| `norm([[1,2],[3,4]])` | — | `sqrt(30)` |
| `fromDiag([2,3,5])` | — | `diag(2,3,5)` |

### Purity checks

- `matAdd(a, b)` must not modify `a` or `b`
- `matMultiply(a, b)` must not modify `a`
- `matInverse(a)` must not modify `a`
- `Matrix.set()` returns a new Matrix, original unchanged
- Constructor makes defensive copy of data array

### Error conditions

- `matMultiply` with incompatible dimensions: throws
- `matAdd`/`matSub` with dimension mismatch: throws
- `matInverse` on non-square: throws
- `matSolve` on non-square A or dimension mismatch: throws
- Constructor with wrong data length: throws
