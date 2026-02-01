/**
 * Nonlinear Conjugate Gradient optimization (Hager-Zhang variant).
 *
 * Minimizes a scalar function using conjugate gradient directions with
 * the Hager-Zhang beta formula and HagerZhang line search. This matches
 * Optim.jl's ConjugateGradient() implementation.
 *
 * Memory usage is O(n), making CG suitable for large-scale problems
 * where BFGS (O(n²)) is prohibitive.
 *
 * @node conjugate-gradient
 * @depends-on vec-ops, result-types, hager-zhang, finite-diff
 * @contract conjugate-gradient.test.ts
 * @hint beta: Uses the Hager-Zhang beta formula with eta guarantee for descent.
 *       The HZ beta combines features of Polak-Ribière and Dai-Yuan.
 * @hint restart: Restarts every n iterations or when descent is lost.
 * @provenance Hager & Zhang, "A new conjugate gradient method with guaranteed
 *            descent and an efficient line search", SIAM J. Optim. 16(1), 2005
 * @provenance Optim.jl ConjugateGradient() — uses HZ beta + HZ line search
 */

import { dot, sub, normInf, addScaled } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
} from "./result-types";
import { hagerZhangLineSearch } from "./hager-zhang";
import { forwardDiffGradient } from "./finite-diff";

/** Options specific to conjugate gradient. */
export interface ConjugateGradientOptions extends Partial<OptimizeOptions> {
  /** Eta parameter for guaranteed descent. Default: 0.4 (matches Optim.jl) */
  eta?: number;
  /** Restart every n iterations. Default: n (problem dimension) */
  restartInterval?: number;
}

/**
 * Minimize a function using nonlinear conjugate gradient (Hager-Zhang variant).
 *
 * If no gradient function is provided, forward finite differences are used.
 *
 * @param f - Objective function
 * @param x0 - Starting point
 * @param grad - Gradient function (optional; uses finite differences if omitted)
 * @param options - Optimization and CG-specific options
 * @returns OptimizeResult
 *
 * @provenance Hager & Zhang 2005, Eq. (7.8) for beta, with eta from Theorem 4.2
 * @provenance Optim.jl ConjugateGradient(): HZ beta, eta=0.4, restart every n
 */
export function conjugateGradient(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  options?: ConjugateGradientOptions,
): OptimizeResult {
  const opts = defaultOptions(options);
  const n = x0.length;
  const eta = options?.eta ?? 0.4;
  const restartInterval = options?.restartInterval ?? n;

  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));

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

  // Initial direction: steepest descent
  let d = gx.map(g => -g);

  let iteration = 0;

  for (iteration = 1; iteration <= opts.maxIterations; iteration++) {
    // Line search using Hager-Zhang
    const ls = hagerZhangLineSearch(f, gradFn, x, d, fx, gx);
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

    // Update position
    const xNew = addScaled(x, d, ls.alpha);
    const fNew = ls.fNew;
    const gNew = ls.gNew ?? gradFn(xNew);
    if (!ls.gNew) gradientCalls++;

    const sk = sub(xNew, x);
    const stepNorm = normInf(sk);
    const funcChange = Math.abs(fNew - fx);

    const gOld = gx;
    x = xNew;
    fx = fNew;
    gx = gNew;
    gradNorm = normInf(gx);

    // Check convergence (excluding max iterations — handled after loop)
    if (gradNorm <= opts.gradTol) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: iteration, functionCalls, gradientCalls,
        converged: true, message: "Convergence: gradient norm below tolerance",
      };
    }
    if (stepNorm <= opts.stepTol) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: iteration, functionCalls, gradientCalls,
        converged: true, message: "Convergence: step size below tolerance",
      };
    }
    if (funcChange <= opts.funcTol) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: iteration, functionCalls, gradientCalls,
        converged: true, message: "Convergence: function change below tolerance",
      };
    }

    // Compute Hager-Zhang beta
    // y_k = g_{k+1} - g_k
    const yk = sub(gx, gOld);
    const dDotY = dot(d, yk);

    let beta: number;
    if (Math.abs(dDotY) < 1e-30 || iteration % restartInterval === 0) {
      // Restart: use steepest descent direction
      beta = 0;
    } else {
      // HZ beta formula (Hager & Zhang 2005, Eq. 7.8):
      // beta_HZ = (y_k - 2*d_k*||y_k||^2/(d_k·y_k))·g_{k+1} / (d_k·y_k)
      const ykNormSq = dot(yk, yk);
      const coeff = 2 * ykNormSq / dDotY;

      // Compute (y_k - coeff * d_k) · g_{k+1}
      let num = 0;
      for (let i = 0; i < n; i++) {
        num += (yk[i] - coeff * d[i]) * gx[i];
      }
      beta = num / dDotY;

      // Eta guarantee for descent (Theorem 4.2):
      // beta = max(beta, -1 / (||d|| * min(eta, ||g||)))
      let dNorm = 0;
      for (let i = 0; i < n; i++) dNorm += d[i] * d[i];
      dNorm = Math.sqrt(dNorm);
      let gNorm = 0;
      for (let i = 0; i < n; i++) gNorm += gx[i] * gx[i];
      gNorm = Math.sqrt(gNorm);

      const etaK = -1 / (dNorm * Math.min(eta, gNorm));
      beta = Math.max(beta, etaK);
    }

    // Update direction: d_{k+1} = -g_{k+1} + beta * d_k
    // The eta guarantee (Theorem 4.2) ensures this is always a descent direction.
    for (let i = 0; i < n; i++) {
      d[i] = -gx[i] + beta * d[i];
    }
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: iteration - 1, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}
