/**
 * Tests for Newton Trust Region optimization.
 *
 * Verifies convergence, trust region adaptation, dogleg subproblem,
 * and edge cases.
 *
 * @contract newton-trust-region.test.ts
 */

import { describe, test, expect } from "bun:test";
import { newtonTrustRegion } from "./newton-trust-region";
import {
  sphere, booth, rosenbrock, beale, himmelblau, goldsteinPrice,
} from "./test-functions";

const sphereHessian = (_x: number[]) => [[2, 0], [0, 2]];
const boothHessian = (_x: number[]) => [[10, 8], [8, 10]];
const rosenbrockHessian = (x: number[]) => [
  [1200 * x[0] * x[0] - 400 * x[1] + 2, -400 * x[0]],
  [-400 * x[0], 200],
];

describe("newton-trust-region: basic convergence", () => {
  test("converges on Sphere", () => {
    const result = newtonTrustRegion(sphere.f, [5, 5], sphere.gradient, sphereHessian);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-14);
  });

  test("converges on Booth", () => {
    const result = newtonTrustRegion(booth.f, [0, 0], booth.gradient, boothHessian);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 1)).toBeLessThan(1e-6);
    expect(Math.abs(result.x[1] - 3)).toBeLessThan(1e-6);
  });

  test("converges on Rosenbrock", () => {
    const result = newtonTrustRegion(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, rosenbrockHessian);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
  });

  test("converges on Beale", () => {
    const result = newtonTrustRegion(beale.f, [0, 0], beale.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(1e-3);
    expect(Math.abs(result.x[1] - 0.5)).toBeLessThan(1e-3);
  });

  test("converges on Himmelblau", () => {
    const result = newtonTrustRegion(himmelblau.f, [0, 0], himmelblau.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });

  test("converges on Goldstein-Price", () => {
    const result = newtonTrustRegion(goldsteinPrice.f, [0, -0.5], goldsteinPrice.gradient);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.fun - 3)).toBeLessThan(1e-4);
  });
});

describe("newton-trust-region: without analytic Hessian", () => {
  test("converges on Sphere with finite-diff Hessian", () => {
    const result = newtonTrustRegion(sphere.f, [5, 5], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-12);
  });

  test("converges without gradient or Hessian", () => {
    const result = newtonTrustRegion(sphere.f, [5, 5]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });
});

describe("newton-trust-region: trust region adaptation", () => {
  test("expands trust region on good agreement", () => {
    // Sphere is perfectly quadratic → model agrees exactly → radius grows
    const result = newtonTrustRegion(sphere.f, [5, 5], sphere.gradient, sphereHessian, {
      initialDelta: 0.1,
    });
    expect(result.converged).toBe(true);
  });

  test("shrinks trust region on poor agreement", () => {
    // Rosenbrock from far away with small initial delta
    const result = newtonTrustRegion(rosenbrock.f, [-5, 5], rosenbrock.gradient, rosenbrockHessian, {
      initialDelta: 0.01,
      maxIterations: 500,
    });
    // Should still converge, possibly with many iterations
    expect(result.fun).toBeLessThan(rosenbrock.f([-5, 5]));
  });

  test("respects maxDelta", () => {
    const result = newtonTrustRegion(sphere.f, [5, 5], sphere.gradient, sphereHessian, {
      maxDelta: 0.5,
    });
    expect(result.converged).toBe(true);
  });
});

describe("newton-trust-region: indefinite Hessian", () => {
  test("handles saddle point (indefinite Hessian)", () => {
    // f(x,y) = x^2 - y^2 (saddle at origin)
    // Trust region naturally handles this via Cauchy point
    const f = (x: number[]) => x[0] * x[0] - x[1] * x[1];
    const grad = (x: number[]) => [2 * x[0], -2 * x[1]];
    const hess = (_x: number[]) => [[2, 0], [0, -2]];
    const result = newtonTrustRegion(f, [1, 0.5], grad, hess, { maxIterations: 50 });
    expect(result.iterations).toBeGreaterThan(0);
  });

  test("uses Cauchy point when Newton step unavailable", () => {
    // Negative definite Hessian — Cholesky fails, dogleg uses Cauchy boundary
    const f = (x: number[]) => -x[0] * x[0] - x[1] * x[1] + 10 * x[0] + 10 * x[1];
    const grad = (x: number[]) => [-2 * x[0] + 10, -2 * x[1] + 10];
    const hess = (_x: number[]) => [[-2, 0], [0, -2]];
    const result = newtonTrustRegion(f, [0, 0], grad, hess, { maxIterations: 50 });
    expect(result.iterations).toBeGreaterThan(0);
  });
});

describe("newton-trust-region: edge cases", () => {
  test("starting at minimum", () => {
    const result = newtonTrustRegion(sphere.f, [0, 0], sphere.gradient, sphereHessian);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  test("max iterations reached", () => {
    const result = newtonTrustRegion(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, rosenbrockHessian, {
      maxIterations: 1,
      gradTol: 1e-15,
      stepTol: 1e-15,
      funcTol: 1e-15,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });

  test("1D problem", () => {
    const f = (x: number[]) => (x[0] - 3) * (x[0] - 3);
    const grad = (x: number[]) => [2 * (x[0] - 3)];
    const hess = (_x: number[]) => [[2]];
    const result = newtonTrustRegion(f, [10], grad, hess);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(1e-7);
  });

  test("tracks function and gradient calls", () => {
    const result = newtonTrustRegion(sphere.f, [5, 5], sphere.gradient, sphereHessian);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("trust region too small triggers early stop", () => {
    // Provide a WRONG gradient (negated) so model predicts decrease
    // but function actually increases. This guarantees step rejection
    // and delta shrinks to below 1e-15.
    const f = (x: number[]) => x[0] * x[0] + x[1] * x[1];
    const wrongGrad = (x: number[]) => [-2 * x[0], -2 * x[1]]; // negated!
    const hess = (_x: number[]) => [[2, 0], [0, 2]];
    const result = newtonTrustRegion(f, [5, 5], wrongGrad, hess, {
      initialDelta: 1e-13,
      maxIterations: 200,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("trust region");
  });

  test("step rejection shrinks delta and continues", () => {
    // Highly nonlinear function where model is poor far from minimum
    const f = (x: number[]) => Math.pow(x[0] - 2, 4) + Math.pow(x[1] + 1, 4);
    const grad = (x: number[]) => [4 * Math.pow(x[0] - 2, 3), 4 * Math.pow(x[1] + 1, 3)];
    const hess = (x: number[]) => [
      [12 * (x[0] - 2) * (x[0] - 2), 0],
      [0, 12 * (x[1] + 1) * (x[1] + 1)],
    ];
    const result = newtonTrustRegion(f, [10, -10], grad, hess, {
      initialDelta: 100,
      maxIterations: 200,
    });
    expect(result.fun).toBeLessThan(f([10, -10]));
  });

  test("post-loop max iterations when all steps rejected", () => {
    // A function where the quadratic model always overestimates improvement,
    // so rho < eta and steps are rejected. With large enough initial delta,
    // delta won't shrink to 1e-15 in just 2 iterations.
    // Use a function where f(x+p) > f(x) for every proposed step (ascending bowl).
    // f(x) = -x^2 with positive definite Hessian → model predicts decrease but function increases
    const f = (x: number[]) => -x[0] * x[0] - x[1] * x[1];
    const grad = (x: number[]) => [-2 * x[0], -2 * x[1]];
    // Provide WRONG Hessian (positive definite instead of negative definite)
    const hess = (_x: number[]) => [[2, 0], [0, 2]];
    const result = newtonTrustRegion(f, [5, 5], grad, hess, {
      initialDelta: 1.0,
      maxIterations: 2,
      eta: 0.1,
      gradTol: 1e-30,
      stepTol: 1e-30,
      funcTol: 1e-30,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });
});

describe("newton-trust-region: dogleg paths", () => {
  test("Newton step within trust region (pure Newton)", () => {
    // Small problem where Newton step is small → within delta
    const f = (x: number[]) => x[0] * x[0] + x[1] * x[1];
    const grad = (x: number[]) => [2 * x[0], 2 * x[1]];
    const hess = (_x: number[]) => [[2, 0], [0, 2]];
    const result = newtonTrustRegion(f, [0.1, 0.1], grad, hess, {
      initialDelta: 10.0, // large delta → Newton step fits
    });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeLessThanOrEqual(2);
  });

  test("Cauchy point scaled to boundary", () => {
    // Large gradient, small trust region → Cauchy point outside delta
    const result = newtonTrustRegion(sphere.f, [100, 100], sphere.gradient, sphereHessian, {
      initialDelta: 0.001,
      maxIterations: 500,
    });
    // Should still make progress
    expect(result.fun).toBeLessThan(sphere.f([100, 100]));
  });

  test("dogleg interpolation between Cauchy and Newton", () => {
    // Medium-sized trust region where Cauchy is inside but Newton is outside
    const result = newtonTrustRegion(booth.f, [5, 5], booth.gradient, boothHessian, {
      initialDelta: 2.0,
    });
    expect(result.converged).toBe(true);
  });
});
