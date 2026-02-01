/**
 * L-BFGS (Limited-memory BFGS) optimization.
 *
 * Uses the two-loop recursion to implicitly compute H*g without storing the
 * full n×n inverse Hessian matrix. Stores only the last m correction pairs
 * (s_k, y_k), making it suitable for large-scale problems.
 *
 * @node l-bfgs
 * @depends-on vec-ops, result-types, line-search, finite-diff
 * @contract l-bfgs.test.ts
 * @hint memory: m=10 is the default across scipy, Optim.jl, and most implementations.
 * @hint two-loop: The two-loop recursion (Nocedal & Wright Algorithm 7.4) is the
 *       core of L-BFGS. It computes H*g in O(mn) time and O(mn) space.
 * @hint initial-scaling: H0 = (yk'*sk)/(yk'*yk) * I is the standard scaling
 *       from Nocedal & Wright Eq. 7.20. This adapts the initial Hessian
 *       approximation to the local curvature.
 */

import { dot, sub, negate, normInf, addScaled, scale } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
} from "./result-types";
import { wolfeLineSearch } from "./line-search";
import { forwardDiffGradient } from "./finite-diff";

export interface LBFGSOptions extends OptimizeOptions {
  /** Number of correction pairs to store. Default: 10 */
  memory: number;
}

export function defaultLBFGSOptions(
  overrides?: Partial<LBFGSOptions>,
): LBFGSOptions {
  return {
    ...defaultOptions(overrides),
    memory: 10,
    ...overrides,
  };
}

/**
 * Two-loop recursion for L-BFGS search direction.
 *
 * Computes H * g implicitly using the stored correction pairs.
 *
 * @provenance Nocedal & Wright, Algorithm 7.4
 */
function twoLoopRecursion(
  g: number[],
  sHistory: number[][],
  yHistory: number[][],
  rhoHistory: number[],
  gamma: number,
): number[] {
  const m = sHistory.length;
  const n = g.length;

  let q = g.slice();
  const alphas = new Array(m);

  // First loop: from most recent to oldest
  for (let i = m - 1; i >= 0; i--) {
    alphas[i] = rhoHistory[i] * dot(sHistory[i], q);
    q = addScaled(q, yHistory[i], -alphas[i]);
  }

  // Apply initial Hessian approximation: r = gamma * I * q
  let r = scale(q, gamma);

  // Second loop: from oldest to most recent
  for (let i = 0; i < m; i++) {
    const beta = rhoHistory[i] * dot(yHistory[i], r);
    r = addScaled(r, sHistory[i], alphas[i] - beta);
  }

  return r;
}

/**
 * Minimize a function using L-BFGS.
 *
 * @provenance Algorithm from Nocedal & Wright, Chapter 7
 * @provenance Memory m=10 matches scipy (L-BFGS-B maxcor=10) and Optim.jl (m=10)
 * @provenance Initial Hessian scaling: gamma = (y'*s)/(y'*y) per Eq. 7.20
 */
export function lbfgs(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  options?: Partial<LBFGSOptions>,
): OptimizeResult {
  const opts = defaultLBFGSOptions(options);
  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));

  let x = x0.slice();
  let fx = f(x);
  let gx = gradFn(x);
  let functionCalls = 1;
  let gradientCalls = 1;

  // Correction pair history (circular buffer, most recent at end)
  const sHistory: number[][] = [];
  const yHistory: number[][] = [];
  const rhoHistory: number[] = [];

  // Initial Hessian scaling
  let gamma = 1.0;

  // Check if already at a minimum
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
    // Compute search direction using two-loop recursion
    let d: number[];
    if (sHistory.length === 0) {
      // First iteration: steepest descent
      d = negate(gx);
    } else {
      d = negate(twoLoopRecursion(gx, sHistory, yHistory, rhoHistory, gamma));
    }

    // Line search
    const ls = wolfeLineSearch(f, gradFn, x, d, fx, gx);
    functionCalls += ls.functionCalls;
    gradientCalls += ls.gradientCalls;

    if (!ls.success) {
      return {
        x, fun: fx, gradient: gx.slice(),
        iterations: iteration, functionCalls, gradientCalls,
        converged: false,
        message: "Stopped: line search failed to find acceptable step",
      };
    }

    const xNew = addScaled(x, d, ls.alpha);
    const fNew = ls.fNew;
    const gNew = ls.gNew ?? gradFn(xNew);
    if (!ls.gNew) gradientCalls++;

    const sk = sub(xNew, x);
    const yk = sub(gNew, gx);

    const stepNorm = normInf(sk);
    const funcChange = Math.abs(fNew - fx);
    gradNorm = normInf(gNew);

    x = xNew;
    fx = fNew;
    gx = gNew;

    // Check convergence
    const reason = checkConvergence(gradNorm, stepNorm, funcChange, iteration, opts);
    if (reason) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: iteration, functionCalls, gradientCalls,
        converged: isConverged(reason), message: convergenceMessage(reason),
      };
    }

    // Update history
    const ys = dot(yk, sk);
    if (ys > 1e-10) {
      if (sHistory.length >= opts.memory) {
        sHistory.shift();
        yHistory.shift();
        rhoHistory.shift();
      }
      sHistory.push(sk);
      yHistory.push(yk);
      rhoHistory.push(1.0 / ys);

      // Update initial Hessian scaling
      gamma = ys / dot(yk, yk);
    }
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: opts.maxIterations, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}
