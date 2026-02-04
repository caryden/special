/**
 * Bootstrap (SIR) particle filter with systematic resampling.
 *
 * The particle filter represents the posterior distribution as a weighted
 * set of samples (particles). It can handle arbitrary nonlinear dynamics
 * and non-Gaussian noise, unlike the KF/EKF/UKF.
 *
 * Algorithm per step:
 *   1. Predict: propagate each particle through the dynamics model + noise
 *   2. Update: reweight particles based on measurement likelihood
 *   3. Resample: systematic resampling when effective sample size drops
 *
 * @node particle-filter
 * @depends-on result-types
 * @contract particle-filter.test.ts
 * @hint seed: Accept optional RNG seed for reproducible tests
 * @hint resampling: Systematic resampling (low variance) when N_eff < threshold
 * @hint off-policy: Particle filter vs EKF vs UKF — particle filter handles
 *       arbitrary distributions but is O(N) per step and suffers from particle
 *       depletion in high dimensions.
 * @provenance FilterPy v1.4.5 (API shape), LowLevelParticleFilters.jl v3.29.4
 */

import { createRNG } from './rrt.ts';

/** A single particle with state and weight */
export interface Particle {
  /** State vector (arbitrary dimension) */
  state: number[];
  /** Unnormalized weight */
  weight: number;
}

/** Particle filter configuration */
export interface ParticleFilterConfig {
  /** Number of particles */
  numParticles: number;
  /** Effective sample size threshold for resampling (fraction of numParticles, 0-1) */
  resampleThreshold: number;
}

/** Default particle filter configuration */
export const DEFAULT_PARTICLE_FILTER_CONFIG: ParticleFilterConfig = {
  numParticles: 200,
  resampleThreshold: 0.5,
};

/** Result of a particle filter step */
export interface ParticleFilterResult {
  /** Updated particles with normalized weights */
  particles: Particle[];
  /** Weighted mean estimate */
  estimate: number[];
  /** Effective sample size */
  nEff: number;
  /** Whether resampling was triggered */
  resampled: boolean;
}

/**
 * Create initial particles uniformly distributed within bounds.
 *
 * @param dimension  State dimension
 * @param bounds  [min, max] for each dimension
 * @param numParticles  Number of particles
 * @param seed  RNG seed for reproducibility
 */
export function particleFilterInit(
  bounds: [number, number][],
  numParticles: number,
  seed: number = 0,
): Particle[] {
  const rng = createRNG(seed);
  const dimension = bounds.length;
  const w = 1 / numParticles;
  const particles: Particle[] = [];

  for (let i = 0; i < numParticles; i++) {
    const state: number[] = [];
    for (let d = 0; d < dimension; d++) {
      state.push(bounds[d][0] + rng() * (bounds[d][1] - bounds[d][0]));
    }
    particles.push({ state, weight: w });
  }

  return particles;
}

/**
 * Predict step: propagate each particle through the dynamics model.
 *
 * @param particles  Current particles
 * @param dynamics  State transition: (state, rng) => new_state
 * @param rng  Random number generator for process noise
 * @returns Predicted particles (weights unchanged)
 */
export function particleFilterPredict(
  particles: Particle[],
  dynamics: (state: number[], rng: () => number) => number[],
  rng: () => number,
): Particle[] {
  return particles.map((p) => ({
    state: dynamics(p.state, rng),
    weight: p.weight,
  }));
}

/**
 * Update step: reweight particles based on measurement likelihood.
 *
 * @param particles  Predicted particles
 * @param measurement  Observation vector
 * @param likelihood  Log-likelihood function: (state, measurement) => log(p(z|x))
 * @returns Particles with updated, normalized weights
 */
export function particleFilterUpdate(
  particles: Particle[],
  measurement: number[],
  likelihood: (state: number[], measurement: number[]) => number,
): Particle[] {
  // Compute log-weights
  const logWeights = particles.map((p) =>
    Math.log(p.weight + 1e-300) + likelihood(p.state, measurement),
  );

  // Log-sum-exp for numerical stability
  const maxLogW = Math.max(...logWeights);
  const expWeights = logWeights.map((lw) => Math.exp(lw - maxLogW));
  const sumExpWeights = expWeights.reduce((a, b) => a + b, 0);

  return particles.map((p, i) => ({
    state: [...p.state],
    weight: expWeights[i] / sumExpWeights,
  }));
}

/**
 * Compute effective sample size from normalized weights.
 * N_eff = 1 / sum(w_i^2)
 */
export function particleFilterNEff(particles: Particle[]): number {
  const sumSq = particles.reduce((acc, p) => acc + p.weight * p.weight, 0);
  return 1 / (sumSq + 1e-300);
}

/**
 * Compute weighted mean estimate from particles.
 */
export function particleFilterEstimate(particles: Particle[]): number[] {
  const dim = particles[0].state.length;
  const estimate = new Array(dim).fill(0);
  for (const p of particles) {
    for (let d = 0; d < dim; d++) {
      estimate[d] += p.weight * p.state[d];
    }
  }
  return estimate;
}

/**
 * Systematic (low-variance) resampling.
 *
 * Draws N new particles with equal weights from the weighted particle set.
 * Uses a single random offset and evenly spaced cumulative weight thresholds.
 *
 * @param particles  Particles with normalized weights
 * @param rng  Random number generator
 * @returns Resampled particles with uniform weights
 */
export function particleFilterResample(
  particles: Particle[],
  rng: () => number,
): Particle[] {
  const N = particles.length;
  const cumWeights: number[] = [];
  let cumSum = 0;
  for (const p of particles) {
    cumSum += p.weight;
    cumWeights.push(cumSum);
  }

  const step = 1 / N;
  const offset = rng() * step;
  const resampled: Particle[] = [];
  let j = 0;

  for (let i = 0; i < N; i++) {
    const threshold = offset + i * step;
    while (j < N - 1 && cumWeights[j] < threshold) {
      j++;
    }
    resampled.push({ state: [...particles[j].state], weight: step });
  }

  return resampled;
}

/**
 * Full particle filter step: predict, update, and conditionally resample.
 *
 * @param particles  Current particles
 * @param measurement  Observation vector
 * @param dynamics  State transition function with noise: (state, rng) => new_state
 * @param likelihood  Log-likelihood: (state, measurement) => log(p(z|x))
 * @param rng  Random number generator
 * @param config  Particle filter configuration
 * @returns ParticleFilterResult with updated particles, estimate, nEff, resampled flag
 */
export function particleFilterStep(
  particles: Particle[],
  measurement: number[],
  dynamics: (state: number[], rng: () => number) => number[],
  likelihood: (state: number[], measurement: number[]) => number,
  rng: () => number,
  config: ParticleFilterConfig = DEFAULT_PARTICLE_FILTER_CONFIG,
): ParticleFilterResult {
  const predicted = particleFilterPredict(particles, dynamics, rng);
  const updated = particleFilterUpdate(predicted, measurement, likelihood);
  const nEff = particleFilterNEff(updated);
  const threshold = config.resampleThreshold * config.numParticles;

  let finalParticles: Particle[];
  let resampled: boolean;
  if (nEff < threshold) {
    finalParticles = particleFilterResample(updated, rng);
    resampled = true;
  } else {
    finalParticles = updated;
    resampled = false;
  }

  const estimate = particleFilterEstimate(finalParticles);
  return { particles: finalParticles, estimate, nEff, resampled };
}
