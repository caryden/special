/**
 * Fminbox: box-constrained optimization via logarithmic barrier method.
 *
 * Converts a box-constrained problem:
 *   minimize f(x) subject to lower <= x <= upper
 * into a sequence of unconstrained subproblems:
 *   minimize f(x) + mu * B(x)
 * where B(x) = sum(-log(x_i - l_i) - log(u_i - x_i)) is the log-barrier,
 * and mu is progressively reduced toward zero.
 *
 * Supports infinite bounds: -Infinity lower or +Infinity upper bounds
 * disable the corresponding barrier term.
 *
 * @node fminbox
 * @depends-on vec-ops, result-types, any-of(bfgs, l-bfgs, conjugate-gradient, gradient-descent)
 * @contract fminbox.test.ts
 * @hint barrier: The log-barrier creates an infinite wall at boundaries,
 *       keeping iterates strictly interior. The mu parameter controls
 *       barrier strength and is reduced aggressively (by mufactor) each
 *       outer iteration.
 * @hint projected-gradient: Convergence is checked using the projected
 *       gradient norm, not the raw gradient. At boundaries, gradient
 *       components pointing outside the feasible region are zeroed.
 * @hint inner-solver: The inner solver sees f(x) + mu*B(x) as a single
 *       unconstrained objective. Any gradient-based optimizer works.
 * @provenance Optim.jl Fminbox() — logarithmic barrier with mu reduction
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 19 (barrier methods)
 */

import { dot, normInf, clone } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
} from "./result-types";
import { bfgs } from "./bfgs";
import { lbfgs } from "./l-bfgs";
import { conjugateGradient } from "./conjugate-gradient";
import { gradientDescent } from "./gradient-descent";

export type FminboxMethod = "bfgs" | "l-bfgs" | "conjugate-gradient" | "gradient-descent";

export interface FminboxOptions extends Partial<OptimizeOptions> {
  /** Lower bounds for each variable. Default: all -Infinity */
  lower?: number[];
  /** Upper bounds for each variable. Default: all +Infinity */
  upper?: number[];
  /** Inner optimization method. Default: "l-bfgs" */
  method?: FminboxMethod;
  /** Initial barrier multiplier. Default: auto-calculated from gradient ratio */
  mu0?: number;
  /** Barrier reduction factor per outer iteration. Default: 0.001 */
  muFactor?: number;
  /** Maximum outer (barrier) iterations. Default: 20 */
  outerIterations?: number;
  /** Gradient tolerance for the projected gradient. Default: 1e-8 */
  outerGradTol?: number;
}

/**
 * Minimize a function subject to box constraints using a log-barrier method.
 *
 * @param f - Objective function
 * @param x0 - Starting point (must be strictly inside the box, or will be nudged)
 * @param grad - Gradient function (required for barrier method)
 * @param options - Fminbox options including bounds and inner method
 * @returns OptimizeResult with the constrained minimizer
 *
 * @provenance Optim.jl Fminbox with LBFGS inner solver
 * @provenance Log-barrier from Nocedal & Wright Chapter 19
 */
export function fminbox(
  f: (x: number[]) => number,
  x0: number[],
  grad: (x: number[]) => number[],
  options?: FminboxOptions,
): OptimizeResult {
  const n = x0.length;
  const lower = options?.lower ?? new Array(n).fill(-Infinity);
  const upper = options?.upper ?? new Array(n).fill(Infinity);
  const method = options?.method ?? "l-bfgs";
  const muFactor = options?.muFactor ?? 0.001;
  const outerIterations = options?.outerIterations ?? 20;
  const outerGradTol = options?.outerGradTol ?? 1e-8;

  // Validate bounds
  for (let i = 0; i < n; i++) {
    if (lower[i] >= upper[i]) {
      return {
        x: x0.slice(), fun: f(x0), gradient: grad(x0),
        iterations: 0, functionCalls: 1, gradientCalls: 1,
        converged: false, message: "Invalid bounds: lower >= upper",
      };
    }
  }

  // Initialize x strictly inside the box
  let x = x0.slice();
  for (let i = 0; i < n; i++) {
    if (x[i] <= lower[i] || x[i] >= upper[i]) {
      // Nudge to interior: 99% toward lower, 1% toward upper (or vice versa)
      if (x[i] <= lower[i]) {
        x[i] = isFinite(lower[i]) && isFinite(upper[i])
          ? 0.99 * lower[i] + 0.01 * upper[i]
          : isFinite(lower[i]) ? lower[i] + 1.0 : 0.0;
      } else {
        x[i] = isFinite(lower[i]) && isFinite(upper[i])
          ? 0.01 * lower[i] + 0.99 * upper[i]
          : isFinite(upper[i]) ? upper[i] - 1.0 : 0.0;
      }
    }
  }

  let functionCalls = 0;
  let gradientCalls = 0;

  // Evaluate initial point
  let fx = f(x);
  let gx = grad(x);
  functionCalls++;
  gradientCalls++;

  // Compute initial mu from gradient ratio (Optim.jl approach)
  let mu: number;
  if (options?.mu0 !== undefined) {
    mu = options.mu0;
  } else {
    const objGradNorm = gx.reduce((sum, gi) => sum + Math.abs(gi), 0); // L1 norm
    const barrierGrad = barrierGradient(x, lower, upper);
    const barGradNorm = barrierGrad.reduce((sum, gi) => sum + Math.abs(gi), 0);
    mu = barGradNorm > 0 ? muFactor * objGradNorm / barGradNorm : 1e-4;
  }

  // Check initial projected gradient convergence
  let projGradNorm = projectedGradientNorm(x, gx, lower, upper);
  if (projGradNorm <= outerGradTol) {
    return {
      x: x.slice(), fun: fx, gradient: gx.slice(),
      iterations: 0, functionCalls, gradientCalls,
      converged: true, message: "Converged: projected gradient norm below tolerance",
    };
  }

  const innerOpts = defaultOptions(options);

  let outerIter = 0;
  for (outerIter = 1; outerIter <= outerIterations; outerIter++) {
    const currentMu = mu;

    // Create barrier-augmented objective and gradient
    const barrierF = (xp: number[]): number => {
      const bv = barrierValue(xp, lower, upper);
      if (!isFinite(bv)) return Infinity;
      return f(xp) + currentMu * bv;
    };

    const barrierGrad = (xp: number[]): number[] => {
      const gObj = grad(xp);
      const gBar = barrierGradient(xp, lower, upper);
      const result = new Array(n);
      for (let i = 0; i < n; i++) {
        result[i] = gObj[i] + currentMu * gBar[i];
      }
      return result;
    };

    // Run inner optimizer
    const innerResult = runInner(method, barrierF, x, barrierGrad, innerOpts);

    // Extract solution and re-evaluate true objective
    x = innerResult.x;

    // Clamp to ensure strictly interior (numerical safety)
    for (let i = 0; i < n; i++) {
      if (isFinite(lower[i])) x[i] = Math.max(lower[i] + 1e-15, x[i]);
      if (isFinite(upper[i])) x[i] = Math.min(upper[i] - 1e-15, x[i]);
    }

    fx = f(x);
    gx = grad(x);
    functionCalls += innerResult.functionCalls + 1;
    gradientCalls += innerResult.gradientCalls + 1;

    // Check outer convergence using projected gradient
    projGradNorm = projectedGradientNorm(x, gx, lower, upper);
    if (projGradNorm <= outerGradTol) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: outerIter, functionCalls, gradientCalls,
        converged: true, message: "Converged: projected gradient norm below tolerance",
      };
    }

    // Reduce barrier strength
    mu *= muFactor;
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: outerIter - 1, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum outer iterations (${outerIterations})`,
  };
}

/**
 * Compute the log-barrier value: sum(-log(x_i - l_i) - log(u_i - x_i)).
 * Infinite bounds contribute zero. Returns Infinity if x is outside the box.
 */
export function barrierValue(x: number[], lower: number[], upper: number[]): number {
  let val = 0;
  for (let i = 0; i < x.length; i++) {
    if (isFinite(lower[i])) {
      const dxl = x[i] - lower[i];
      if (dxl <= 0) return Infinity;
      val -= Math.log(dxl);
    }
    if (isFinite(upper[i])) {
      const dxu = upper[i] - x[i];
      if (dxu <= 0) return Infinity;
      val -= Math.log(dxu);
    }
  }
  return val;
}

/**
 * Compute the log-barrier gradient.
 * Component i: -1/(x_i - l_i) + 1/(u_i - x_i).
 * Infinite bounds contribute zero gradient.
 */
export function barrierGradient(x: number[], lower: number[], upper: number[]): number[] {
  const g = new Array(x.length);
  for (let i = 0; i < x.length; i++) {
    g[i] = 0;
    if (isFinite(lower[i])) {
      g[i] += -1 / (x[i] - lower[i]);
    }
    if (isFinite(upper[i])) {
      g[i] += 1 / (upper[i] - x[i]);
    }
  }
  return g;
}

/**
 * Compute the projected gradient norm for box constraints.
 * The projected gradient is: x - clamp(x - g, lower, upper).
 * At interior points this equals g. At boundaries, components pointing
 * outside the feasible region are zeroed.
 */
export function projectedGradientNorm(
  x: number[], g: number[], lower: number[], upper: number[],
): number {
  let maxVal = 0;
  for (let i = 0; i < x.length; i++) {
    const projected = x[i] - Math.max(lower[i], Math.min(upper[i], x[i] - g[i]));
    maxVal = Math.max(maxVal, Math.abs(projected));
  }
  return maxVal;
}

/** Dispatch to the inner unconstrained optimizer. */
function runInner(
  method: FminboxMethod,
  f: (x: number[]) => number,
  x0: number[],
  grad: (x: number[]) => number[],
  options: OptimizeOptions,
): OptimizeResult {
  switch (method) {
    case "bfgs":
      return bfgs(f, x0, grad, options);
    case "l-bfgs":
      return lbfgs(f, x0, grad, options);
    case "conjugate-gradient":
      return conjugateGradient(f, x0, grad, options);
    case "gradient-descent":
      return gradientDescent(f, x0, grad, options);
  }
}
