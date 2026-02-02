/**
 * Newton Trust Region optimization.
 *
 * An alternative to line-search Newton that constrains the step to lie
 * within a trust region of radius delta. Uses the Cauchy-dogleg method
 * to solve the trust region subproblem, with adaptive radius management.
 *
 * @node newton-trust-region
 * @depends-on vec-ops, result-types, finite-diff, finite-hessian
 * @contract newton-trust-region.test.ts
 * @hint subproblem: Uses the dogleg method (Cauchy point + Newton point)
 *       for the trust region subproblem. This is simpler than Steihaug-CG
 *       but sufficient for small-to-medium problems.
 * @hint radius: The trust region radius adapts based on the agreement
 *       between the quadratic model and the actual function.
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 4
 * @provenance Optim.jl NewtonTrustRegion() — similar algorithm
 */

import { dot, sub, normInf } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
} from "./result-types";
import { forwardDiffGradient } from "./finite-diff";
import { finiteDiffHessian } from "./finite-hessian";

/** Options for Newton Trust Region. */
export interface TrustRegionOptions extends Partial<OptimizeOptions> {
  /** Initial trust region radius. Default: 1.0 */
  initialDelta?: number;
  /** Maximum trust region radius. Default: 100.0 */
  maxDelta?: number;
  /** Acceptance threshold for reduction ratio. Default: 0.1 */
  eta?: number;
}

/**
 * Minimize a function using Newton's method with trust region.
 *
 * @param f - Objective function
 * @param x0 - Starting point
 * @param grad - Gradient function (optional; uses finite differences if omitted)
 * @param hess - Hessian function (optional; uses finite-diff Hessian if omitted)
 * @param options - Optimization and trust region options
 * @returns OptimizeResult
 *
 * @provenance Nocedal & Wright, Numerical Optimization, Algorithm 4.1
 * @provenance Trust region radius update from Section 4.1
 * @provenance Dogleg method from Section 4.1
 */
export function newtonTrustRegion(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  hess?: (x: number[]) => number[][],
  options?: TrustRegionOptions,
): OptimizeResult {
  const opts = defaultOptions(options);
  const n = x0.length;
  let delta = options?.initialDelta ?? 1.0;
  const maxDelta = options?.maxDelta ?? 100.0;
  const eta = options?.eta ?? 0.1;

  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));
  const hessFn = hess ?? ((x: number[]) => finiteDiffHessian(f, x));

  let x = x0.slice();
  let fx = f(x);
  let gx = gradFn(x);
  let functionCalls = 1;
  let gradientCalls = 1;

  // Check if already at minimum
  let gradNorm = normInf(gx);
  const initialCheck = checkConvergence(gradNorm, Infinity, Infinity, 0, opts);
  if (initialCheck && isConverged(initialCheck)) {
    return {
      x, fun: fx, gradient: gx.slice(),
      iterations: 0, functionCalls, gradientCalls,
      converged: true, message: convergenceMessage(initialCheck),
    };
  }

  for (let iteration = 1; iteration <= opts.maxIterations; iteration++) {
    const H = hessFn(x);

    // Solve trust region subproblem using dogleg
    const p = doglegStep(gx, H, delta);

    // Evaluate at trial point
    const xTrial = new Array(n);
    for (let i = 0; i < n; i++) xTrial[i] = x[i] + p[i];
    const fTrial = f(xTrial);
    functionCalls++;

    // Predicted reduction from quadratic model: m(0) - m(p) = -(g'p + 0.5*p'Hp)
    const Hp = matVecMul(H, p);
    const predictedReduction = -(dot(gx, p) + 0.5 * dot(p, Hp));
    const actualReduction = fx - fTrial;

    // Reduction ratio
    const rho = predictedReduction > 0 ? actualReduction / predictedReduction : 0;

    // Update trust region radius
    const pNorm = vecNorm(p);
    if (rho < 0.25) {
      delta = 0.25 * pNorm;
    } else if (rho > 0.75 && pNorm >= 0.99 * delta) {
      delta = Math.min(2 * delta, maxDelta);
    }

    // Accept or reject step
    if (rho > eta) {
      const gNew = gradFn(xTrial);
      gradientCalls++;

      const sk = sub(xTrial, x);
      const stepNorm = normInf(sk);
      const funcChange = Math.abs(actualReduction);
      gradNorm = normInf(gNew);

      x = xTrial;
      fx = fTrial;
      gx = gNew;

      const reason = checkConvergence(gradNorm, stepNorm, funcChange, iteration, opts);
      if (reason) {
        return {
          x: x.slice(), fun: fx, gradient: gx.slice(),
          iterations: iteration, functionCalls, gradientCalls,
          converged: isConverged(reason), message: convergenceMessage(reason),
        };
      }
    } else {
      // Step rejected — check if we should stop (trust region too small)
      if (delta < 1e-15) {
        return {
          x: x.slice(), fun: fx, gradient: gx.slice(),
          iterations: iteration, functionCalls, gradientCalls,
          converged: false,
          message: "Stopped: trust region radius below minimum",
        };
      }
    }
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: opts.maxIterations, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}

/**
 * Solve the trust region subproblem using the dogleg method.
 *
 * Returns a step p with ||p|| <= delta that approximately minimizes
 * the quadratic model m(p) = g'p + 0.5*p'Hp.
 *
 * Dogleg combines:
 * 1. Cauchy point: steepest descent to the model minimum along -g
 * 2. Newton point: unconstrained minimizer of the model (H^{-1}*(-g))
 * 3. Dogleg path: interpolation from Cauchy to Newton within trust region
 *
 * @provenance Nocedal & Wright, Section 4.1 (dogleg method)
 */
function doglegStep(g: number[], H: number[][], delta: number): number[] {
  const n = g.length;

  // Newton step: pN = -H^{-1} g
  const negG = g.map(gi => -gi);
  const pN = choleskySolve(H, negG);

  // If Newton step is within trust region and H is PD, use it
  if (pN && vecNorm(pN) <= delta) {
    return pN;
  }

  // Cauchy point: minimize model along steepest descent direction
  // pC = -alpha_C * g, where alpha_C = ||g||^2 / (g'Hg)
  const Hg = matVecMul(H, g);
  const gHg = dot(g, Hg);
  const gNormSq = dot(g, g);

  let pC: number[];
  if (gHg <= 0) {
    // Negative or zero curvature — go to trust region boundary along -g
    const gNorm = Math.sqrt(gNormSq);
    const scale = delta / gNorm;
    pC = g.map(gi => -scale * gi);
    return pC;
  }

  const alphaC = gNormSq / gHg;
  pC = g.map(gi => -alphaC * gi);
  const pCNorm = vecNorm(pC);

  // If Cauchy point is outside trust region, scale to boundary
  if (pCNorm >= delta) {
    const scale = delta / pCNorm;
    return pC.map(pi => scale * pi);
  }

  // Dogleg: interpolate between Cauchy point and Newton point
  // If Newton step failed (not PD), fall back to Cauchy
  if (!pN) return pC;

  // Find tau in [0, 1] such that ||pC + tau*(pN - pC)|| = delta
  const diff = new Array(n);
  for (let i = 0; i < n; i++) diff[i] = pN[i] - pC[i];

  const a = dot(diff, diff);
  const b = 2 * dot(pC, diff);
  const c = dot(pC, pC) - delta * delta;
  const disc = b * b - 4 * a * c;

  if (disc < 0 || a <= 0) return pC;

  const tau = (-b + Math.sqrt(disc)) / (2 * a);
  const tauClamped = Math.max(0, Math.min(1, tau));
  return pC.map((pi, i) => pi + tauClamped * diff[i]);
}

/** Matrix-vector multiply. */
function matVecMul(M: number[][], v: number[]): number[] {
  const n = v.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += M[i][j] * v[j];
    result[i] = sum;
  }
  return result;
}

/** Euclidean norm of vector. */
function vecNorm(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

/**
 * Solve A*x = b using Cholesky factorization.
 * Returns null if A is not positive definite.
 */
function choleskySolve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = A[i][i] - sum;
        if (diag <= 0) return null;
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }

  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
    y[i] = (b[i] - sum) / L[i][i];
  }

  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
    x[i] = (y[i] - sum) / L[i][i];
  }

  return x;
}
