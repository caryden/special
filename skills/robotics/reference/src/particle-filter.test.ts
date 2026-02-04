import { describe, expect, it } from 'bun:test';
import {
  particleFilterInit,
  particleFilterPredict,
  particleFilterUpdate,
  particleFilterResample,
  particleFilterNEff,
  particleFilterEstimate,
  particleFilterStep,
  DEFAULT_PARTICLE_FILTER_CONFIG,
  type Particle,
} from './particle-filter.ts';
import { createRNG } from './rrt.ts';

describe('particleFilterInit', () => {
  it('creates correct number of particles', () => {
    const particles = particleFilterInit([[0, 10]], 100, 42);
    expect(particles.length).toBe(100);
  });

  it('initializes with uniform weights', () => {
    const particles = particleFilterInit([[0, 10]], 50, 42);
    for (const p of particles) {
      expect(p.weight).toBeCloseTo(1 / 50, 10);
    }
  });

  it('particles are within bounds', () => {
    const particles = particleFilterInit([[0, 5], [-3, 3]], 200, 42);
    for (const p of particles) {
      expect(p.state[0]).toBeGreaterThanOrEqual(0);
      expect(p.state[0]).toBeLessThanOrEqual(5);
      expect(p.state[1]).toBeGreaterThanOrEqual(-3);
      expect(p.state[1]).toBeLessThanOrEqual(3);
    }
  });

  it('deterministic with same seed', () => {
    const p1 = particleFilterInit([[0, 10]], 20, 42);
    const p2 = particleFilterInit([[0, 10]], 20, 42);
    for (let i = 0; i < 20; i++) {
      expect(p1[i].state[0]).toBe(p2[i].state[0]);
    }
  });

  it('different seeds produce different particles', () => {
    const p1 = particleFilterInit([[0, 10]], 20, 42);
    const p2 = particleFilterInit([[0, 10]], 20, 99);
    let allSame = true;
    for (let i = 0; i < 20; i++) {
      if (p1[i].state[0] !== p2[i].state[0]) allSame = false;
    }
    expect(allSame).toBe(false);
  });
});

describe('particleFilterPredict', () => {
  it('propagates particles through dynamics', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.5 },
      { state: [1], weight: 0.5 },
    ];
    const dynamics = (state: number[]) => [state[0] + 1];
    const rng = createRNG(42);
    const predicted = particleFilterPredict(particles, dynamics, rng);
    expect(predicted[0].state[0]).toBe(1);
    expect(predicted[1].state[0]).toBe(2);
  });

  it('preserves weights', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.3 },
      { state: [1], weight: 0.7 },
    ];
    const dynamics = (state: number[]) => [...state];
    const rng = createRNG(42);
    const predicted = particleFilterPredict(particles, dynamics, rng);
    expect(predicted[0].weight).toBe(0.3);
    expect(predicted[1].weight).toBe(0.7);
  });

  it('passes rng to dynamics for noise', () => {
    const particles: Particle[] = [
      { state: [0], weight: 1 },
    ];
    const dynamics = (state: number[], rng: () => number) => [state[0] + rng()];
    const rng = createRNG(42);
    const predicted = particleFilterPredict(particles, dynamics, rng);
    expect(predicted[0].state[0]).not.toBe(0);
  });
});

describe('particleFilterUpdate', () => {
  it('reweights based on likelihood', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.5 },
      { state: [10], weight: 0.5 },
    ];
    // Measurement at 0 — particle at 0 should get higher weight
    const likelihood = (state: number[], meas: number[]) =>
      -0.5 * (state[0] - meas[0]) ** 2;
    const updated = particleFilterUpdate(particles, [0], likelihood);
    expect(updated[0].weight).toBeGreaterThan(updated[1].weight);
  });

  it('weights sum to 1', () => {
    const particles: Particle[] = [
      { state: [1], weight: 0.25 },
      { state: [2], weight: 0.25 },
      { state: [3], weight: 0.25 },
      { state: [4], weight: 0.25 },
    ];
    const likelihood = (state: number[], meas: number[]) =>
      -0.5 * (state[0] - meas[0]) ** 2;
    const updated = particleFilterUpdate(particles, [2.5], likelihood);
    const sum = updated.reduce((a, p) => a + p.weight, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('does not modify original particles', () => {
    const particles: Particle[] = [
      { state: [5], weight: 0.5 },
      { state: [10], weight: 0.5 },
    ];
    const likelihood = () => 0;
    particleFilterUpdate(particles, [0], likelihood);
    expect(particles[0].weight).toBe(0.5);
  });
});

describe('particleFilterNEff', () => {
  it('equals N for uniform weights', () => {
    const particles: Particle[] = Array.from({ length: 100 }, () => ({
      state: [0],
      weight: 0.01,
    }));
    expect(particleFilterNEff(particles)).toBeCloseTo(100, 0);
  });

  it('equals 1 for single dominant particle', () => {
    const particles: Particle[] = [
      { state: [0], weight: 1 },
      { state: [1], weight: 0 },
      { state: [2], weight: 0 },
    ];
    expect(particleFilterNEff(particles)).toBeCloseTo(1, 0);
  });

  it('between 1 and N for non-uniform weights', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.7 },
      { state: [1], weight: 0.2 },
      { state: [2], weight: 0.1 },
    ];
    const nEff = particleFilterNEff(particles);
    expect(nEff).toBeGreaterThan(1);
    expect(nEff).toBeLessThan(3);
  });
});

describe('particleFilterEstimate', () => {
  it('computes weighted mean', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.5 },
      { state: [10], weight: 0.5 },
    ];
    const est = particleFilterEstimate(particles);
    expect(est[0]).toBeCloseTo(5, 8);
  });

  it('handles multi-dimensional state', () => {
    const particles: Particle[] = [
      { state: [1, 2], weight: 0.3 },
      { state: [4, 8], weight: 0.7 },
    ];
    const est = particleFilterEstimate(particles);
    expect(est[0]).toBeCloseTo(0.3 * 1 + 0.7 * 4, 8);
    expect(est[1]).toBeCloseTo(0.3 * 2 + 0.7 * 8, 8);
  });
});

describe('particleFilterResample', () => {
  it('produces same number of particles', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.1 },
      { state: [1], weight: 0.2 },
      { state: [2], weight: 0.7 },
    ];
    const rng = createRNG(42);
    const resampled = particleFilterResample(particles, rng);
    expect(resampled.length).toBe(3);
  });

  it('produces uniform weights after resampling', () => {
    const particles: Particle[] = Array.from({ length: 10 }, (_, i) => ({
      state: [i],
      weight: i === 5 ? 0.91 : 0.01,
    }));
    const rng = createRNG(42);
    const resampled = particleFilterResample(particles, rng);
    for (const p of resampled) {
      expect(p.weight).toBeCloseTo(0.1, 8);
    }
  });

  it('high-weight particles are duplicated', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.01 },
      { state: [5], weight: 0.98 },
      { state: [10], weight: 0.01 },
    ];
    const rng = createRNG(42);
    const resampled = particleFilterResample(particles, rng);
    const atFive = resampled.filter((p) => p.state[0] === 5).length;
    expect(atFive).toBeGreaterThanOrEqual(2);
  });

  it('deterministic with same rng', () => {
    const particles: Particle[] = [
      { state: [0], weight: 0.3 },
      { state: [1], weight: 0.3 },
      { state: [2], weight: 0.4 },
    ];
    const r1 = particleFilterResample(particles, createRNG(42));
    const r2 = particleFilterResample(particles, createRNG(42));
    for (let i = 0; i < r1.length; i++) {
      expect(r1[i].state[0]).toBe(r2[i].state[0]);
    }
  });
});

describe('particleFilterStep', () => {
  it('runs a full step', () => {
    const particles = particleFilterInit([[0, 10]], 50, 42);
    const dynamics = (state: number[], rng: () => number) => [state[0] + 0.1 * (rng() - 0.5)];
    const likelihood = (state: number[], meas: number[]) =>
      -0.5 * (state[0] - meas[0]) ** 2;
    const rng = createRNG(42);
    const config = { ...DEFAULT_PARTICLE_FILTER_CONFIG, numParticles: 50 };

    const result = particleFilterStep(particles, [5], dynamics, likelihood, rng, config);
    expect(result.particles.length).toBe(50);
    expect(result.estimate.length).toBe(1);
    expect(result.nEff).toBeGreaterThan(0);
  });

  it('converges toward measurement over multiple steps', () => {
    const N = 500;
    let particles = particleFilterInit([[0, 20]], N, 42);
    const rng = createRNG(42);
    const trueValue = 7;
    const config = { numParticles: N, resampleThreshold: 0.5 };

    // Identity dynamics with small noise
    const dynamics = (state: number[], rng: () => number) => [
      state[0] + 0.1 * (rng() - 0.5),
    ];
    // Gaussian likelihood centered at true value
    const likelihood = (state: number[], meas: number[]) =>
      -0.5 * ((state[0] - meas[0]) ** 2);

    let estimate = 0;
    for (let i = 0; i < 30; i++) {
      const result = particleFilterStep(
        particles, [trueValue], dynamics, likelihood, rng, config,
      );
      particles = result.particles;
      estimate = result.estimate[0];
    }
    expect(estimate).toBeCloseTo(trueValue, 0);
  });

  it('does not resample when nEff is high', () => {
    // All particles have equal weight and uniform likelihood
    const particles: Particle[] = Array.from({ length: 10 }, (_, i) => ({
      state: [i],
      weight: 0.1,
    }));
    const dynamics = (state: number[]) => [...state];
    const likelihood = () => 0; // uniform likelihood → equal weights
    const rng = createRNG(42);
    const config = { numParticles: 10, resampleThreshold: 0.5 };

    const result = particleFilterStep(particles, [5], dynamics, likelihood, rng, config);
    expect(result.resampled).toBe(false);
    expect(result.nEff).toBeCloseTo(10, 0);
  });

  it('resamples when nEff drops below threshold', () => {
    // One particle dominates
    const particles: Particle[] = [
      { state: [5], weight: 0.97 },
      { state: [0], weight: 0.01 },
      { state: [10], weight: 0.01 },
      { state: [15], weight: 0.01 },
    ];
    const dynamics = (state: number[]) => [...state];
    // Make particle at 5 even more dominant
    const likelihood = (state: number[], meas: number[]) =>
      -0.5 * ((state[0] - meas[0]) ** 2);
    const rng = createRNG(42);
    const config = { numParticles: 4, resampleThreshold: 0.5 };

    const result = particleFilterStep(particles, [5], dynamics, likelihood, rng, config);
    expect(result.resampled).toBe(true);
  });
});

describe('particleFilterStep — 2D tracking', () => {
  it('tracks a 2D position', () => {
    const N = 500;
    const truePos = [3, 7];
    let particles = particleFilterInit([[-5, 15], [-5, 15]], N, 42);
    const rng = createRNG(42);
    const config = { numParticles: N, resampleThreshold: 0.5 };

    const dynamics = (state: number[], rng: () => number) => [
      state[0] + 0.2 * (rng() - 0.5),
      state[1] + 0.2 * (rng() - 0.5),
    ];
    const likelihood = (state: number[], meas: number[]) => {
      const dx = state[0] - meas[0];
      const dy = state[1] - meas[1];
      return -0.5 * (dx * dx + dy * dy);
    };

    for (let i = 0; i < 30; i++) {
      const result = particleFilterStep(
        particles, truePos, dynamics, likelihood, rng, config,
      );
      particles = result.particles;
    }

    const est = particleFilterEstimate(particles);
    expect(est[0]).toBeCloseTo(truePos[0], 0);
    expect(est[1]).toBeCloseTo(truePos[1], 0);
  });
});
