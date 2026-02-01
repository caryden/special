/**
 * Gradient descent (steepest descent) optimization.
 *
 * The simplest gradient-based method: d = -gradient, with backtracking line search.
 * Serves as a baseline for comparison with BFGS and L-BFGS.
 *
 * @node gradient-descent
 * @depends-on vec-ops, result-types, line-search, finite-diff
 * @contract gradient-descent.test.ts
 * @hint performance: Gradient descent is slow on ill-conditioned problems (like
 *       Rosenbrock). BFGS is almost always better. Include this node for
 *       completeness and as a teaching example.
 * @hint line-search: Uses backtracking (Armijo) by default, not Wolfe.
 *       GD doesn't maintain a Hessian approximation, so Wolfe isn't needed.
 */

import { negate, normInf, sub, addScaled } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
} from "./result-types";
import { backtrackingLineSearch } from "./line-search";
import { forwardDiffGradient } from "./finite-diff";

/**
 * Minimize a function using gradient descent with backtracking line search.
 *
 * @provenance Standard steepest descent algorithm (Cauchy 1847)
 * @provenance Backtracking line search from Nocedal & Wright, Algorithm 3.1
 */
export function gradientDescent(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  options?: Partial<OptimizeOptions>,
): OptimizeResult {
  const opts = defaultOptions(options);
  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));

  let x = x0.slice();
  let fx = f(x);
  let gx = gradFn(x);
  let functionCalls = 1;
  let gradientCalls = 1;

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
    // Search direction: steepest descent
    const d = negate(gx);

    // Backtracking line search
    const ls = backtrackingLineSearch(f, x, d, fx, gx);
    functionCalls += ls.functionCalls;

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
    const gNew = gradFn(xNew);
    gradientCalls++;

    const stepNorm = normInf(sub(xNew, x));
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
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: opts.maxIterations, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}
