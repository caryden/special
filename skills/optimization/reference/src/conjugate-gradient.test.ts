/**
 * Tests for nonlinear Conjugate Gradient (Hager-Zhang variant).
 *
 * Verifies convergence on standard test functions, cross-validates
 * against Optim.jl CG results, and exercises edge cases.
 *
 * @contract conjugate-gradient.test.ts
 */

import { describe, test, expect } from "bun:test";
import { conjugateGradient } from "./conjugate-gradient";
import {
  sphere, booth, rosenbrock, beale, himmelblau, goldsteinPrice,
} from "./test-functions";

describe("conjugate-gradient: basic convergence", () => {
  test("converges on Sphere from [5, 5]", () => {
    const result = conjugateGradient(sphere.f, [5, 5], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-14);
    expect(Math.abs(result.x[0])).toBeLessThan(1e-7);
    expect(Math.abs(result.x[1])).toBeLessThan(1e-7);
  });

  test("converges on Booth from [0, 0]", () => {
    const result = conjugateGradient(booth.f, [0, 0], booth.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-6);
    expect(Math.abs(result.x[1] - 3)).toBeLessThan(1e-6);
  });

  test("converges on Rosenbrock from [-1.2, 1.0]", () => {
    const result = conjugateGradient(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-4);
    expect(Math.abs(result.x[1] - 1)).toBeLessThan(1e-4);
  });

  test("converges on Beale from [0, 0]", () => {
    const result = conjugateGradient(beale.f, [0, 0], beale.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(1e-4);
    expect(Math.abs(result.x[1] - 0.5)).toBeLessThan(1e-4);
  });

  test("converges on Himmelblau from [0, 0]", () => {
    const result = conjugateGradient(himmelblau.f, [0, 0], himmelblau.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });

  test("converges on Goldstein-Price from [0, -0.5]", () => {
    const result = conjugateGradient(goldsteinPrice.f, [0, -0.5], goldsteinPrice.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.fun - 3)).toBeLessThan(1e-6);
    expect(Math.abs(result.x[0] - 0)).toBeLessThan(1e-4);
    expect(Math.abs(result.x[1] + 1)).toBeLessThan(1e-4);
  });
});

describe("conjugate-gradient: without gradient (finite differences)", () => {
  test("converges on Sphere without analytic gradient", () => {
    const result = conjugateGradient(sphere.f, [5, 5]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });

  test("converges on Booth without analytic gradient", () => {
    const result = conjugateGradient(booth.f, [0, 0]);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-4);
    expect(Math.abs(result.x[1] - 3)).toBeLessThan(1e-4);
  });
});

describe("conjugate-gradient: result tracking", () => {
  test("tracks function and gradient calls", () => {
    const result = conjugateGradient(sphere.f, [5, 5], sphere.gradient);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
    expect(result.iterations).toBeGreaterThan(0);
  });

  test("returns gradient at solution", () => {
    const result = conjugateGradient(sphere.f, [5, 5], sphere.gradient);
    expect(result.gradient).toBeDefined();
    expect(result.gradient!.length).toBe(2);
    // At optimum, gradient should be near zero
    expect(Math.abs(result.gradient![0])).toBeLessThan(1e-7);
    expect(Math.abs(result.gradient![1])).toBeLessThan(1e-7);
  });
});

describe("conjugate-gradient: options", () => {
  test("respects custom maxIterations", () => {
    const result = conjugateGradient(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 5,
    });
    expect(result.iterations).toBeLessThanOrEqual(5);
    // Rosenbrock with only 5 iterations won't converge fully
    expect(result.converged).toBe(false);
  });

  test("custom eta parameter", () => {
    const result = conjugateGradient(sphere.f, [5, 5], sphere.gradient, {
      eta: 0.01,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-14);
  });

  test("custom restartInterval", () => {
    // Restart every iteration = steepest descent behavior
    const result = conjugateGradient(sphere.f, [5, 5], sphere.gradient, {
      restartInterval: 1,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-14);
  });
});

describe("conjugate-gradient: edge cases", () => {
  test("starting at minimum returns immediately", () => {
    // Sphere minimum at [0, 0]
    const result = conjugateGradient(sphere.f, [0, 0], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
    expect(result.fun).toBe(0);
  });

  test("works on 1D problem", () => {
    const f = (x: number[]) => (x[0] - 3) * (x[0] - 3);
    const grad = (x: number[]) => [2 * (x[0] - 3)];
    const result = conjugateGradient(f, [10], grad);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(1e-7);
  });

  test("works on higher-dimensional problem", () => {
    // 5D sphere
    const f = (x: number[]) => x.reduce((s, xi) => s + xi * xi, 0);
    const grad = (x: number[]) => x.map(xi => 2 * xi);
    const result = conjugateGradient(f, [1, 2, 3, 4, 5], grad);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-14);
  });
});

describe("conjugate-gradient: cross-validation with Optim.jl", () => {
  test("Sphere: converges in similar iterations to Optim.jl (1)", () => {
    const result = conjugateGradient(sphere.f, [5, 5], sphere.gradient);
    // Optim.jl CG: 1 iteration
    expect(result.iterations).toBeLessThanOrEqual(5);
    expect(result.fun).toBeLessThan(1e-14);
  });

  test("Rosenbrock: reaches same minimum as Optim.jl", () => {
    const result = conjugateGradient(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient);
    // Optim.jl CG: fun ≈ 5.7e-17, iter ≈ 37
    expect(result.fun).toBeLessThan(1e-8);
    expect(result.converged).toBe(true);
  });

  test("Booth: reaches same minimum as Optim.jl", () => {
    const result = conjugateGradient(booth.f, [0, 0], booth.gradient);
    // Optim.jl CG: fun ≈ 1.2e-27, iter ≈ 9
    expect(result.fun).toBeLessThan(1e-14);
    expect(result.converged).toBe(true);
  });
});

describe("conjugate-gradient: failure and restart paths", () => {
  test("line search failure returns gracefully", () => {
    // A function with a descent direction that the line search can't handle:
    // linear function with very limited line search iterations
    let callCount = 0;
    const f = (x: number[]) => { callCount++; return -x[0]; };
    const grad = (_x: number[]) => [-1];
    // CG will try to minimize -x, which is unbounded below.
    // The HZ line search will eventually fail or exhaust bracket expansion.
    const result = conjugateGradient(f, [0], grad, {
      maxIterations: 3,
    });
    // Should stop — either line search failure or max iterations
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  test("max iterations reached with slow convergence", () => {
    // Rosenbrock converges slowly with limited iterations
    const result = conjugateGradient(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 2,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
    expect(result.iterations).toBe(2);
  });

  test("descent direction restart when conjugacy lost", () => {
    // Force the descent restart by providing an inconsistent gradient
    // that causes beta to produce a non-descent direction.
    // Use a gradient that flips sign inconsistently between iterations.
    let callNum = 0;
    const f = (x: number[]) => x[0] * x[0];
    const badGrad = (x: number[]) => {
      callNum++;
      // Every 4th gradient call, return a reversed gradient direction
      // This simulates a noisy gradient that can cause conjugacy loss
      if (callNum % 4 === 0) {
        return [-2 * x[0] + 100]; // wrong direction component
      }
      return [2 * x[0]];
    };
    const result = conjugateGradient(f, [5], badGrad, {
      maxIterations: 20,
      eta: 100, // large eta to weaken the descent guarantee
    });
    // Should make some progress even with restarts
    expect(result.iterations).toBeGreaterThan(0);
  });
});
