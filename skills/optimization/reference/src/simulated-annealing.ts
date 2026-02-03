/**
 * Simulated Annealing global optimization.
 *
 * Derivative-free stochastic method that explores the search space by generating
 * random neighbor proposals and accepting them based on the Metropolis criterion.
 * Worse solutions are accepted with probability exp(-(f_new - f_old) / T), where
 * T decreases over iterations according to a cooling schedule.
 *
 * Tracks the best-ever solution separately from the current chain position,
 * so the returned result is always the global best found during the search.
 *
 * The default cooling schedule is logarithmic: T(k) = 1 / ln(k), matching
 * Optim.jl's SimulatedAnnealing. The default neighbor generator adds Gaussian
 * noise (N(0,1)) to each coordinate.
 *
 * @node simulated-annealing
 * @depends-on vec-ops, result-types
 * @contract simulated-annealing.test.ts
 * @hint global: Unlike gradient-based methods, SA can escape local minima.
 *       It does NOT guarantee finding the global minimum — it is a heuristic.
 * @hint no-gradient: Completely derivative-free. Uses only function evaluations.
 * @hint seed: Pass a numeric seed for reproducible results. Without a seed,
 *       results vary between runs due to random neighbor generation.
 * @hint cooling: The logarithmic schedule 1/ln(k) is very slow. For faster
 *       convergence on smooth problems, use a geometric schedule like
 *       T(k) = T0 * decay^k.
 * @provenance Kirkpatrick, Gelatt & Vecchi (1983), "Optimization by Simulated Annealing"
 * @provenance Optim.jl SimulatedAnnealing — logarithmic cooling, Gaussian neighbors, keep-best
 */

import { type OptimizeResult, type OptimizeOptions, defaultOptions } from "./result-types";

export interface SimulatedAnnealingOptions extends OptimizeOptions {
  /** Cooling schedule: maps iteration number (starting at 1) to temperature. */
  temperature?: (iteration: number) => number;

  /** Neighbor generator: given current x, returns a new candidate x. */
  neighbor?: (x: number[], rng: () => number) => number[];

  /** Random seed for reproducibility. Default: undefined (uses Math.random). */
  seed?: number;
}

/**
 * Default logarithmic cooling schedule: T(k) = 1 / ln(k).
 * At k=1 returns Infinity (accepts everything), then decays slowly.
 *
 * @provenance Optim.jl log_temperature(t) = 1 / log(t)
 */
export function logTemperature(k: number): number {
  return 1 / Math.log(k);
}

/**
 * Default Gaussian neighbor generator: adds N(0,1) noise to each coordinate.
 *
 * @provenance Optim.jl default_neighbor! — x_proposal[i] = x[i] + randn()
 */
export function gaussianNeighbor(x: number[], rng: () => number): number[] {
  const n = x.length;
  const proposal = new Array(n);
  for (let i = 0; i < n; i++) {
    proposal[i] = x[i] + boxMullerNormal(rng);
  }
  return proposal;
}

/**
 * Box-Muller transform: convert two uniform [0,1) samples into a standard normal.
 */
function boxMullerNormal(rng: () => number): number {
  let u1 = rng();
  while (u1 === 0) u1 = rng(); // avoid log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Mulberry32: fast 32-bit seeded PRNG. Returns values in [0, 1).
 *
 * @provenance Public domain by Tommy Ettinger
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Minimize a function using Simulated Annealing.
 *
 * @param f - Objective function to minimize
 * @param x0 - Starting point
 * @param options - SA options (cooling schedule, neighbor generator, seed)
 * @returns OptimizeResult with the best solution found
 *
 * @provenance Kirkpatrick et al. (1983) Metropolis acceptance criterion
 * @provenance Optim.jl SimulatedAnnealing with log_temperature, keep_best=true
 */
export function simulatedAnnealing(
  f: (x: number[]) => number,
  x0: number[],
  options?: Partial<SimulatedAnnealingOptions>,
): OptimizeResult {
  const opts = defaultOptions(options);
  const maxIter = opts.maxIterations;
  const temperature = options?.temperature ?? logTemperature;
  const neighbor = options?.neighbor ?? gaussianNeighbor;
  const rng = options?.seed !== undefined ? mulberry32(options.seed) : Math.random;

  // Initialize: current position and best-ever
  let xCurrent = x0.slice();
  let fCurrent = f(xCurrent);
  let xBest = xCurrent.slice();
  let fBest = fCurrent;
  let functionCalls = 1;

  for (let k = 1; k <= maxIter; k++) {
    const t = temperature(k);

    // Generate neighbor proposal
    const xProposal = neighbor(xCurrent, rng);
    const fProposal = f(xProposal);
    functionCalls++;

    if (fProposal <= fCurrent) {
      // Always accept improvements
      xCurrent = xProposal;
      fCurrent = fProposal;
      if (fProposal < fBest) {
        xBest = xProposal.slice();
        fBest = fProposal;
      }
    } else {
      // Accept worse solutions with Metropolis probability
      const p = Math.exp(-(fProposal - fCurrent) / t);
      if (rng() <= p) {
        xCurrent = xProposal;
        fCurrent = fProposal;
      }
    }
  }

  return {
    x: xBest,
    fun: fBest,
    gradient: [],
    iterations: maxIter,
    functionCalls,
    gradientCalls: 0,
    converged: true,
    message: `Completed ${maxIter} iterations`,
  };
}
