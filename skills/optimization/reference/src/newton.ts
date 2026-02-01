/**
 * Newton's method for optimization.
 *
 * Uses the Hessian (or its finite-difference approximation) to compute
 * Newton directions d = -H^{-1}*g for quadratic convergence near a minimum.
 * Globalized with line search for robustness far from the solution.
 *
 * @node newton
 * @depends-on vec-ops, result-types, line-search, finite-hessian, finite-diff
 * @contract newton.test.ts
 * @hint modified-newton: When the Hessian is not positive definite, adds
 *       tau*I regularization (Levenberg-Marquardt style) to ensure descent.
 * @hint linear-solve: Uses Cholesky factorization for the linear system.
 *       Falls back to regularization if Cholesky fails.
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 3 (Newton's method)
 * @provenance Modified Newton: Nocedal & Wright, Section 3.4
 * @provenance Optim.jl Newton() — uses NLSolversBase Hessian infrastructure
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
import { wolfeLineSearch } from "./line-search";
import { forwardDiffGradient } from "./finite-diff";
import { finiteDiffHessian } from "./finite-hessian";

/** Options specific to Newton's method. */
export interface NewtonOptions extends Partial<OptimizeOptions> {
  /** Initial regularization for modified Newton. Default: 1e-8 */
  initialTau?: number;
  /** Regularization growth factor. Default: 10 */
  tauFactor?: number;
  /** Maximum regularization attempts. Default: 20 */
  maxRegularize?: number;
}

/**
 * Minimize a function using Newton's method with line search.
 *
 * @param f - Objective function
 * @param x0 - Starting point
 * @param grad - Gradient function (required; if omitted uses finite differences)
 * @param hess - Hessian function (optional; uses finite-diff Hessian if omitted)
 * @param options - Optimization and Newton-specific options
 * @returns OptimizeResult
 *
 * @provenance Nocedal & Wright, Numerical Optimization, Algorithm 3.1 (Newton + line search)
 * @provenance Modified Newton regularization from Section 3.4
 */
export function newton(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  hess?: (x: number[]) => number[][],
  options?: NewtonOptions,
): OptimizeResult {
  const opts = defaultOptions(options);
  const n = x0.length;
  const initialTau = options?.initialTau ?? 1e-8;
  const tauFactor = options?.tauFactor ?? 10;
  const maxRegularize = options?.maxRegularize ?? 20;

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
    // Compute Hessian
    const H = hessFn(x);

    // Solve H*d = -g using Cholesky, with regularization if needed
    const negG = gx.map(g => -g);
    const d = solveWithRegularization(H, negG, initialTau, tauFactor, maxRegularize);

    if (!d) {
      return {
        x, fun: fx, gradient: gx.slice(),
        iterations: iteration, functionCalls, gradientCalls,
        converged: false,
        message: "Stopped: Hessian regularization failed — cannot find descent direction",
      };
    }

    // Ensure descent direction
    if (dot(d, gx) >= 0) {
      // Fall back to steepest descent
      for (let i = 0; i < n; i++) d[i] = -gx[i];
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
    const stepNorm = normInf(sk);
    const funcChange = Math.abs(fNew - fx);
    gradNorm = normInf(gNew);

    x = xNew;
    fx = fNew;
    gx = gNew;

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

/**
 * Solve H*d = b using Cholesky factorization, with regularization if needed.
 *
 * If Cholesky fails (H not positive definite), adds tau*I and retries.
 * Returns null if regularization is exhausted.
 */
function solveWithRegularization(
  H: number[][],
  b: number[],
  initialTau: number,
  tauFactor: number,
  maxAttempts: number,
): number[] | null {
  const n = b.length;

  // Try Cholesky without regularization first
  const d = choleskySolve(H, b);
  if (d) return d;

  // Add regularization: solve (H + tau*I)*d = b
  let tau = initialTau;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const Hreg: number[][] = Array.from({ length: n }, (_, i) => {
      const row = H[i].slice();
      row[i] += tau;
      return row;
    });

    const dReg = choleskySolve(Hreg, b);
    if (dReg) return dReg;

    tau *= tauFactor;
  }

  return null;
}

/**
 * Solve A*x = b using Cholesky factorization (A = L*L').
 * Returns null if A is not positive definite.
 */
function choleskySolve(A: number[][], b: number[]): number[] | null {
  const n = b.length;

  // Cholesky factorization: A = L * L'
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      if (i === j) {
        const diag = A[i][i] - sum;
        if (diag <= 0) return null; // Not positive definite
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }

  // Forward substitution: L*y = b
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
    y[i] = (b[i] - sum) / L[i][i];
  }

  // Back substitution: L'*x = y
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
    x[i] = (y[i] - sum) / L[i][i];
  }

  return x;
}
