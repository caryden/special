import { describe, test, expect } from "bun:test";
import { gradientDescent } from "./gradient-descent";
import { sphere, booth, rosenbrock } from "./test-functions";

describe("gradientDescent", () => {
  /**
   * @provenance mathematical-definition
   * Sphere: GD should converge quickly (well-conditioned).
   */
  test("minimizes sphere with analytic gradient", () => {
    const result = gradientDescent(sphere.f, sphere.startingPoint, sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
    expect(result.x[0]).toBeCloseTo(0, 6);
    expect(result.x[1]).toBeCloseTo(0, 6);
  });

  /**
   * @provenance mathematical-definition
   */
  test("minimizes booth with analytic gradient", () => {
    const result = gradientDescent(booth.f, booth.startingPoint, booth.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
    expect(result.x[0]).toBeCloseTo(1, 4);
    expect(result.x[1]).toBeCloseTo(3, 4);
  });

  /**
   * @provenance optim.jl OptimTestProblems v2.0.0
   * Rosenbrock: GD is slow due to ill-conditioning. May not converge
   * within default 1000 iterations — use higher limit.
   */
  test("makes progress on rosenbrock (may need many iterations)", () => {
    const result = gradientDescent(rosenbrock.f, rosenbrock.startingPoint, rosenbrock.gradient, {
      maxIterations: 10000,
    });
    // GD on rosenbrock is very slow — we just check it reduces the function value
    expect(result.fun).toBeLessThan(rosenbrock.f(rosenbrock.startingPoint));
  });

  test("minimizes sphere without gradient (finite diff)", () => {
    const result = gradientDescent(sphere.f, sphere.startingPoint);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
  });

  test("respects maxIterations", () => {
    const result = gradientDescent(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 5,
    });
    expect(result.iterations).toBeLessThanOrEqual(5);
  });

  test("reports function and gradient call counts", () => {
    const result = gradientDescent(sphere.f, [5, 5], sphere.gradient);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("converges immediately if already at minimum", () => {
    const result = gradientDescent(sphere.f, [0, 0], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  test("hits maxIterations with impossible tolerance", () => {
    const result = gradientDescent(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, {
      maxIterations: 2,
      gradTol: 1e-30,
      stepTol: 1e-30,
      funcTol: 1e-30,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });

  test("handles line search failure gracefully", () => {
    // Provide an inverted gradient so d = -grad points uphill → line search fails
    const wrongGrad = (x: number[]) => x.map((v) => -v);
    const result = gradientDescent(sphere.f, [5, 5], wrongGrad);
    expect(result.converged).toBe(false);
    expect(result.message).toContain("line search failed");
  });

  test("falls through loop with maxIterations=0", () => {
    const result = gradientDescent(sphere.f, [5, 5], sphere.gradient, {
      maxIterations: 0,
    });
    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(0);
    expect(result.message).toContain("maximum iterations");
  });
});
