/**
 * Tests for Newton's method optimization.
 *
 * Verifies convergence, quadratic convergence rate, modified Newton
 * regularization, and edge cases.
 *
 * @contract newton.test.ts
 * @provenance mathematical-definition — test function minima: sphere→(0,0),
 *   booth→(1,3), rosenbrock→(1,1), beale→(3,0.5), goldstein-price→(0,-1) f=3
 * @provenance Optim.jl v2.0.0 Newton(; linesearch=HagerZhang()), verified 2026-02-02 —
 *   6 test functions cross-validated, all converge to same minima
 * @provenance Nocedal & Wright, Numerical Optimization, 2nd ed., Ch. 3.3 (Newton's method),
 *   §3.4 (modified Newton with Cholesky regularization)
 */

import { describe, test, expect } from "bun:test";
import { newton } from "./newton";
import {
  sphere, booth, rosenbrock, beale, himmelblau, goldsteinPrice,
} from "./test-functions";

// Analytic Hessians for test functions
const sphereHessian = (_x: number[]) => [[2, 0], [0, 2]];

const boothHessian = (_x: number[]) => [[10, 8], [8, 10]];

const rosenbrockHessian = (x: number[]) => [
  [1200 * x[0] * x[0] - 400 * x[1] + 2, -400 * x[0]],
  [-400 * x[0], 200],
];

describe("newton: basic convergence with analytic Hessian", () => {
  test("converges on Sphere from [5, 5]", () => {
    const result = newton(sphere.f, [5, 5], sphere.gradient, sphereHessian);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-14);
    expect(result.iterations).toBeLessThanOrEqual(2); // quadratic convergence
  });

  test("converges on Booth from [0, 0]", () => {
    const result = newton(booth.f, [0, 0], booth.gradient, boothHessian);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-7);
    expect(Math.abs(result.x[1] - 3)).toBeLessThan(1e-7);
  });

  test("converges on Rosenbrock from [-1.2, 1.0]", () => {
    const result = newton(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, rosenbrockHessian);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-4);
    expect(Math.abs(result.x[1] - 1)).toBeLessThan(1e-4);
  });
});

describe("newton: convergence with finite-diff Hessian", () => {
  test("converges on Sphere without analytic Hessian", () => {
    const result = newton(sphere.f, [5, 5], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-12);
  });

  test("converges on Booth without analytic Hessian", () => {
    const result = newton(booth.f, [0, 0], booth.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-5);
    expect(Math.abs(result.x[1] - 3)).toBeLessThan(1e-5);
  });

  test("converges on Rosenbrock without analytic Hessian", () => {
    const result = newton(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
  });
});

describe("newton: without gradient (double finite-diff)", () => {
  test("converges on Sphere without gradient or Hessian", () => {
    const result = newton(sphere.f, [5, 5]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });
});

describe("newton: all test functions", () => {
  test("converges on Beale", () => {
    const result = newton(beale.f, [0, 0], beale.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(1e-3);
    expect(Math.abs(result.x[1] - 0.5)).toBeLessThan(1e-3);
  });

  test("converges on Himmelblau", () => {
    const result = newton(himmelblau.f, [0, 0], himmelblau.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });

  test("converges on Goldstein-Price", () => {
    const result = newton(goldsteinPrice.f, [0, -0.5], goldsteinPrice.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.fun - 3)).toBeLessThan(1e-6);
  });
});

describe("newton: modified Newton (regularization)", () => {
  test("handles indefinite Hessian near saddle point", () => {
    // f(x,y) = x^2 - y^2 (saddle at origin)
    // But we start from [1, 0.1] where x>y, so it should minimize toward x-axis
    // Hessian = [[2, 0], [0, -2]] — indefinite!
    // Modified Newton adds tau*I to make it positive definite
    const f = (x: number[]) => x[0] * x[0] - x[1] * x[1];
    const grad = (x: number[]) => [2 * x[0], -2 * x[1]];
    const hess = (_x: number[]) => [[2, 0], [0, -2]];

    const result = newton(f, [1, 0.1], grad, hess, { maxIterations: 50 });
    // Should make progress despite indefinite Hessian
    expect(result.iterations).toBeGreaterThan(0);
  });

  test("regularization succeeds after multiple attempts", () => {
    // Hessian with a small negative eigenvalue
    const f = (x: number[]) => x[0] * x[0] - 0.001 * x[1] * x[1] + x[0] + x[1];
    const grad = (x: number[]) => [2 * x[0] + 1, -0.002 * x[1] + 1];
    const hess = (_x: number[]) => [[2, 0], [0, -0.002]]; // nearly PD

    const result = newton(f, [5, 5], grad, hess, {
      initialTau: 1e-8,
      maxIterations: 50,
    });
    expect(result.iterations).toBeGreaterThan(0);
  });
});

describe("newton: steepest descent fallback", () => {
  test("falls back to steepest descent when Newton direction ascends", () => {
    // A function where the Hessian solve gives an ascent direction
    // This can happen with an incorrect Hessian
    let callCount = 0;
    const f = (x: number[]) => x[0] * x[0] + x[1] * x[1];
    const grad = (x: number[]) => [2 * x[0], 2 * x[1]];
    const badHess = (_x: number[]) => {
      callCount++;
      // Return negative definite Hessian sometimes
      if (callCount <= 1) return [[-2, 0], [0, -2]];
      return [[2, 0], [0, 2]];
    };

    const result = newton(f, [5, 5], grad, badHess);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });
});

describe("newton: edge cases", () => {
  test("starting at minimum", () => {
    const result = newton(sphere.f, [0, 0], sphere.gradient, sphereHessian);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  test("max iterations reached", () => {
    const result = newton(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, rosenbrockHessian, {
      maxIterations: 2,
    });
    // May or may not converge in 2 Newton steps
    expect(result.iterations).toBeLessThanOrEqual(2);
  });

  test("1D problem", () => {
    const f = (x: number[]) => (x[0] - 3) * (x[0] - 3);
    const grad = (x: number[]) => [2 * (x[0] - 3)];
    const hess = (_x: number[]) => [[2]];
    const result = newton(f, [10], grad, hess);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(1e-10);
    expect(result.iterations).toBeLessThanOrEqual(2);
  });

  test("tracks function and gradient calls", () => {
    const result = newton(sphere.f, [5, 5], sphere.gradient, sphereHessian);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("line search failure returns gracefully", () => {
    // A function where the Newton direction exists but line search fails
    const f = (x: number[]) => Math.sin(x[0] * 100) + x[0] * x[0];
    const grad = (x: number[]) => [100 * Math.cos(x[0] * 100) + 2 * x[0]];
    const hess = (x: number[]) => [[-10000 * Math.sin(x[0] * 100) + 2]];
    const result = newton(f, [0.5], grad, hess, { maxIterations: 100 });
    expect(result.iterations).toBeGreaterThan(0);
  });

  test("regularization failure returns when maxRegularize=0", () => {
    // Indefinite Hessian + maxRegularize=0 → Cholesky fails, no retry
    const f = (x: number[]) => x[0] * x[0] - x[1] * x[1];
    const grad = (x: number[]) => [2 * x[0], -2 * x[1]];
    const hess = (_x: number[]) => [[2, 0], [0, -2]];
    const result = newton(f, [1, 1], grad, hess, { maxRegularize: 0 });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("regularization failed");
  });

  test("regularization loop retries with increasing tau", () => {
    // Hessian with large negative eigenvalue needs many attempts
    const f = (x: number[]) => 0.5 * x[0] * x[0] - 500000 * x[1] * x[1];
    const grad = (x: number[]) => [x[0], -1000000 * x[1]];
    const hess = (_x: number[]) => [[1, 0], [0, -1000000]];
    const result = newton(f, [5, 0.001], grad, hess, { maxIterations: 10 });
    expect(result.iterations).toBeGreaterThan(0);
  });

  test("post-loop max iterations return", () => {
    // Use maxIterations=1 with very strict tolerances
    const result = newton(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, rosenbrockHessian, {
      maxIterations: 1,
      gradTol: 1e-15,
      stepTol: 1e-15,
      funcTol: 1e-15,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });

  test("converges via step tolerance", () => {
    // Use Rosenbrock near the minimum — Newton oscillates with small steps
    // but gradient stays relatively large due to the curved valley.
    // stepTol=1 is very loose so it triggers before gradTol.
    const result = newton(rosenbrock.f, [0.99, 0.98], rosenbrock.gradient, rosenbrockHessian, {
      gradTol: 1e-30, // won't trigger
      stepTol: 1,     // very loose — triggers on first small step
      funcTol: 1e-30,
    });
    expect(result.converged).toBe(true);
    expect(result.message).toContain("step size");
  });

  test("converges via function change tolerance", () => {
    // Use Rosenbrock near the minimum where function changes are small
    // but gradient is still nonzero.
    const result = newton(rosenbrock.f, [0.99, 0.98], rosenbrock.gradient, rosenbrockHessian, {
      gradTol: 1e-30, // won't trigger
      stepTol: 1e-30, // won't trigger
      funcTol: 1,     // very loose — triggers on first iteration
    });
    expect(result.converged).toBe(true);
    expect(result.message).toContain("function change");
  });
});
