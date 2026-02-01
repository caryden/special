import { describe, test, expect } from "bun:test";
import { nelderMead } from "./nelder-mead";
import { sphere, booth, rosenbrock, beale, himmelblau, himmelblauMinima } from "./test-functions";
import { norm } from "./vec-ops";

describe("nelderMead", () => {
  /**
   * @provenance mathematical-definition
   * Sphere minimum at origin. Trivial for any optimizer.
   */
  test("minimizes sphere function", () => {
    const result = nelderMead(sphere.f, sphere.startingPoint);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
    expect(result.x[0]).toBeCloseTo(0, 4);
    expect(result.x[1]).toBeCloseTo(0, 4);
    expect(result.gradientCalls).toBe(0);
  });

  /**
   * @provenance mathematical-definition
   * Booth minimum at (1, 3). Simple convex quadratic.
   */
  test("minimizes booth function", () => {
    const result = nelderMead(booth.f, booth.startingPoint);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
    expect(result.x[0]).toBeCloseTo(1, 3);
    expect(result.x[1]).toBeCloseTo(3, 3);
  });

  /**
   * @provenance optim.jl OptimTestProblems v2.0.0
   * Rosenbrock starting at [-1.2, 1.0]. NM typically converges but slowly.
   */
  test("minimizes rosenbrock from standard starting point", () => {
    const result = nelderMead(rosenbrock.f, rosenbrock.startingPoint, {
      maxIterations: 5000,
      funcTol: 1e-10,
      stepTol: 1e-10,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
    expect(result.x[0]).toBeCloseTo(1, 2);
    expect(result.x[1]).toBeCloseTo(1, 2);
  });

  /**
   * @provenance mathematical-definition
   * Beale minimum at (3, 0.5).
   */
  test("minimizes beale function", () => {
    const result = nelderMead(beale.f, beale.startingPoint, {
      maxIterations: 5000,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  /**
   * @provenance mathematical-definition (Himmelblau 1972)
   * Himmelblau from (0,0) should reach one of the four minima.
   */
  test("minimizes himmelblau to one of four minima", () => {
    const result = nelderMead(himmelblau.f, himmelblau.startingPoint, {
      maxIterations: 5000,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);

    // Check that result is close to one of the four known minima
    const closeToAny = himmelblauMinima.some(
      (min) => norm([result.x[0] - min[0], result.x[1] - min[1]]) < 0.01,
    );
    expect(closeToAny).toBe(true);
  });

  test("returns iteration count and function calls", () => {
    const result = nelderMead(sphere.f, [5, 5]);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBe(0);
  });

  test("respects maxIterations", () => {
    const result = nelderMead(rosenbrock.f, [-1.2, 1.0], {
      maxIterations: 5,
    });
    expect(result.iterations).toBeLessThanOrEqual(5);
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });

  test("custom simplex scale", () => {
    const result = nelderMead(sphere.f, [5, 5], {
      initialSimplexScale: 0.1,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
  });

  test("converges by step tolerance (simplex diameter)", () => {
    // Use a very generous stepTol so the simplex diameter check triggers
    const result = nelderMead(sphere.f, [0.01, 0.01], {
      stepTol: 1.0,     // very large — simplex diameter is ~0.05*0.01=0.0005, triggers immediately
      funcTol: 1e-30,   // disable func tolerance
    });
    expect(result.converged).toBe(true);
    expect(result.message).toContain("simplex diameter");
  });

  test("triggers shrink operation", () => {
    // Rastrigin: highly multimodal with many local bumps.
    // The bumps cause reflections and contractions to land on "hills",
    // forcing shrink when no contraction improves the worst vertex.
    const rastrigin = (x: number[]) =>
      20 + x[0] ** 2 + x[1] ** 2
      - 10 * (Math.cos(2 * Math.PI * x[0]) + Math.cos(2 * Math.PI * x[1]));
    const result = nelderMead(rastrigin, [3.5, 3.5], {
      maxIterations: 500,
      initialSimplexScale: 0.3,
    });
    // Should make progress even if not converging to global minimum
    expect(result.fun).toBeLessThan(rastrigin([3.5, 3.5]));
  });

  test("triggers outside contraction failure (shrink via fReflected < fWorst path)", () => {
    // Highly multimodal — with many starting points, we maximize chances of
    // hitting the outside contraction failure path where fContracted > fReflected.
    const rastrigin = (x: number[]) =>
      20 + x[0] ** 2 + x[1] ** 2
      - 10 * (Math.cos(2 * Math.PI * x[0]) + Math.cos(2 * Math.PI * x[1]));
    // Try multiple starting points to ensure both contraction paths are exercised
    const starts = [[1.2, 0.8], [2.7, 1.3], [0.3, 4.1], [4.5, 2.5]];
    for (const start of starts) {
      const result = nelderMead(rastrigin, start, {
        maxIterations: 200,
        initialSimplexScale: 0.4,
      });
      expect(result.fun).toBeLessThan(rastrigin(start));
    }
  });
});
