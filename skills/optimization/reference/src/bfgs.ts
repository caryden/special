/**
 * BFGS (Broyden-Fletcher-Goldfarb-Shanno) quasi-Newton optimization.
 *
 * Maintains an approximation to the inverse Hessian matrix, updated at each
 * step using gradient information. The search direction is d = -H * g, where
 * H is the inverse Hessian approximation.
 *
 * Uses Strong Wolfe line search by default (required to maintain positive-
 * definiteness of the Hessian approximation).
 *
 * @node bfgs
 * @depends-on vec-ops, result-types, line-search, finite-diff
 * @contract bfgs.test.ts
 * @hint hessian-update: The BFGS update formula is the most complex part.
 *       Translating it requires careful attention to matrix operations.
 *       In languages without matrix libraries, use explicit loops over n×n arrays.
 * @hint curvature-guard: Skip the Hessian update when yk·sk <= 0 (negative
 *       curvature). This prevents the approximation from becoming indefinite.
 * @hint line-search: BFGS requires Wolfe conditions (not just Armijo) to
 *       guarantee positive-definite updates. Using backtracking alone may
 *       cause the Hessian approximation to degenerate.
 */

import { dot, sub, scale, negate, normInf, addScaled } from "./vec-ops";
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

/**
 * Minimize a function using the BFGS quasi-Newton method.
 *
 * If no gradient function is provided, forward finite differences are used.
 *
 * @provenance Algorithm from Nocedal & Wright, Numerical Optimization, Chapter 6
 * @provenance Initial H0 = identity (standard choice, matches scipy and Optim.jl)
 * @provenance Curvature condition guard: skip update when yk·sk <= 0
 *            (matches Optim.jl behavior; scipy uses a damped BFGS variant instead)
 */
export function bfgs(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  options?: Partial<OptimizeOptions>,
): OptimizeResult {
  const opts = defaultOptions(options);
  const n = x0.length;

  // Gradient function: analytic or finite differences
  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));

  // State
  let x = x0.slice();
  let fx = f(x);
  let gx = gradFn(x);
  let functionCalls = 1;
  let gradientCalls = 1;

  // Initialize inverse Hessian approximation as identity matrix (n×n)
  let H = identityMatrix(n);

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
    // Search direction: d = -H * g
    const d = negate(matVecMul(H, gx));

    // Line search (Strong Wolfe)
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

    // Step and gradient difference
    const xNew = addScaled(x, d, ls.alpha);
    const fNew = ls.fNew;
    const gNew = ls.gNew ?? gradFn(xNew);
    if (!ls.gNew) gradientCalls++;

    const sk = sub(xNew, x);        // step: x_{k+1} - x_k
    const yk = sub(gNew, gx);       // gradient change: g_{k+1} - g_k

    const stepNorm = normInf(sk);
    const funcChange = Math.abs(fNew - fx);
    gradNorm = normInf(gNew);

    // Update state
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

    // BFGS inverse Hessian update
    const ys = dot(yk, sk);

    // Curvature condition guard: skip update if yk·sk <= 0
    if (ys <= 1e-10) {
      continue;
    }

    // H_{k+1} = (I - rho*s*y') * H_k * (I - rho*y*s') + rho*s*s'
    // where rho = 1 / (y' * s)
    const rho = 1.0 / ys;
    H = bfgsUpdate(H, sk, yk, rho);
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: opts.maxIterations, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}

/** Create an n×n identity matrix as flat array of rows. */
function identityMatrix(n: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    m.push(row);
  }
  return m;
}

/** Matrix-vector multiply: result = M * v. */
function matVecMul(M: number[][], v: number[]): number[] {
  const n = v.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += M[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

/**
 * BFGS inverse Hessian update.
 *
 * H_{k+1} = (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
 *
 * @provenance Nocedal & Wright, Eq. 6.17
 */
function bfgsUpdate(
  H: number[][],
  s: number[],
  y: number[],
  rho: number,
): number[][] {
  const n = s.length;
  const Hy = matVecMul(H, y);
  const yHy = dot(y, Hy);

  const Hnew: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) {
      // (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
      // Expanded: H_ij - rho*s_i*(Hy)_j - rho*(Hy)_i*s_j + rho^2*s_i*s_j*yHy + rho*s_i*s_j
      // Simplified: H_ij - rho*(s_i*Hy_j + Hy_i*s_j) + (rho + rho^2*yHy)*s_i*s_j
      row[j] =
        H[i][j] -
        rho * (s[i] * Hy[j] + Hy[i] * s[j]) +
        rho * (1 + rho * yHy) * s[i] * s[j];
    }
    Hnew.push(row);
  }

  return Hnew;
}
