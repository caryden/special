import { describe, test, expect } from "bun:test";
import { minimize } from "./minimize";
import { sphere, booth, rosenbrock, beale, himmelblau, himmelblauMinima, goldsteinPrice } from "./test-functions";
import { norm } from "./vec-ops";

describe("minimize — default method selection", () => {
  /**
   * @provenance API design: no gradient → nelder-mead (matches Optim.jl)
   */
  test("without gradient uses nelder-mead", () => {
    const result = minimize(sphere.f, sphere.startingPoint);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
    expect(result.gradientCalls).toBe(0); // NM doesn't use gradients
  });

  /**
   * @provenance API design: with gradient → bfgs
   */
  test("with gradient uses bfgs", () => {
    const result = minimize(sphere.f, sphere.startingPoint, {
      grad: sphere.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });
});

describe("minimize — explicit method selection", () => {
  test("nelder-mead on sphere", () => {
    const result = minimize(sphere.f, sphere.startingPoint, {
      method: "nelder-mead",
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
  });

  test("gradient-descent on sphere", () => {
    const result = minimize(sphere.f, sphere.startingPoint, {
      method: "gradient-descent",
      grad: sphere.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 8);
  });

  test("bfgs on rosenbrock", () => {
    const result = minimize(rosenbrock.f, rosenbrock.startingPoint, {
      method: "bfgs",
      grad: rosenbrock.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
    expect(result.x[0]).toBeCloseTo(1, 4);
    expect(result.x[1]).toBeCloseTo(1, 4);
  });

  test("l-bfgs on rosenbrock", () => {
    const result = minimize(rosenbrock.f, rosenbrock.startingPoint, {
      method: "l-bfgs",
      grad: rosenbrock.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });

  test("bfgs without gradient (uses finite diff)", () => {
    const result = minimize(sphere.f, sphere.startingPoint, {
      method: "bfgs",
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
  });

  test("conjugate-gradient on rosenbrock", () => {
    const result = minimize(rosenbrock.f, rosenbrock.startingPoint, {
      method: "conjugate-gradient",
      grad: rosenbrock.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
  });

  test("newton on sphere", () => {
    const result = minimize(sphere.f, sphere.startingPoint, {
      method: "newton",
      grad: sphere.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });

  test("newton-trust-region on sphere", () => {
    const result = minimize(sphere.f, sphere.startingPoint, {
      method: "newton-trust-region",
      grad: sphere.gradient,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-10);
  });
});

describe("minimize — all test functions with bfgs", () => {
  /**
   * @provenance mathematical-definition
   */
  test("sphere", () => {
    const result = minimize(sphere.f, sphere.startingPoint, { grad: sphere.gradient });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(sphere.minimumValue, 6);
  });

  test("booth", () => {
    const result = minimize(booth.f, booth.startingPoint, { grad: booth.gradient });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(booth.minimumValue, 6);
  });

  /**
   * @provenance optim.jl OptimTestProblems v2.0.0
   */
  test("rosenbrock", () => {
    const result = minimize(rosenbrock.f, rosenbrock.startingPoint, { grad: rosenbrock.gradient });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(rosenbrock.minimumValue, 6);
  });

  /**
   * @provenance mathematical-definition (Beale 1958)
   */
  test("beale", () => {
    const result = minimize(beale.f, beale.startingPoint, { grad: beale.gradient });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
  });

  /**
   * @provenance mathematical-definition (Himmelblau 1972)
   */
  test("himmelblau reaches one of four minima", () => {
    const result = minimize(himmelblau.f, himmelblau.startingPoint, { grad: himmelblau.gradient });
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
  test("goldstein-price (minimum value is 3)", () => {
    const result = minimize(goldsteinPrice.f, goldsteinPrice.startingPoint, { grad: goldsteinPrice.gradient });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(3, 4);
  });
});

describe("minimize — options forwarding", () => {
  test("maxIterations is respected", () => {
    const result = minimize(rosenbrock.f, [-1.2, 1.0], {
      method: "bfgs",
      grad: rosenbrock.gradient,
      maxIterations: 3,
    });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  test("custom gradTol", () => {
    const result = minimize(sphere.f, [5, 5], {
      grad: sphere.gradient,
      gradTol: 1e-4,
    });
    expect(result.converged).toBe(true);
  });
});
