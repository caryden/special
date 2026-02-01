import { describe, test, expect } from "bun:test";
import { lbfgs } from "./l-bfgs";
import { sphere, booth, rosenbrock, beale, himmelblau, himmelblauMinima, goldsteinPrice } from "./test-functions";
import { norm } from "./vec-ops";

describe("lbfgs", () => {
  /**
   * @provenance mathematical-definition
   */
  test("minimizes sphere with analytic gradient", () => {
    const result = lbfgs(sphere.f, sphere.startingPoint, sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
    expect(result.x[0]).toBeCloseTo(0, 6);
    expect(result.x[1]).toBeCloseTo(0, 6);
  });

  /**
   * @provenance mathematical-definition
   */
  test("minimizes booth with analytic gradient", () => {
    const result = lbfgs(booth.f, booth.startingPoint, booth.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
    expect(result.x[0]).toBeCloseTo(1, 5);
    expect(result.x[1]).toBeCloseTo(3, 5);
  });

  /**
   * @provenance optim.jl OptimTestProblems v2.0.0
   * L-BFGS should perform similarly to full BFGS on 2D problems.
   */
  test("minimizes rosenbrock from standard starting point", () => {
    const result = lbfgs(rosenbrock.f, rosenbrock.startingPoint, rosenbrock.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
    expect(result.x[0]).toBeCloseTo(1, 4);
    expect(result.x[1]).toBeCloseTo(1, 4);
  });

  /**
   * @provenance mathematical-definition (Beale 1958)
   */
  test("minimizes beale function", () => {
    const result = lbfgs(beale.f, beale.startingPoint, beale.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
  });

  /**
   * @provenance mathematical-definition (Himmelblau 1972)
   */
  test("minimizes himmelblau to one of four minima", () => {
    const result = lbfgs(himmelblau.f, himmelblau.startingPoint, himmelblau.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);

    const closeToAny = himmelblauMinima.some(
      (min) => norm([result.x[0] - min[0], result.x[1] - min[1]]) < 0.01,
    );
    expect(closeToAny).toBe(true);
  });

  /**
   * @provenance mathematical-definition (Goldstein & Price 1971)
   */
  test("minimizes goldstein-price", () => {
    const result = lbfgs(goldsteinPrice.f, goldsteinPrice.startingPoint, goldsteinPrice.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(3, 4);
  });

  test("minimizes sphere without gradient (finite diff)", () => {
    const result = lbfgs(sphere.f, sphere.startingPoint);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
  });

  test("minimizes rosenbrock without gradient (finite diff)", () => {
    // Finite-diff gradients become unreliable near the minimum, so the line
    // search may fail before formal convergence. Check the value instead.
    const result = lbfgs(rosenbrock.f, rosenbrock.startingPoint);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("custom memory parameter", () => {
    const result = lbfgs(rosenbrock.f, rosenbrock.startingPoint, rosenbrock.gradient, {
      memory: 3,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("respects maxIterations", () => {
    const result = lbfgs(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 3,
    });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  test("converges immediately if already at minimum", () => {
    const result = lbfgs(sphere.f, [0, 0], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
    expect(result.fun).toBe(0);
  });

  test("hits maxIterations with impossible tolerance", () => {
    const result = lbfgs(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 2,
      gradTol: 1e-30,
      stepTol: 1e-30,
      funcTol: 1e-30,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });

  test("falls through loop with maxIterations=0", () => {
    const result = lbfgs(sphere.f, [5, 5], sphere.gradient, {
      maxIterations: 0,
    });
    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(0);
    expect(result.message).toContain("maximum iterations");
  });
});
