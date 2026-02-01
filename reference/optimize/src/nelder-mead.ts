/**
 * Nelder-Mead (downhill simplex) optimization.
 *
 * Derivative-free method that maintains a simplex of n+1 vertices in n dimensions.
 * At each step, the worst vertex is replaced via reflection, expansion, contraction,
 * or shrinkage operations.
 *
 * Default parameters match the "standard" values used by scipy and Optim.jl:
 *   alpha=1 (reflect), gamma=2 (expand), rho=0.5 (contract), sigma=0.5 (shrink)
 *
 * @node nelder-mead
 * @depends-on vec-ops, result-types
 * @contract nelder-mead.test.ts
 * @hint no-gradient: This is the only algorithm that doesn't need derivatives.
 *       Use it when gradients are unavailable or expensive.
 * @hint convergence: Checks standard deviation of function values across simplex
 *       vertices against funcTol, and diameter of simplex against stepTol.
 *       Does NOT check gradient (it doesn't compute one).
 * @hint parameters: alpha=1, gamma=2, rho=0.5, sigma=0.5 are universal across
 *       scipy, MATLAB, Optim.jl. These are NOT off-policy.
 */

import { add, sub, scale, addScaled, normInf } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
} from "./result-types";

export interface NelderMeadOptions extends OptimizeOptions {
  /** Reflection coefficient. Default: 1.0 */
  alpha: number;
  /** Expansion coefficient. Default: 2.0 */
  gamma: number;
  /** Contraction coefficient. Default: 0.5 */
  rho: number;
  /** Shrink coefficient. Default: 0.5 */
  sigma: number;
  /** Initial simplex edge length. Default: 0.05 * max(|x_i|, 1) per dimension. */
  initialSimplexScale: number;
}

export function defaultNelderMeadOptions(
  overrides?: Partial<NelderMeadOptions>,
): NelderMeadOptions {
  return {
    ...defaultOptions(overrides),
    alpha: 1.0,
    gamma: 2.0,
    rho: 0.5,
    sigma: 0.5,
    initialSimplexScale: 0.05,
    ...overrides,
  };
}

/**
 * Create initial simplex: n+1 vertices. Vertex 0 = x0, vertex i = x0 + h*e_i.
 */
function createInitialSimplex(x0: number[], scale_: number): number[][] {
  const n = x0.length;
  const simplex: number[][] = [x0.slice()];

  for (let i = 0; i < n; i++) {
    const vertex = x0.slice();
    const h = scale_ * Math.max(Math.abs(x0[i]), 1.0);
    vertex[i] += h;
    simplex.push(vertex);
  }

  return simplex;
}

/**
 * Minimize a function using the Nelder-Mead simplex method.
 *
 * @provenance Algorithm from Nelder & Mead 1965, with standard parameters
 *            matching scipy.optimize.minimize(method='Nelder-Mead') and
 *            Optim.jl NelderMead().
 */
export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  options?: Partial<NelderMeadOptions>,
): OptimizeResult {
  const opts = defaultNelderMeadOptions(options);
  const n = x0.length;

  // Initialize simplex
  let simplex = createInitialSimplex(x0, opts.initialSimplexScale);
  let fValues = simplex.map((v) => f(v));
  let functionCalls = n + 1;

  let iteration = 0;

  while (iteration < opts.maxIterations) {
    // Sort vertices by function value (ascending)
    const indices = Array.from({ length: n + 1 }, (_, i) => i);
    indices.sort((a, b) => fValues[a] - fValues[b]);
    simplex = indices.map((i) => simplex[i]);
    fValues = indices.map((i) => fValues[i]);

    const fBest = fValues[0];
    const fWorst = fValues[n];
    const fSecondWorst = fValues[n - 1];

    // Check convergence: function value spread
    const fMean = fValues.reduce((s, v) => s + v, 0) / (n + 1);
    let fStd = 0;
    for (const fv of fValues) {
      fStd += (fv - fMean) ** 2;
    }
    fStd = Math.sqrt(fStd / (n + 1));

    if (fStd < opts.funcTol) {
      return {
        x: simplex[0].slice(),
        fun: fBest,
        gradient: null,
        iterations: iteration,
        functionCalls,
        gradientCalls: 0,
        converged: true,
        message: `Converged: simplex function spread ${fStd.toExponential(2)} below tolerance`,
      };
    }

    // Check convergence: simplex diameter
    let diameter = 0;
    for (let i = 1; i <= n; i++) {
      const d = normInf(sub(simplex[i], simplex[0]));
      if (d > diameter) diameter = d;
    }

    if (diameter < opts.stepTol) {
      return {
        x: simplex[0].slice(),
        fun: fBest,
        gradient: null,
        iterations: iteration,
        functionCalls,
        gradientCalls: 0,
        converged: true,
        message: `Converged: simplex diameter ${diameter.toExponential(2)} below tolerance`,
      };
    }

    iteration++;

    // Compute centroid of all vertices except the worst
    const centroid = simplex[0].slice();
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] += simplex[i][j];
      }
    }
    for (let j = 0; j < n; j++) {
      centroid[j] /= n;
    }

    // Reflection: x_r = centroid + alpha * (centroid - worst)
    const reflected = addScaled(centroid, sub(centroid, simplex[n]), opts.alpha);
    const fReflected = f(reflected);
    functionCalls++;

    if (fReflected < fSecondWorst && fReflected >= fBest) {
      // Accept reflection
      simplex[n] = reflected;
      fValues[n] = fReflected;
      continue;
    }

    if (fReflected < fBest) {
      // Try expansion: x_e = centroid + gamma * (reflected - centroid)
      const expanded = addScaled(centroid, sub(reflected, centroid), opts.gamma);
      const fExpanded = f(expanded);
      functionCalls++;

      if (fExpanded < fReflected) {
        simplex[n] = expanded;
        fValues[n] = fExpanded;
      } else {
        simplex[n] = reflected;
        fValues[n] = fReflected;
      }
      continue;
    }

    // Contraction
    if (fReflected < fWorst) {
      // Outside contraction: x_c = centroid + rho * (reflected - centroid)
      const contracted = addScaled(centroid, sub(reflected, centroid), opts.rho);
      const fContracted = f(contracted);
      functionCalls++;

      if (fContracted <= fReflected) {
        simplex[n] = contracted;
        fValues[n] = fContracted;
        continue;
      }
    } else {
      // Inside contraction: x_c = centroid + rho * (worst - centroid)
      const contracted = addScaled(centroid, sub(simplex[n], centroid), opts.rho);
      const fContracted = f(contracted);
      functionCalls++;

      if (fContracted < fWorst) {
        simplex[n] = contracted;
        fValues[n] = fContracted;
        continue;
      }
    }

    // Shrink: move all vertices towards the best
    for (let i = 1; i <= n; i++) {
      simplex[i] = add(simplex[0], scale(sub(simplex[i], simplex[0]), opts.sigma));
      fValues[i] = f(simplex[i]);
      functionCalls++;
    }
  }

  // Max iterations reached
  return {
    x: simplex[0].slice(),
    fun: fValues[0],
    gradient: null,
    iterations: iteration,
    functionCalls,
    gradientCalls: 0,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}
