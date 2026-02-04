/**
 * Nelder-Mead simplex optimizer (derivative-free)
 */

import * as vec from "./vec-ops";
import {
  OptimizeOptions,
  OptimizeResult,
  defaultOptions,
  convergenceMessage,
} from "./result-types";

/**
 * Simplex vertex with position and function value
 */
interface Vertex {
  x: number[];
  fx: number;
}

/**
 * Nelder-Mead algorithm parameters
 */
interface NelderMeadParams {
  alpha: number; // reflection coefficient
  gamma: number; // expansion coefficient
  rho: number; // contraction coefficient
  sigma: number; // shrink coefficient
  initialSimplexScale: number; // edge length scale
}

const defaultParams: NelderMeadParams = {
  alpha: 1.0,
  gamma: 2.0,
  rho: 0.5,
  sigma: 0.5,
  initialSimplexScale: 0.05,
};

/**
 * Create initial simplex: vertex 0 = x0, vertex i = x0 + h*ei
 */
function createInitialSimplex(
  f: (x: number[]) => number,
  x0: number[],
  scale: number
): Vertex[] {
  const n = x0.length;
  const simplex: Vertex[] = [];

  // First vertex is the starting point
  simplex.push({ x: vec.clone(x0), fx: f(x0) });

  // Remaining vertices: x0 + h*ei where h = scale * max(|xi|, 1)
  for (let i = 0; i < n; i++) {
    const h = scale * Math.max(Math.abs(x0[i]), 1);
    const x = vec.clone(x0);
    x[i] += h;
    simplex.push({ x, fx: f(x) });
  }

  return simplex;
}

/**
 * Sort simplex vertices by function value (ascending)
 */
function sortSimplex(simplex: Vertex[]): void {
  simplex.sort((a, b) => a.fx - b.fx);
}

/**
 * Compute centroid of all vertices except the worst
 */
function computeCentroid(simplex: Vertex[]): number[] {
  const n = simplex[0].x.length;
  const centroid = vec.zeros(n);

  // Sum all vertices except the last (worst)
  for (let i = 0; i < simplex.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      centroid[j] += simplex[i].x[j];
    }
  }

  // Divide by count
  const count = simplex.length - 1;
  for (let j = 0; j < n; j++) {
    centroid[j] /= count;
  }

  return centroid;
}

/**
 * Check convergence based on function value spread (std dev) and simplex diameter
 */
function checkSimplexConvergence(
  simplex: Vertex[],
  opts: OptimizeOptions
): boolean {
  // Function value spread (std dev)
  const fValues = simplex.map((v) => v.fx);
  const fMean = fValues.reduce((a, b) => a + b, 0) / fValues.length;
  const fVariance =
    fValues.reduce((sum, f) => sum + (f - fMean) ** 2, 0) / fValues.length;
  const fStdDev = Math.sqrt(fVariance);

  if (fStdDev < opts.funcTol) {
    return true;
  }

  // Simplex diameter (max distance between any two vertices)
  let maxDist = 0;
  for (let i = 0; i < simplex.length; i++) {
    for (let j = i + 1; j < simplex.length; j++) {
      const dist = vec.norm(vec.sub(simplex[i].x, simplex[j].x));
      if (dist > maxDist) {
        maxDist = dist;
      }
    }
  }

  if (maxDist < opts.stepTol) {
    return true;
  }

  return false;
}

/**
 * Minimize a function using the Nelder-Mead simplex method
 */
export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  options?: Partial<OptimizeOptions>
): OptimizeResult {
  const opts = defaultOptions(options);
  const params = defaultParams;

  // Create initial simplex
  const simplex = createInitialSimplex(f, x0, params.initialSimplexScale);
  let functionCalls = simplex.length;

  sortSimplex(simplex);

  let iteration = 0;
  let converged = false;
  let message = "";

  while (iteration < opts.maxIterations) {
    iteration++;

    // Check convergence
    if (checkSimplexConvergence(simplex, opts)) {
      converged = true;
      message = "Converged: simplex tolerance reached";
      break;
    }

    // Compute centroid of all vertices except worst
    const centroid = computeCentroid(simplex);
    const worst = simplex[simplex.length - 1];
    const secondWorst = simplex[simplex.length - 2];
    const best = simplex[0];

    // REFLECT: xr = centroid + alpha * (centroid - worst)
    const xReflected = vec.addScaled(
      centroid,
      vec.sub(centroid, worst.x),
      params.alpha
    );
    const fReflected = f(xReflected);
    functionCalls++;

    // If reflection is better than second-worst but not better than best
    if (fReflected >= best.fx && fReflected < secondWorst.fx) {
      // Accept reflection
      worst.x = xReflected;
      worst.fx = fReflected;
      sortSimplex(simplex);
      continue;
    }

    // EXPAND: if reflection is best so far
    if (fReflected < best.fx) {
      const xExpanded = vec.addScaled(
        centroid,
        vec.sub(xReflected, centroid),
        params.gamma
      );
      const fExpanded = f(xExpanded);
      functionCalls++;

      if (fExpanded < fReflected) {
        // Accept expansion
        worst.x = xExpanded;
        worst.fx = fExpanded;
      } else {
        // Accept reflection
        worst.x = xReflected;
        worst.fx = fReflected;
      }
      sortSimplex(simplex);
      continue;
    }

    // CONTRACT: reflection is worse than second-worst
    let xContracted: number[];
    if (fReflected < worst.fx) {
      // Outside contraction
      xContracted = vec.addScaled(
        centroid,
        vec.sub(xReflected, centroid),
        params.rho
      );
    } else {
      // Inside contraction
      xContracted = vec.addScaled(
        centroid,
        vec.sub(worst.x, centroid),
        params.rho
      );
    }
    const fContracted = f(xContracted);
    functionCalls++;

    if (fContracted < Math.min(fReflected, worst.fx)) {
      // Accept contraction
      worst.x = xContracted;
      worst.fx = fContracted;
      sortSimplex(simplex);
      continue;
    }

    // SHRINK: contraction failed
    for (let i = 1; i < simplex.length; i++) {
      simplex[i].x = vec.addScaled(
        best.x,
        vec.sub(simplex[i].x, best.x),
        params.sigma
      );
      simplex[i].fx = f(simplex[i].x);
      functionCalls++;
    }
    sortSimplex(simplex);
  }

  if (!converged) {
    message = "Maximum iterations reached";
  }

  const bestVertex = simplex[0];

  return {
    x: bestVertex.x,
    fun: bestVertex.fx,
    gradient: null,
    iterations: iteration,
    functionCalls,
    gradientCalls: 0,
    converged,
    message,
  };
}
