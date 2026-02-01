/**
 * Standard optimization test functions with known optima.
 *
 * Each function includes: the objective, its analytic gradient, the known
 * global minimum location and value, and a recommended starting point.
 *
 * These are NOT part of the optimization library itself — they exist for
 * validation and benchmarking of the algorithms.
 *
 * @node test-functions
 * @contract test-functions.test.ts
 * @hint provenance: Every test vector records its source library/version.
 * @hint validation-only: These functions are for testing, not for translation
 *       into the target library. Translate them separately if needed for benchmarks.
 */

export interface TestFunction {
  /** Human-readable name. */
  name: string;
  /** Number of dimensions. */
  dimensions: number;
  /** Objective function. */
  f: (x: number[]) => number;
  /** Analytic gradient. */
  gradient: (x: number[]) => number[];
  /** Known global minimum location. */
  minimumAt: number[];
  /** Known global minimum value. */
  minimumValue: number;
  /** Recommended starting point for optimization. */
  startingPoint: number[];
}

/**
 * Sphere function: f(x) = sum(x_i^2)
 *
 * The simplest test function. Convex, separable, unimodal.
 * Minimum at origin with value 0.
 *
 * @provenance mathematical-definition (trivially derived)
 */
export const sphere: TestFunction = {
  name: "Sphere",
  dimensions: 2,
  f: (x) => x.reduce((sum, xi) => sum + xi * xi, 0),
  gradient: (x) => x.map((xi) => 2 * xi),
  minimumAt: [0, 0],
  minimumValue: 0,
  startingPoint: [5, 5],
};

/**
 * Booth function: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2
 *
 * Simple convex quadratic. Good sanity check.
 * Minimum at (1, 3) with value 0.
 *
 * @provenance mathematical-definition
 * @provenance scipy.optimize test suite (starting point convention)
 */
export const booth: TestFunction = {
  name: "Booth",
  dimensions: 2,
  f: (x) => {
    const [x1, x2] = x;
    return (x1 + 2 * x2 - 7) ** 2 + (2 * x1 + x2 - 5) ** 2;
  },
  gradient: (x) => {
    const [x1, x2] = x;
    return [
      2 * (x1 + 2 * x2 - 7) + 4 * (2 * x1 + x2 - 5),
      4 * (x1 + 2 * x2 - 7) + 2 * (2 * x1 + x2 - 5),
    ];
  },
  minimumAt: [1, 3],
  minimumValue: 0,
  startingPoint: [0, 0],
};

/**
 * Rosenbrock function: f(x,y) = (1 - x)^2 + 100*(y - x^2)^2
 *
 * The canonical optimization test function. Narrow curved valley makes it
 * challenging for gradient methods. Unimodal but poorly conditioned.
 * Minimum at (1, 1) with value 0.
 *
 * @provenance mathematical-definition (Rosenbrock 1960)
 * @provenance scipy.optimize.rosen v1.17.0 (same formula)
 * @provenance optim.jl OptimTestProblems v2.0.0 (starting point [-1.2, 1.0])
 */
export const rosenbrock: TestFunction = {
  name: "Rosenbrock",
  dimensions: 2,
  f: (x) => {
    const [x1, x2] = x;
    return (1 - x1) ** 2 + 100 * (x2 - x1 * x1) ** 2;
  },
  gradient: (x) => {
    const [x1, x2] = x;
    return [
      -2 * (1 - x1) + 200 * (x2 - x1 * x1) * (-2 * x1),
      200 * (x2 - x1 * x1),
    ];
  },
  minimumAt: [1, 1],
  minimumValue: 0,
  startingPoint: [-1.2, 1.0],
};

/**
 * Beale function: f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
 *
 * Multimodal with sharp ridges. Tests robustness.
 * Minimum at (3, 0.5) with value 0.
 *
 * @provenance mathematical-definition (Beale 1958)
 * @provenance optim.jl OptimTestProblems v2.0.0
 */
export const beale: TestFunction = {
  name: "Beale",
  dimensions: 2,
  f: (x) => {
    const [x1, x2] = x;
    return (
      (1.5 - x1 + x1 * x2) ** 2 +
      (2.25 - x1 + x1 * x2 * x2) ** 2 +
      (2.625 - x1 + x1 * x2 * x2 * x2) ** 2
    );
  },
  gradient: (x) => {
    const [x1, x2] = x;
    const t1 = 1.5 - x1 + x1 * x2;
    const t2 = 2.25 - x1 + x1 * x2 * x2;
    const t3 = 2.625 - x1 + x1 * x2 * x2 * x2;
    return [
      2 * t1 * (-1 + x2) + 2 * t2 * (-1 + x2 * x2) + 2 * t3 * (-1 + x2 * x2 * x2),
      2 * t1 * x1 + 2 * t2 * (2 * x1 * x2) + 2 * t3 * (3 * x1 * x2 * x2),
    ];
  },
  minimumAt: [3, 0.5],
  minimumValue: 0,
  startingPoint: [0, 0],
};

/**
 * Himmelblau function: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
 *
 * Four identical local minima, all with value 0. Tests whether the optimizer
 * finds any one of them (not a specific one — the starting point determines which).
 *
 * Minima at: (3, 2), (-2.805118, 3.131312), (-3.779310, -3.283186), (3.584428, -1.848126)
 *
 * @provenance mathematical-definition (Himmelblau 1972)
 * @provenance optim.jl OptimTestProblems v2.0.0
 */
export const himmelblau: TestFunction = {
  name: "Himmelblau",
  dimensions: 2,
  f: (x) => {
    const [x1, x2] = x;
    return (x1 * x1 + x2 - 11) ** 2 + (x1 + x2 * x2 - 7) ** 2;
  },
  gradient: (x) => {
    const [x1, x2] = x;
    return [
      4 * x1 * (x1 * x1 + x2 - 11) + 2 * (x1 + x2 * x2 - 7),
      2 * (x1 * x1 + x2 - 11) + 4 * x2 * (x1 + x2 * x2 - 7),
    ];
  },
  minimumAt: [3, 2],
  minimumValue: 0,
  startingPoint: [0, 0],
};

/** All four Himmelblau minima, for cross-validation. */
export const himmelblauMinima: number[][] = [
  [3.0, 2.0],
  [-2.805118, 3.131312],
  [-3.779310, -3.283186],
  [3.584428, -1.848126],
];

/**
 * Goldstein-Price function.
 *
 * Product of two terms. Minimum value is 3 (not 0).
 * Minimum at (0, -1) with value 3.
 *
 * @provenance mathematical-definition (Goldstein & Price 1971)
 * @provenance scipy documentation (domain and minimum)
 */
export const goldsteinPrice: TestFunction = {
  name: "Goldstein-Price",
  dimensions: 2,
  f: (x) => {
    const [x1, x2] = x;
    const a =
      1 +
      (x1 + x2 + 1) ** 2 *
        (19 - 14 * x1 + 3 * x1 * x1 - 14 * x2 + 6 * x1 * x2 + 3 * x2 * x2);
    const b =
      30 +
      (2 * x1 - 3 * x2) ** 2 *
        (18 - 32 * x1 + 12 * x1 * x1 + 48 * x2 - 36 * x1 * x2 + 27 * x2 * x2);
    return a * b;
  },
  gradient: (x) => {
    const [x1, x2] = x;
    // Compute both terms and their derivatives
    const s = x1 + x2 + 1;
    const q1 = 19 - 14 * x1 + 3 * x1 * x1 - 14 * x2 + 6 * x1 * x2 + 3 * x2 * x2;
    const a = 1 + s * s * q1;

    const t = 2 * x1 - 3 * x2;
    const q2 = 18 - 32 * x1 + 12 * x1 * x1 + 48 * x2 - 36 * x1 * x2 + 27 * x2 * x2;
    const b = 30 + t * t * q2;

    // da/dx1 = 2*s*q1 + s^2 * dq1/dx1
    const dq1_dx1 = -14 + 6 * x1 + 6 * x2;
    const da_dx1 = 2 * s * q1 + s * s * dq1_dx1;

    // da/dx2 = 2*s*q1 + s^2 * dq1/dx2
    const dq1_dx2 = -14 + 6 * x1 + 6 * x2;
    const da_dx2 = 2 * s * q1 + s * s * dq1_dx2;

    // db/dx1 = 2*t*2*q2 + t^2 * dq2/dx1
    const dq2_dx1 = -32 + 24 * x1 - 36 * x2;
    const db_dx1 = 4 * t * q2 + t * t * dq2_dx1;

    // db/dx2 = 2*t*(-3)*q2 + t^2 * dq2/dx2
    const dq2_dx2 = 48 - 36 * x1 + 54 * x2;
    const db_dx2 = -6 * t * q2 + t * t * dq2_dx2;

    return [da_dx1 * b + a * db_dx1, da_dx2 * b + a * db_dx2];
  },
  minimumAt: [0, -1],
  minimumValue: 3,
  startingPoint: [0, -0.5],
};

/** All test functions for iteration. */
export const allTestFunctions: TestFunction[] = [
  sphere,
  booth,
  rosenbrock,
  beale,
  himmelblau,
  goldsteinPrice,
];
