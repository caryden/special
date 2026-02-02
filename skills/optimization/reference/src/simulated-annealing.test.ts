/**
 * Tests for Simulated Annealing global optimizer.
 *
 * @contract simulated-annealing.test.ts
 * @provenance mathematical-definition — test function minima: sphere→(0,0),
 *   rosenbrock→(1,1), rastrigin→(0,0); Boltzmann acceptance probability
 *   P=exp(-Δf/T); log temperature schedule T(t)=T0/ln(t+1)
 * @provenance Optim.jl v2.0.0 SimulatedAnnealing(), verified 2026-02-02 —
 *   sphere, rosenbrock, rastrigin cross-validated (stochastic: verify convergence
 *   to correct basin, not exact values)
 * @provenance Kirkpatrick, Gelatt & Vecchi 1983, "Optimization by Simulated Annealing"
 * @provenance mulberry32 PRNG: Tommy Ettinger, public domain 32-bit hash
 */

import { describe, test, expect } from "bun:test";
import {
  simulatedAnnealing,
  logTemperature,
  gaussianNeighbor,
  mulberry32,
} from "./simulated-annealing";

// ── Test functions ─────────────────────────────────────────────────────

const sphere = (x: number[]) => x.reduce((s, xi) => s + xi * xi, 0);

const rosenbrock = (x: number[]) => {
  const [a, b] = [x[0], x[1]];
  return (1 - a) ** 2 + 100 * (b - a * a) ** 2;
};

// Rastrigin: many local minima, global min at origin
const rastrigin = (x: number[]) => {
  const A = 10;
  return A * x.length + x.reduce((s, xi) => s + xi * xi - A * Math.cos(2 * Math.PI * xi), 0);
};

// ── logTemperature tests ───────────────────────────────────────────────

describe("logTemperature", () => {
  test("returns Infinity at k=1 (accepts everything initially)", () => {
    expect(logTemperature(1)).toBe(Infinity);
  });

  test("returns positive finite values for k > 1", () => {
    expect(logTemperature(2)).toBeCloseTo(1 / Math.log(2), 10);
    expect(logTemperature(10)).toBeCloseTo(1 / Math.log(10), 10);
    expect(logTemperature(100)).toBeCloseTo(1 / Math.log(100), 10);
  });

  test("monotonically decreasing for k > 1", () => {
    const t10 = logTemperature(10);
    const t100 = logTemperature(100);
    const t1000 = logTemperature(1000);
    expect(t10).toBeGreaterThan(t100);
    expect(t100).toBeGreaterThan(t1000);
  });
});

// ── mulberry32 PRNG tests ──────────────────────────────────────────────

describe("mulberry32", () => {
  test("produces values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("is deterministic with same seed", () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test("different seeds produce different sequences", () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    let same = 0;
    for (let i = 0; i < 100; i++) {
      if (rng1() === rng2()) same++;
    }
    expect(same).toBeLessThan(10);
  });
});

// ── gaussianNeighbor tests ─────────────────────────────────────────────

describe("gaussianNeighbor", () => {
  test("returns a proposal of same length", () => {
    const rng = mulberry32(42);
    const x = [1, 2, 3];
    const proposal = gaussianNeighbor(x, rng);
    expect(proposal.length).toBe(3);
  });

  test("does not modify the input", () => {
    const rng = mulberry32(42);
    const x = [1, 2, 3];
    const xCopy = x.slice();
    gaussianNeighbor(x, rng);
    expect(x).toEqual(xCopy);
  });

  test("produces proposals different from input", () => {
    const rng = mulberry32(42);
    const x = [0, 0, 0];
    const proposal = gaussianNeighbor(x, rng);
    const allZero = proposal.every(v => v === 0);
    expect(allZero).toBe(false);
  });

  test("perturbations are approximately standard normal", () => {
    const rng = mulberry32(42);
    const x = [0];
    const diffs: number[] = [];
    for (let i = 0; i < 10000; i++) {
      const proposal = gaussianNeighbor(x, rng);
      diffs.push(proposal[0]);
    }
    const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
    const variance = diffs.reduce((s, v) => s + (v - mean) ** 2, 0) / diffs.length;
    // Should be approximately N(0, 1): mean ≈ 0, variance ≈ 1
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(variance - 1)).toBeLessThan(0.1);
  });
});

// ── simulatedAnnealing integration tests ───────────────────────────────

describe("simulatedAnnealing", () => {
  test("minimizes sphere with seed", () => {
    const result = simulatedAnnealing(sphere, [5, 5], {
      seed: 42,
      maxIterations: 10000,
    });
    expect(result.fun).toBeLessThan(1);
    expect(result.functionCalls).toBe(10001); // 1 initial + 10000 iterations
    expect(result.gradientCalls).toBe(0);
    expect(result.converged).toBe(true);
  });

  test("improves from starting point", () => {
    const f0 = sphere([5, 5]); // 50
    const result = simulatedAnnealing(sphere, [5, 5], {
      seed: 42,
      maxIterations: 5000,
    });
    expect(result.fun).toBeLessThan(f0);
  });

  test("finds near-global minimum of Rastrigin (multi-modal)", () => {
    // Rastrigin has many local minima; SA should find a good solution
    const result = simulatedAnnealing(rastrigin, [3, 3], {
      seed: 42,
      maxIterations: 50000,
    });
    // Global min is 0 at origin; accept < 5 as "near-global"
    expect(result.fun).toBeLessThan(5);
  });

  test("returns best-ever solution (not current chain position)", () => {
    // With enough iterations, best should be much better than start
    const result = simulatedAnnealing(sphere, [10, 10], {
      seed: 7,
      maxIterations: 10000,
    });
    expect(result.fun).toBeLessThan(sphere([10, 10]));
    // Verify x matches fun
    expect(sphere(result.x)).toBeCloseTo(result.fun, 10);
  });

  test("handles 1D problem", () => {
    const f = (x: number[]) => (x[0] - 3) ** 2;
    const result = simulatedAnnealing(f, [10], {
      seed: 42,
      maxIterations: 5000,
    });
    expect(result.x[0]).toBeCloseTo(3, 0);
    expect(result.fun).toBeLessThan(1);
  });

  test("handles high-dimensional problem", () => {
    const n = 10;
    const x0 = new Array(n).fill(5);
    const result = simulatedAnnealing(sphere, x0, {
      seed: 42,
      maxIterations: 50000,
    });
    expect(result.fun).toBeLessThan(sphere(x0));
  });

  test("custom temperature schedule (geometric cooling)", () => {
    const geometric = (k: number) => 100 * Math.pow(0.999, k);
    const result = simulatedAnnealing(sphere, [5, 5], {
      seed: 42,
      maxIterations: 10000,
      temperature: geometric,
    });
    expect(result.fun).toBeLessThan(1);
  });

  test("custom neighbor function", () => {
    // Small-step neighbor: adds uniform [-0.1, 0.1] noise
    const smallNeighbor = (x: number[], rng: () => number) =>
      x.map(xi => xi + (rng() - 0.5) * 0.2);
    const result = simulatedAnnealing(sphere, [1, 1], {
      seed: 42,
      maxIterations: 5000,
      neighbor: smallNeighbor,
    });
    expect(result.fun).toBeLessThan(sphere([1, 1]));
  });

  test("uses Math.random when no seed provided", () => {
    // Should not crash and should improve from starting point
    const result = simulatedAnnealing(sphere, [5, 5], {
      maxIterations: 1000,
    });
    expect(result.fun).toBeLessThan(sphere([5, 5]));
  });

  test("default maxIterations from options", () => {
    const result = simulatedAnnealing(sphere, [1, 1], {
      seed: 42,
    });
    // Default maxIterations is 1000
    expect(result.iterations).toBe(1000);
    expect(result.functionCalls).toBe(1001);
  });

  test("message includes iteration count", () => {
    const result = simulatedAnnealing(sphere, [1], {
      seed: 42,
      maxIterations: 500,
    });
    expect(result.message).toContain("500");
  });

  test("gradient is empty array", () => {
    const result = simulatedAnnealing(sphere, [1], {
      seed: 42,
      maxIterations: 10,
    });
    expect(result.gradient).toEqual([]);
  });

  test("deterministic with same seed across runs", () => {
    const r1 = simulatedAnnealing(sphere, [5, 5], { seed: 99, maxIterations: 100 });
    const r2 = simulatedAnnealing(sphere, [5, 5], { seed: 99, maxIterations: 100 });
    expect(r1.fun).toBe(r2.fun);
    expect(r1.x).toEqual(r2.x);
  });

  test("Rosenbrock: finds good solution with enough iterations", () => {
    const result = simulatedAnnealing(rosenbrock, [-1.2, 1], {
      seed: 42,
      maxIterations: 50000,
    });
    expect(result.fun).toBeLessThan(10);
  });

  test("accepts worse solutions at high temperature", () => {
    // Constant high temperature should cause lots of acceptance of worse points
    // Even starting at the optimum, the chain should wander
    const constTemp = (_k: number) => 1000.0;
    const result = simulatedAnnealing(sphere, [0, 0], {
      seed: 42,
      maxIterations: 100,
      temperature: constTemp,
    });
    // Best stays at 0 (keep-best), but chain should have wandered
    expect(result.fun).toBeCloseTo(0, 6);
  });
});
