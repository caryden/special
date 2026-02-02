/**
 * Krylov Trust Region (Steihaug-Toint) optimization.
 *
 * A Newton-Krylov trust region method that uses only Hessian-vector products
 * (never forms the full Hessian). The trust region subproblem is solved
 * approximately via the Steihaug-Toint truncated conjugate gradient method.
 *
 * Suitable for large-scale problems where storing the full n×n Hessian is
 * impractical. The Hessian-vector product H*v is computed via finite differences
 * on the gradient: H*v ≈ (grad(x + h*v) - grad(x)) / h.
 *
 * @node krylov-trust-region
 * @depends-on vec-ops, result-types, finite-diff, finite-hessian
 * @contract krylov-trust-region.test.ts
 * @hint hessian-free: Only uses Hessian-vector products, never the full Hessian.
 *       Cost per CG iteration is O(n) (one gradient evaluation).
 * @hint steihaug-toint: The inner CG solver terminates early on negative
 *       curvature (moves to TR boundary) or when CG converges to tolerance.
 * @hint negative-curvature: When d^T H d < 0, the method moves to the trust
 *       region boundary along d — this guarantees at least Cauchy-point decrease.
 * @provenance Steihaug (1983), "The conjugate gradient method and trust regions
 *   in large scale optimization", SIAM J. Numer. Anal.
 * @provenance Optim.jl KrylovTrustRegion() — Steihaug-Toint tCG with radius update
 */

import { dot, normInf } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
} from "./result-types";
import { forwardDiffGradient } from "./finite-diff";
import { hessianVectorProduct } from "./finite-hessian";

export interface KrylovTrustRegionOptions extends Partial<OptimizeOptions> {
  /** Initial trust region radius. Default: 1.0 */
  initialRadius?: number;
  /** Maximum trust region radius. Default: 100.0 */
  maxRadius?: number;
  /** Step acceptance threshold (rho > eta to accept). Default: 0.1 */
  eta?: number;
  /** Below this rho, shrink radius. Default: 0.25 */
  rhoLower?: number;
  /** Above this rho, expand radius (if on boundary). Default: 0.75 */
  rhoUpper?: number;
  /** Inner CG relative tolerance. Default: 0.01 */
  cgTol?: number;
}

/**
 * Steihaug-Toint truncated CG: solve the trust region subproblem
 *   minimize  g^T s + 0.5 s^T H s   subject to  ||s|| <= radius
 * using only Hessian-vector products.
 *
 * Returns { s, mDecrease } where s is the step and mDecrease = g^T s + 0.5 s^T H s.
 *
 * @provenance Steihaug (1983) Algorithm 1
 * @provenance Optim.jl cg_steihaug!
 */
export function steihaugCG(
  grad: (x: number[]) => number[],
  x: number[],
  gx: number[],
  radius: number,
  cgTol: number,
): { s: number[]; mDecrease: number; cgIters: number; onBoundary: boolean; gradCalls: number } {
  const n = x.length;

  // z = accumulated step, r = residual, d = CG direction
  const z = new Array(n).fill(0);
  const r = gx.slice();       // r_0 = g (since H * z_0 = 0)
  const d = r.map(ri => -ri); // d_0 = -r_0 = -g

  let rho0 = dot(r, r);       // ||r_0||^2
  let rhoPrev = rho0;
  let gradCalls = 0;
  let onBoundary = false;

  // At most n CG iterations
  for (let i = 0; i < n; i++) {
    // Hessian-vector product: Hd = H * d
    const Hd = hessianVectorProduct(grad, x, d, gx);
    gradCalls++;
    const dHd = dot(d, Hd); // curvature along d

    // Near-zero curvature: stop
    if (Math.abs(dHd) < 1e-15) {
      break;
    }

    const alpha = rhoPrev / dHd;

    // Check: negative curvature or step exceeds trust region
    if (dHd < 0 || norm2(addStep(z, alpha, d)) >= radius * radius) {
      // Move to trust region boundary
      const tau = boundaryTau(z, d, radius);
      for (let j = 0; j < n; j++) z[j] += tau * d[j];
      onBoundary = true;
      break;
    }

    // Standard CG step (interior)
    for (let j = 0; j < n; j++) z[j] += alpha * d[j];

    // Update residual: r_{k+1} = r_k + alpha * H*d
    for (let j = 0; j < n; j++) r[j] += alpha * Hd[j];
    const rhoNext = dot(r, r);

    // CG convergence check
    if (rhoNext / rho0 < cgTol * cgTol) {
      break;
    }

    // CG beta (Fletcher-Reeves)
    const beta = rhoNext / rhoPrev;
    for (let j = 0; j < n; j++) d[j] = -r[j] + beta * d[j];
    rhoPrev = rhoNext;
  }

  // Compute model decrease: m(s) = g^T s + 0.5 s^T H s
  const Hz = hessianVectorProduct(grad, x, z, gx);
  gradCalls++;
  const mDecrease = dot(gx, z) + 0.5 * dot(z, Hz);

  return { s: z, mDecrease, cgIters: gradCalls - 1, onBoundary, gradCalls };
}

/**
 * Minimize a function using Krylov Trust Region (Steihaug-Toint).
 *
 * @param f - Objective function
 * @param x0 - Starting point
 * @param grad - Gradient function (optional; uses finite differences if omitted)
 * @param options - Optimization and trust region options
 * @returns OptimizeResult
 *
 * @provenance Optim.jl KrylovTrustRegion with default parameters
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 7
 */
export function krylovTrustRegion(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  options?: KrylovTrustRegionOptions,
): OptimizeResult {
  const opts = defaultOptions(options);
  const initialRadius = options?.initialRadius ?? 1.0;
  const maxRadius = options?.maxRadius ?? 100.0;
  const eta = options?.eta ?? 0.1;
  const rhoLower = options?.rhoLower ?? 0.25;
  const rhoUpper = options?.rhoUpper ?? 0.75;
  const cgTol = options?.cgTol ?? 0.01;

  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));

  const n = x0.length;
  let x = x0.slice();
  let fx = f(x);
  let gx = gradFn(x);
  let functionCalls = 1;
  let gradientCalls = 1;
  let radius = initialRadius;

  // Check if already at minimum
  let gradNorm = normInf(gx);
  const initialCheck = checkConvergence(gradNorm, Infinity, Infinity, 0, opts);
  if (initialCheck && isConverged(initialCheck)) {
    return {
      x: x.slice(), fun: fx, gradient: gx.slice(),
      iterations: 0, functionCalls, gradientCalls,
      converged: true, message: convergenceMessage(initialCheck),
    };
  }

  for (let iter = 1; iter <= opts.maxIterations; iter++) {
    // Solve trust region subproblem via Steihaug-Toint CG
    const cg = steihaugCG(gradFn, x, gx, radius, cgTol);
    gradientCalls += cg.gradCalls;
    const s = cg.s;

    // Evaluate candidate
    const xNew = x.map((xi, i) => xi + s[i]);
    const fNew = f(xNew);
    functionCalls++;

    // Compute actual vs predicted reduction
    const actualReduction = fx - fNew;
    const predictedReduction = -cg.mDecrease; // mDecrease is negative

    let rho: number;
    if (predictedReduction <= 0) {
      // If model predicts no decrease (shouldn't happen normally), reject
      rho = 0;
    } else {
      rho = actualReduction / predictedReduction;
    }

    // Determine if step was interior
    const sNorm = Math.sqrt(norm2(s));
    const interior = sNorm < 0.9 * radius;

    // Update radius
    if (rho < rhoLower) {
      radius *= 0.25; // Shrink by 4x
    } else if (rho > rhoUpper && !interior) {
      radius = Math.min(2 * radius, maxRadius); // Expand by 2x
    }

    // Accept or reject step
    if (rho > eta) {
      const fPrev = fx;
      x = xNew;
      fx = fNew;
      gx = gradFn(x);
      gradientCalls++;

      // Check convergence
      gradNorm = normInf(gx);
      const funcChange = Math.abs(fPrev - fx);
      const reason = checkConvergence(gradNorm, sNorm, funcChange, iter, opts);
      if (reason) {
        return {
          x: x.slice(), fun: fx, gradient: gx.slice(),
          iterations: iter, functionCalls, gradientCalls,
          converged: isConverged(reason), message: convergenceMessage(reason),
        };
      }
    } else {
      // Step rejected — check if radius too small
      if (radius < 1e-15) {
        return {
          x: x.slice(), fun: fx, gradient: gx.slice(),
          iterations: iter, functionCalls, gradientCalls,
          converged: false,
          message: "Trust region radius too small",
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

/** Squared norm of z + alpha * d (without allocating). */
function norm2(v: number[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return s;
}

/** Compute z + alpha * d as a new array (for norm check only). */
function addStep(z: number[], alpha: number, d: number[]): number[] {
  const n = z.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) result[i] = z[i] + alpha * d[i];
  return result;
}

/**
 * Solve ||z + tau * d||^2 = radius^2 for the positive root tau.
 * This is a quadratic: a*tau^2 + b*tau + c = 0 where
 *   a = ||d||^2, b = 2*z^T*d, c = ||z||^2 - radius^2
 */
function boundaryTau(z: number[], d: number[], radius: number): number {
  const a = dot(d, d);
  const b = 2 * dot(z, d);
  const c = dot(z, z) - radius * radius;
  const disc = b * b - 4 * a * c;
  return (-b + Math.sqrt(Math.max(0, disc))) / (2 * a);
}
