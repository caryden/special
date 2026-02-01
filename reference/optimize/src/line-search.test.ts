import { describe, test, expect } from "bun:test";
import { backtrackingLineSearch, wolfeLineSearch } from "./line-search";
import { sphere, rosenbrock } from "./test-functions";
import { dot, negate, scale } from "./vec-ops";

describe("backtrackingLineSearch", () => {
  /**
   * @provenance mathematical-definition
   * Sphere: f(x) = x1^2 + x2^2, grad = [2*x1, 2*x2].
   * At [10, 10], steepest descent direction is [-20, -20].
   * With alpha=1: x_new = [10-20, 10-20] = [-10, -10], f = 200 (same as before).
   * Backtracking should find a smaller alpha that decreases f.
   */
  test("finds step that decreases sphere from [10, 10]", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx); // steepest descent

    const result = backtrackingLineSearch(sphere.f, x, d, fx, gx);

    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.functionCalls).toBeGreaterThan(0);
  });

  /**
   * @provenance mathematical-definition
   * For sphere, the optimal step along steepest descent from [10,10] is alpha=0.5
   * (since grad = [20,20], d = [-20,-20], and f(10-20a, 10-20a) = 2*(10-20a)^2
   * which minimizes at a=0.5). Backtracking with rho=0.5 starting at alpha=1
   * should find alpha=0.5 in one step.
   */
  test("sphere from [10, 10] finds alpha=0.5", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx);

    const result = backtrackingLineSearch(sphere.f, x, d, fx, gx);

    expect(result.alpha).toBeCloseTo(0.5, 5);
  });

  test("rosenbrock from starting point", () => {
    const x = [-1.2, 1.0];
    const fx = rosenbrock.f(x);
    const gx = rosenbrock.gradient(x);
    const d = negate(gx);

    const result = backtrackingLineSearch(rosenbrock.f, x, d, fx, gx);

    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("custom parameters", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx);

    const result = backtrackingLineSearch(sphere.f, x, d, fx, gx, {
      initialAlpha: 2.0,
      c1: 1e-3,
      rho: 0.8,
      maxIter: 50,
    });

    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("fails when direction is not descent (positive directional derivative)", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = gx; // ascending direction

    const result = backtrackingLineSearch(sphere.f, x, d, fx, gx);

    expect(result.success).toBe(false);
  });
});

describe("wolfeLineSearch", () => {
  /**
   * @provenance Nocedal & Wright, Numerical Optimization
   * Strong Wolfe conditions guarantee both sufficient decrease and curvature.
   */
  test("finds Wolfe point for sphere from [10, 10]", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx);
    const dg0 = dot(gx, d);

    const result = wolfeLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);

    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);

    // Verify Armijo condition
    expect(result.fNew).toBeLessThanOrEqual(fx + 1e-4 * result.alpha * dg0);

    // Verify curvature condition (strong Wolfe)
    if (result.gNew) {
      const dgNew = dot(result.gNew, d);
      expect(Math.abs(dgNew)).toBeLessThanOrEqual(0.9 * Math.abs(dg0) + 1e-10);
    }
  });

  test("finds Wolfe point for rosenbrock from starting point", () => {
    const x = [-1.2, 1.0];
    const fx = rosenbrock.f(x);
    const gx = rosenbrock.gradient(x);
    const d = negate(gx);

    const result = wolfeLineSearch(rosenbrock.f, rosenbrock.gradient, x, d, fx, gx);

    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("returns gradient at new point", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx);

    const result = wolfeLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);

    expect(result.gNew).not.toBeNull();
    expect(result.gNew!.length).toBe(2);
  });

  test("custom Wolfe parameters", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx);

    const result = wolfeLineSearch(sphere.f, sphere.gradient, x, d, fx, gx, {
      c1: 1e-3,
      c2: 0.1,  // stricter curvature condition
    });

    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("tracks function and gradient calls", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = negate(gx);

    const result = wolfeLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);

    expect(result.functionCalls).toBeGreaterThan(0);
    // Wolfe always evaluates gradient at least once
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("fails when direction is ascending (enters zoom, fails)", () => {
    const x = [10, 10];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = gx; // ascending direction — Wolfe conditions can never be met

    const result = wolfeLineSearch(sphere.f, sphere.gradient, x, d, fx, gx, {
      maxIter: 3,
    });

    expect(result.success).toBe(false);
  });

  test("exhausts max iterations without entering zoom", () => {
    // f(x) = -exp(-x): Armijo always satisfied (function strictly decreasing
    // along descent), but curvature condition never met (slope steepens).
    // dgNew stays negative and |dgNew| > 0.9*|dg0|, so no zoom entry.
    const expF = (x: number[]) => -Math.exp(-x[0]);
    const expGrad = (x: number[]) => [Math.exp(-x[0])];
    const x = [0];
    const fx = expF(x);
    const gx = expGrad(x);
    const d = [-1]; // descent direction

    const result = wolfeLineSearch(expF, expGrad, x, d, fx, gx, {
      maxIter: 5,
    });

    expect(result.success).toBe(false);
  });
});
