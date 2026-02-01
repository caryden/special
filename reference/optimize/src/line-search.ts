/**
 * Line search algorithms for gradient-based optimization.
 *
 * Given a position x, direction d, and step size alpha, find an alpha that
 * satisfies sufficient decrease conditions. Two strategies:
 *
 * 1. Backtracking (Armijo): simple, robust, good default for gradient descent
 * 2. Strong Wolfe: required for BFGS (ensures positive-definite Hessian updates)
 *
 * @node line-search
 * @depends-on vec-ops
 * @contract line-search.test.ts
 * @hint wolfe-params: c1=1e-4, c2=0.9 matches scipy. Optim.jl's HagerZhang uses
 *       different parameters internally. Our choice: standard Wolfe from Nocedal & Wright.
 * @hint return: Returns { alpha, fNew, gNew, calls } so the caller can avoid
 *       redundant function/gradient evaluations.
 */

import { dot, addScaled } from "./vec-ops";

export interface LineSearchResult {
  /** Step size found. */
  alpha: number;
  /** Function value at x + alpha * d. */
  fNew: number;
  /** Gradient at x + alpha * d (if computed, else null). */
  gNew: number[] | null;
  /** Number of function evaluations used. */
  functionCalls: number;
  /** Number of gradient evaluations used. */
  gradientCalls: number;
  /** Whether the line search succeeded. */
  success: boolean;
}

/**
 * Backtracking line search with Armijo (sufficient decrease) condition.
 *
 * Finds alpha such that: f(x + alpha*d) <= f(x) + c1*alpha*g'*d
 *
 * Starts with alpha=initialAlpha and multiplies by rho until the condition
 * is satisfied or maxIter is reached.
 *
 * @provenance Nocedal & Wright, Numerical Optimization, Algorithm 3.1
 * @provenance c1=1e-4 matches scipy.optimize.line_search and Optim.jl
 * @provenance rho=0.5 (halving) is the simplest; scipy uses cubic interpolation
 */
export function backtrackingLineSearch(
  f: (x: number[]) => number,
  x: number[],
  d: number[],
  fx: number,
  gx: number[],
  options?: {
    initialAlpha?: number;
    c1?: number;
    rho?: number;
    maxIter?: number;
  },
): LineSearchResult {
  const initialAlpha = options?.initialAlpha ?? 1.0;
  const c1 = options?.c1 ?? 1e-4;
  const rho = options?.rho ?? 0.5;
  const maxIter = options?.maxIter ?? 20;

  const dg = dot(gx, d); // directional derivative g'*d (should be negative)
  let alpha = initialAlpha;
  let functionCalls = 0;

  for (let i = 0; i < maxIter; i++) {
    const xNew = addScaled(x, d, alpha);
    const fNew = f(xNew);
    functionCalls++;

    // Armijo condition: f(x + alpha*d) <= f(x) + c1*alpha*(g'*d)
    if (fNew <= fx + c1 * alpha * dg) {
      return {
        alpha,
        fNew,
        gNew: null,
        functionCalls,
        gradientCalls: 0,
        success: true,
      };
    }

    alpha *= rho;
  }

  // Failed to find a step satisfying Armijo condition
  return {
    alpha,
    fNew: f(addScaled(x, d, alpha)),
    gNew: null,
    functionCalls: functionCalls + 1,
    gradientCalls: 0,
    success: false,
  };
}

/**
 * Strong Wolfe line search.
 *
 * Finds alpha satisfying both:
 *   1. Sufficient decrease (Armijo): f(x + alpha*d) <= f(x) + c1*alpha*g'*d
 *   2. Curvature condition: |g(x + alpha*d)'*d| <= c2*|g(x)'*d|
 *
 * Uses the bracket-and-zoom approach from Nocedal & Wright Chapter 3.
 * Required for BFGS to maintain positive-definite Hessian approximation.
 *
 * @provenance Nocedal & Wright, Numerical Optimization, Algorithm 3.5 + 3.6
 * @provenance c1=1e-4, c2=0.9 matches scipy.optimize.line_search defaults
 * @provenance Optim.jl uses HagerZhang by default (different algorithm, similar guarantees)
 */
export function wolfeLineSearch(
  f: (x: number[]) => number,
  grad: (x: number[]) => number[],
  x: number[],
  d: number[],
  fx: number,
  gx: number[],
  options?: {
    c1?: number;
    c2?: number;
    alphaMax?: number;
    maxIter?: number;
  },
): LineSearchResult {
  const c1 = options?.c1 ?? 1e-4;
  const c2 = options?.c2 ?? 0.9;
  const alphaMax = options?.alphaMax ?? 1e6;
  const maxIter = options?.maxIter ?? 25;

  const dg0 = dot(gx, d); // initial directional derivative
  let functionCalls = 0;
  let gradientCalls = 0;

  let alphaPrev = 0;
  let fPrev = fx;
  let alpha = 1.0;

  for (let i = 0; i < maxIter; i++) {
    const xNew = addScaled(x, d, alpha);
    const fNew = f(xNew);
    functionCalls++;

    // Check Armijo condition or if function increased from previous
    if (fNew > fx + c1 * alpha * dg0 || (i > 0 && fNew >= fPrev)) {
      return zoom(f, grad, x, d, fx, dg0, c1, c2, alphaPrev, alpha, fPrev, fNew,
        functionCalls, gradientCalls);
    }

    const gNew = grad(xNew);
    gradientCalls++;
    const dgNew = dot(gNew, d);

    // Check curvature condition
    if (Math.abs(dgNew) <= c2 * Math.abs(dg0)) {
      return {
        alpha, fNew, gNew, functionCalls, gradientCalls, success: true,
      };
    }

    // If directional derivative is positive, we've bracketed
    if (dgNew >= 0) {
      return zoom(f, grad, x, d, fx, dg0, c1, c2, alpha, alphaPrev, fNew, fPrev,
        functionCalls, gradientCalls);
    }

    alphaPrev = alpha;
    fPrev = fNew;
    alpha = Math.min(2 * alpha, alphaMax);
  }

  // Failed — return best we have
  const xFinal = addScaled(x, d, alpha);
  return {
    alpha,
    fNew: f(xFinal),
    gNew: grad(xFinal),
    functionCalls: functionCalls + 1,
    gradientCalls: gradientCalls + 1,
    success: false,
  };
}

/**
 * Zoom phase of the Wolfe line search.
 * Narrows the bracket [alphaLo, alphaHi] to find a point satisfying both conditions.
 *
 * @provenance Nocedal & Wright, Algorithm 3.6
 */
function zoom(
  f: (x: number[]) => number,
  grad: (x: number[]) => number[],
  x: number[],
  d: number[],
  fx: number,
  dg0: number,
  c1: number,
  c2: number,
  alphaLo: number,
  alphaHi: number,
  fLo: number,
  fHi: number,
  functionCalls: number,
  gradientCalls: number,
): LineSearchResult {
  const maxZoomIter = 20;

  for (let j = 0; j < maxZoomIter; j++) {
    // Bisect the interval
    const alpha = (alphaLo + alphaHi) / 2;
    const xNew = addScaled(x, d, alpha);
    const fNew = f(xNew);
    functionCalls++;

    if (fNew > fx + c1 * alpha * dg0 || fNew >= fLo) {
      alphaHi = alpha;
      fHi = fNew;
    } else {
      const gNew = grad(xNew);
      gradientCalls++;
      const dgNew = dot(gNew, d);

      if (Math.abs(dgNew) <= c2 * Math.abs(dg0)) {
        return {
          alpha, fNew, gNew, functionCalls, gradientCalls, success: true,
        };
      }

      if (dgNew * (alphaHi - alphaLo) >= 0) {
        alphaHi = alphaLo;
        fHi = fLo;
      }

      alphaLo = alpha;
      fLo = fNew;
    }

    // Bracket too small
    if (Math.abs(alphaHi - alphaLo) < 1e-14) {
      break;
    }
  }

  // Return best we found (alphaLo is usually the better end)
  const xFinal = addScaled(x, d, alphaLo);
  return {
    alpha: alphaLo,
    fNew: f(xFinal),
    gNew: grad(xFinal),
    functionCalls: functionCalls + 1,
    gradientCalls: gradientCalls + 1,
    success: false,
  };
}
