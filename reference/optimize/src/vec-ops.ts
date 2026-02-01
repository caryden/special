/**
 * Vector arithmetic for n-dimensional optimization.
 *
 * All operations are pure — they return new arrays and never mutate inputs.
 * These are the building blocks used by every algorithm node.
 *
 * @node vec-ops
 * @contract vec-ops.test.ts
 * @hint types: All vectors are number[]. No generics, no custom Vector class.
 * @hint purity: Every function returns a new array. Never mutate inputs.
 */

/** Dot product of two vectors. Vectors must have equal length. */
export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** Euclidean (L2) norm of a vector. */
export function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

/** Infinity norm (max absolute value) of a vector. */
export function normInf(v: number[]): number {
  let max = 0;
  for (let i = 0; i < v.length; i++) {
    const abs = Math.abs(v[i]);
    if (abs > max) max = abs;
  }
  return max;
}

/** Multiply each element by a scalar. */
export function scale(v: number[], s: number): number[] {
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] * s;
  }
  return result;
}

/** Element-wise addition: a + b. */
export function add(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }
  return result;
}

/** Element-wise subtraction: a - b. */
export function sub(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] - b[i];
  }
  return result;
}

/** Element-wise negation: -v. */
export function negate(v: number[]): number[] {
  return scale(v, -1);
}

/** Create a deep copy of a vector. */
export function clone(v: number[]): number[] {
  return v.slice();
}

/** Create a vector of n zeros. */
export function zeros(n: number): number[] {
  return new Array(n).fill(0);
}

/**
 * a + s * b (fused scale-and-add, common in optimization).
 * Equivalent to add(a, scale(b, s)) but avoids an intermediate allocation.
 */
export function addScaled(a: number[], b: number[], s: number): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + s * b[i];
  }
  return result;
}
