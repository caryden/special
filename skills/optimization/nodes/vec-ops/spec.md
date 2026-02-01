# vec-ops — Spec

Depends on: _(none — leaf node)_

## Purpose

Pure vector arithmetic for n-dimensional optimization. All operations return new
arrays and never mutate inputs.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `dot` | `(a, b) → number` | Dot product |
| `norm` | `(v) → number` | Euclidean (L2) norm |
| `normInf` | `(v) → number` | Infinity norm (max absolute value) |
| `scale` | `(v, s) → vector` | Scalar multiplication |
| `add` | `(a, b) → vector` | Element-wise addition |
| `sub` | `(a, b) → vector` | Element-wise subtraction |
| `negate` | `(v) → vector` | Element-wise negation (`scale(v, -1)`) |
| `clone` | `(v) → vector` | Deep copy |
| `zeros` | `(n) → vector` | Vector of n zeros |
| `addScaled` | `(a, b, s) → vector` | `a + s*b` (fused, avoids intermediate allocation) |

## Test Vectors

| Operation | Input | Expected |
|-----------|-------|----------|
| `dot([1,2,3], [4,5,6])` | — | `32` |
| `dot([0,0], [1,1])` | — | `0` |
| `norm([3,4])` | — | `5` |
| `norm([0,0,0])` | — | `0` |
| `normInf([1,-3,2])` | — | `3` |
| `normInf([0,0])` | — | `0` |
| `scale([1,2], 3)` | — | `[3,6]` |
| `scale([1,2], 0)` | — | `[0,0]` |
| `add([1,2], [3,4])` | — | `[4,6]` |
| `sub([3,4], [1,2])` | — | `[2,2]` |
| `negate([1,-2])` | — | `[-1,2]` |
| `clone([1,2])` | — | `[1,2]` (new array) |
| `zeros(3)` | — | `[0,0,0]` |
| `addScaled([1,2], [3,4], 2)` | — | `[7,10]` |

### Purity checks

- `add(a, b)` must not modify `a` or `b`
- `scale(v, s)` must not modify `v`
- `clone(v)` result must be a distinct array (modifying clone doesn't affect original)
