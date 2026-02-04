import { test, expect, describe } from "bun:test";
import { nelderMead } from "./nelder-mead";

// Test functions from spec

/**
 * Sphere function: f(x) = x1^2 + x2^2 + ...
 * Global minimum: f(0, 0, ...) = 0
 */
function sphere(x: number[]): number {
  return x.reduce((sum, xi) => sum + xi * xi, 0);
}

/**
 * Booth function: f(x, y) = (x + 2y - 7)^2 + (2x + y - 5)^2
 * Global minimum: f(1, 3) = 0
 */
function booth(x: number[]): number {
  const [x1, x2] = x;
  return (x1 + 2 * x2 - 7) ** 2 + (2 * x1 + x2 - 5) ** 2;
}

/**
 * Beale function: f(x, y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
 * Global minimum: f(3, 0.5) = 0
 */
function beale(x: number[]): number {
  const [x1, x2] = x;
  return (
    (1.5 - x1 + x1 * x2) ** 2 +
    (2.25 - x1 + x1 * x2 ** 2) ** 2 +
    (2.625 - x1 + x1 * x2 ** 3) ** 2
  );
}

/**
 * Rosenbrock function: f(x, y) = (1 - x)^2 + 100(y - x^2)^2
 * Global minimum: f(1, 1) = 0
 */
function rosenbrock(x: number[]): number {
  const [x1, x2] = x;
  return (1 - x1) ** 2 + 100 * (x2 - x1 ** 2) ** 2;
}

/**
 * Himmelblau function: f(x, y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
 * Four global minima at (3, 2), (-2.805, 3.131), (-3.779, -3.283), (3.584, -1.848)
 */
function himmelblau(x: number[]): number {
  const [x1, x2] = x;
  return (x1 ** 2 + x2 - 11) ** 2 + (x1 + x2 ** 2 - 7) ** 2;
}

/**
 * Goldstein-Price function
 * Global minimum: f(0, -1) = 3
 */
function goldsteinPrice(x: number[]): number {
  const [x1, x2] = x;
  const a =
    1 +
    (x1 + x2 + 1) ** 2 *
      (19 - 14 * x1 + 3 * x1 ** 2 - 14 * x2 + 6 * x1 * x2 + 3 * x2 ** 2);
  const b =
    30 +
    (2 * x1 - 3 * x2) ** 2 *
      (18 - 32 * x1 + 12 * x1 ** 2 + 48 * x2 - 36 * x1 * x2 + 27 * x2 ** 2);
  return a * b;
}

describe("nelder-mead", () => {
  test("sphere function from [5, 5]", () => {
    const result = nelderMead(sphere, [5, 5]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
    expect(Math.abs(result.x[0])).toBeLessThan(1e-3);
    expect(Math.abs(result.x[1])).toBeLessThan(1e-3);
  });

  test("booth function from [0, 0]", () => {
    const result = nelderMead(booth, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-3);
    expect(Math.abs(result.x[1] - 3)).toBeLessThan(1e-3);
  });

  test("beale function from [0, 0]", () => {
    const result = nelderMead(beale, [0, 0], { maxIterations: 5000 });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("rosenbrock function from [-1.2, 1.0]", () => {
    const result = nelderMead(rosenbrock, [-1.2, 1.0], {
      maxIterations: 5000,
      funcTol: 1e-12,
      stepTol: 1e-12,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-2);
    expect(Math.abs(result.x[1] - 1)).toBeLessThan(1e-2);
  });

  test("himmelblau function from [0, 0]", () => {
    const result = nelderMead(himmelblau, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
    // Should converge to one of the four known minima
    // Most likely (3, 2) from [0, 0]
  });

  test("goldstein-price function", () => {
    // Use starting point closer to global minimum at (0, -1)
    const result = nelderMead(goldsteinPrice, [0, -0.5]);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.fun - 3.0)).toBeLessThan(0.01);
    expect(Math.abs(result.x[0] - 0)).toBeLessThan(0.1);
    expect(Math.abs(result.x[1] - (-1))).toBeLessThan(0.1);
  });

  test("respects maxIterations limit", () => {
    const result = nelderMead(rosenbrock, [-1.2, 1.0], { maxIterations: 5 });
    expect(result.iterations).toBeLessThanOrEqual(5);
    expect(result.converged).toBe(false);
  });

  test("gradientCalls always 0", () => {
    const result = nelderMead(sphere, [5, 5]);
    expect(result.gradientCalls).toBe(0);
  });

  test("gradient field is null", () => {
    const result = nelderMead(sphere, [5, 5]);
    expect(result.gradient).toBe(null);
  });
});
