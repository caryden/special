/**
 * Brent's method for 1D minimization.
 *
 * Combines golden section search with parabolic interpolation for
 * superlinear convergence. The standard univariate minimization algorithm,
 * available in scipy (brent), Optim.jl (Brent()), and MATLAB (fminbnd).
 *
 * @node brent-1d
 * @contract brent-1d.test.ts
 * @provenance Brent, "Algorithms for Minimization without Derivatives", 1973, Ch. 5
 * @provenance scipy.optimize.brent (golden + parabolic interpolation)
 * @provenance Optim.jl Brent() — same algorithm, tol=√ε default
 */

/** Options for Brent 1D minimization. */
export interface Brent1dOptions {
  /** Convergence tolerance. Default: √(machine epsilon) ≈ 1.49e-8 */
  tol?: number;
  /** Maximum iterations. Default: 500 */
  maxIter?: number;
}

/** Result of Brent 1D minimization. */
export interface Brent1dResult {
  /** Location of the minimum */
  x: number;
  /** Function value at the minimum */
  fun: number;
  /** Number of iterations performed */
  iterations: number;
  /** Number of function evaluations */
  functionCalls: number;
  /** Whether convergence was achieved */
  converged: boolean;
  /** Description of termination */
  message: string;
}

/** Golden section ratio: (3 - √5) / 2 ≈ 0.381966 */
const GOLDEN = (3 - Math.sqrt(5)) / 2;

/**
 * Minimize a univariate function on [a, b] using Brent's method.
 *
 * Requires the minimum to lie in the initial bracket [a, b]. Combines
 * golden section search (guaranteed shrinkage) with parabolic interpolation
 * (superlinear convergence near the minimum).
 *
 * @param f - Function to minimize
 * @param a - Left endpoint of bracket
 * @param b - Right endpoint of bracket
 * @param options - Tolerance and iteration limits
 * @returns Brent1dResult with the minimizer location and value
 *
 * @provenance Brent 1973, Ch. 5 (localmin algorithm)
 * @provenance Default tol = √ε matches scipy.optimize.brent and Optim.jl Brent()
 */
export function brent1d(
  f: (x: number) => number,
  a: number,
  b: number,
  options?: Brent1dOptions,
): Brent1dResult {
  const tol = options?.tol ?? Math.sqrt(Number.EPSILON);
  const maxIter = options?.maxIter ?? 500;
  let functionCalls = 0;

  // Ensure a < b
  if (a > b) {
    const tmp = a; a = b; b = tmp;
  }

  const evalF = (x: number): number => {
    functionCalls++;
    return f(x);
  };

  // Initialize: x is the best point, w is second best, v is previous w
  let x = a + GOLDEN * (b - a);
  let fx = evalF(x);
  let w = x, fw = fx;
  let v = x, fv = fx;

  let d = 0; // Last step taken
  let e = 0; // Step before last (for parabolic check)

  for (let iter = 0; iter < maxIter; iter++) {
    const midpoint = 0.5 * (a + b);
    const tol1 = tol * Math.abs(x) + 1e-10;
    const tol2 = 2 * tol1;

    // Convergence check: x is within tol2 of the midpoint
    if (Math.abs(x - midpoint) <= tol2 - 0.5 * (b - a)) {
      return {
        x, fun: fx, iterations: iter,
        functionCalls, converged: true,
        message: "Convergence: bracket width within tolerance",
      };
    }

    // Try parabolic interpolation
    let useGolden = true;

    if (Math.abs(e) > tol1) {
      // Fit parabola through (v, fv), (w, fw), (x, fx)
      const r = (x - w) * (fx - fv);
      const q = (x - v) * (fx - fw);
      let p = (x - v) * q - (x - w) * r;
      let denom = 2 * (q - r);

      if (denom > 0) {
        p = -p;
      } else {
        denom = -denom;
      }

      // Accept parabolic step if it's:
      // 1. Inside the bracket (|p| < |0.5 * denom * e|)
      // 2. Not too large (within the bracket bounds)
      if (Math.abs(p) < Math.abs(0.5 * denom * e) && p > denom * (a - x) && p < denom * (b - x)) {
        d = p / denom;
        const u = x + d;

        // If new point would be too close to endpoints, step toward midpoint
        if (u - a < tol2 || b - u < tol2) {
          d = x < midpoint ? tol1 : -tol1;
        }

        useGolden = false;
      }
    }

    if (useGolden) {
      // Golden section step
      e = (x < midpoint ? b : a) - x;
      d = GOLDEN * e;
    } else {
      e = d;
    }

    // Evaluate at the new point, ensuring minimum step size
    const u = Math.abs(d) >= tol1 ? x + d : x + (d > 0 ? tol1 : -tol1);
    const fu = evalF(u);

    // Update bracket and best points
    if (fu <= fx) {
      // New point is better than current best
      if (u < x) {
        b = x;
      } else {
        a = x;
      }
      v = w; fv = fw;
      w = x; fw = fx;
      x = u; fx = fu;
    } else {
      // New point is worse — shrink bracket
      if (u < x) {
        a = u;
      } else {
        b = u;
      }

      if (fu <= fw || w === x) {
        v = w; fv = fw;
        w = u; fw = fu;
      } else if (fu <= fv || v === x || v === w) {
        v = u; fv = fu;
      }
    }
  }

  return {
    x, fun: fx, iterations: maxIter,
    functionCalls, converged: false,
    message: "Maximum iterations exceeded",
  };
}
