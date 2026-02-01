import { describe, test, expect } from "bun:test";
import { bfgs } from "./bfgs";
import { sphere, booth, rosenbrock, beale, himmelblau, himmelblauMinima, goldsteinPrice } from "./test-functions";
import { norm } from "./vec-ops";

describe("bfgs", () => {
  /**
   * @provenance mathematical-definition
   * Sphere: trivial convex problem. BFGS should converge in ~1 step.
   */
  test("minimizes sphere with analytic gradient", () => {
    const result = bfgs(sphere.f, sphere.startingPoint, sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
    expect(result.x[0]).toBeCloseTo(0, 6);
    expect(result.x[1]).toBeCloseTo(0, 6);
    expect(result.iterations).toBeLessThan(20);
  });

  /**
   * @provenance mathematical-definition
   * Booth: convex quadratic, BFGS should converge very quickly.
   */
  test("minimizes booth with analytic gradient", () => {
    const result = bfgs(booth.f, booth.startingPoint, booth.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
    expect(result.x[0]).toBeCloseTo(1, 5);
    expect(result.x[1]).toBeCloseTo(3, 5);
  });

  /**
   * @provenance optim.jl OptimTestProblems v2.0.0
   * Rosenbrock from [-1.2, 1.0] — the standard test. BFGS should converge
   * but may need ~50-100 iterations due to the narrow valley.
   */
  test("minimizes rosenbrock from standard starting point", () => {
    const result = bfgs(rosenbrock.f, rosenbrock.startingPoint, rosenbrock.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
    expect(result.x[0]).toBeCloseTo(1, 4);
    expect(result.x[1]).toBeCloseTo(1, 4);
  });

  /**
   * @provenance mathematical-definition (Beale 1958)
   */
  test("minimizes beale function", () => {
    const result = bfgs(beale.f, beale.startingPoint, beale.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
    expect(result.x[0]).toBeCloseTo(3, 3);
    expect(result.x[1]).toBeCloseTo(0.5, 3);
  });

  /**
   * @provenance mathematical-definition (Himmelblau 1972)
   */
  test("minimizes himmelblau to one of four minima", () => {
    const result = bfgs(himmelblau.f, himmelblau.startingPoint, himmelblau.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);

    const closeToAny = himmelblauMinima.some(
      (min) => norm([result.x[0] - min[0], result.x[1] - min[1]]) < 0.01,
    );
    expect(closeToAny).toBe(true);
  });

  /**
   * @provenance mathematical-definition (Goldstein & Price 1971)
   * Minimum value is 3 (not 0).
   */
  test("minimizes goldstein-price", () => {
    const result = bfgs(goldsteinPrice.f, goldsteinPrice.startingPoint, goldsteinPrice.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(3, 4);
    expect(result.x[0]).toBeCloseTo(0, 3);
    expect(result.x[1]).toBeCloseTo(-1, 3);
  });

  /**
   * Without gradient — uses finite differences.
   * @provenance mathematical-definition
   */
  test("minimizes sphere without gradient (finite diff)", () => {
    const result = bfgs(sphere.f, sphere.startingPoint);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
    expect(result.x[0]).toBeCloseTo(0, 4);
    expect(result.x[1]).toBeCloseTo(0, 4);
  });

  test("minimizes rosenbrock without gradient (finite diff)", () => {
    // Finite-diff gradients become unreliable near the minimum, so the line
    // search may fail before reaching convergence. Check the value instead.
    const result = bfgs(rosenbrock.f, rosenbrock.startingPoint);
    expect(result.fun).toBeLessThan(1e-6);
    expect(result.x[0]).toBeCloseTo(1, 3);
    expect(result.x[1]).toBeCloseTo(1, 3);
  });

  test("returns gradient at solution", () => {
    const result = bfgs(sphere.f, [5, 5], sphere.gradient);
    expect(result.gradient).not.toBeNull();
    expect(result.gradient!.length).toBe(2);
    // Gradient should be near-zero at minimum
    expect(Math.abs(result.gradient![0])).toBeLessThan(1e-6);
    expect(Math.abs(result.gradient![1])).toBeLessThan(1e-6);
  });

  test("respects maxIterations", () => {
    const result = bfgs(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 3,
    });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  test("reports function and gradient call counts", () => {
    const result = bfgs(sphere.f, [5, 5], sphere.gradient);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("converges immediately if already at minimum", () => {
    const result = bfgs(sphere.f, [0, 0], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
    expect(result.fun).toBe(0);
  });

  test("hits maxIterations on difficult problem without convergence", () => {
    // Use a very tight tolerance and very few iterations
    const result = bfgs(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 2,
      gradTol: 1e-30,
      stepTol: 1e-30,
      funcTol: 1e-30,
    });
    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(2);
    expect(result.message).toContain("maximum iterations");
  });

  test("falls through loop with maxIterations=0", () => {
    const result = bfgs(sphere.f, [5, 5], sphere.gradient, {
      maxIterations: 0,
    });
    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(0);
    expect(result.message).toContain("maximum iterations");
  });
});
