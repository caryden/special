/**
 * Pure vector arithmetic for n-dimensional optimization.
 * All operations return new arrays and never mutate inputs.
 */

/**
 * Dot product of two vectors
 */
export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Euclidean (L2) norm
 */
export function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

/**
 * Infinity norm (max absolute value)
 */
export function normInf(v: number[]): number {
  let max = 0;
  for (let i = 0; i < v.length; i++) {
    const abs = Math.abs(v[i]);
    if (abs > max) {
      max = abs;
    }
  }
  return max;
}

/**
 * Scalar multiplication
 */
export function scale(v: number[], s: number): number[] {
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] * s;
  }
  return result;
}

/**
 * Element-wise addition
 */
export function add(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }
  return result;
}

/**
 * Element-wise subtraction
 */
export function sub(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] - b[i];
  }
  return result;
}

/**
 * Element-wise negation (scale(v, -1))
 */
export function negate(v: number[]): number[] {
  return scale(v, -1);
}

/**
 * Deep copy of a vector
 */
export function clone(v: number[]): number[] {
  return [...v];
}

/**
 * Create a vector of n zeros
 */
export function zeros(n: number): number[] {
  return new Array(n).fill(0);
}

/**
 * Fused operation: a + s*b (avoids intermediate allocation)
 */
export function addScaled(a: number[], b: number[], s: number): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + s * b[i];
  }
  return result;
}
