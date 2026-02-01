/**
 * Top-level minimize function — the public API of the optimization library.
 *
 * Dispatches to the appropriate algorithm based on the method parameter and
 * whether a gradient function is provided.
 *
 * @node minimize
 * @depends-on nelder-mead, gradient-descent, bfgs, l-bfgs, result-types
 * @contract minimize.test.ts
 * @hint composition: This is a thin dispatcher. The real logic lives in the
 *       algorithm nodes. Translate those first.
 * @hint method-selection: Default is "bfgs" with gradient, "nelder-mead" without.
 *       This matches Optim.jl's convention. scipy defaults to BFGS with finite
 *       differences when no gradient is provided.
 */

import { type OptimizeResult, type OptimizeOptions } from "./result-types";
import { nelderMead } from "./nelder-mead";
import { gradientDescent } from "./gradient-descent";
import { bfgs } from "./bfgs";
import { lbfgs } from "./l-bfgs";

export type Method = "nelder-mead" | "gradient-descent" | "bfgs" | "l-bfgs";

/**
 * Minimize a scalar function of one or more variables.
 *
 * @param f - Objective function to minimize.
 * @param x0 - Initial guess (array of numbers).
 * @param options - Optional configuration:
 *   - method: Algorithm to use. Default: "bfgs" if grad provided, "nelder-mead" if not.
 *   - grad: Gradient function. If omitted, finite differences used for gradient methods.
 *   - Plus all OptimizeOptions fields (gradTol, stepTol, funcTol, maxIterations).
 *
 * @provenance API design: method selection matches Optim.jl (NelderMead when no gradient).
 *            scipy defaults to BFGS with finite diff instead.
 *            Our choice: explicit — require method or provide gradient to signal intent.
 */
export function minimize(
  f: (x: number[]) => number,
  x0: number[],
  options?: {
    method?: Method;
    grad?: (x: number[]) => number[];
  } & Partial<OptimizeOptions>,
): OptimizeResult {
  const method = options?.method ?? (options?.grad ? "bfgs" : "nelder-mead");
  const grad = options?.grad;

  // Extract OptimizeOptions (strip method and grad)
  const optsCopy = { ...options };
  delete optsCopy.method;
  delete optsCopy.grad;
  const opts = optsCopy as Partial<OptimizeOptions>;

  switch (method) {
    case "nelder-mead":
      return nelderMead(f, x0, opts);

    case "gradient-descent":
      return gradientDescent(f, x0, grad, opts);

    case "bfgs":
      return bfgs(f, x0, grad, opts);

    case "l-bfgs":
      return lbfgs(f, x0, grad, opts);
  }
}
