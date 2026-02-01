import { describe, test, expect } from "bun:test";
import { forwardDiffGradient, centralDiffGradient, makeGradient } from "./finite-diff";
import { rosenbrock, sphere, beale } from "./test-functions";

describe("forwardDiffGradient", () => {
  /**
   * @provenance mathematical-definition
   * Sphere gradient at [3, 4] is [6, 8].
   */
  test("sphere gradient at [3, 4]", () => {
    const grad = forwardDiffGradient(sphere.f, [3, 4]);
    expect(grad[0]).toBeCloseTo(6, 5);
    expect(grad[1]).toBeCloseTo(8, 5);
  });

  /**
   * @provenance mathematical-definition
   * Sphere gradient at origin is [0, 0].
   */
  test("sphere gradient at origin", () => {
    const grad = forwardDiffGradient(sphere.f, [0, 0]);
    expect(Math.abs(grad[0])).toBeLessThan(1e-7);
    expect(Math.abs(grad[1])).toBeLessThan(1e-7);
  });

  /**
   * @provenance mathematical-definition
   * Rosenbrock gradient at (1,1) is (0, 0) — the minimum.
   */
  test("rosenbrock gradient at minimum is near-zero", () => {
    const grad = forwardDiffGradient(rosenbrock.f, [1, 1]);
    expect(Math.abs(grad[0])).toBeLessThan(1e-5);
    expect(Math.abs(grad[1])).toBeLessThan(1e-5);
  });

  /**
   * @provenance mathematical-definition
   * Rosenbrock gradient at [-1.2, 1.0]:
   *   df/dx1 = -2*(1-(-1.2)) + 200*(1.0 - 1.44)*(-2*(-1.2)) = -4.4 + 200*(-0.44)*(2.4) = -4.4 - 211.2 = -215.6
   *   df/dx2 = 200*(1.0 - 1.44) = 200*(-0.44) = -88
   */
  test("rosenbrock gradient at starting point", () => {
    const grad = forwardDiffGradient(rosenbrock.f, [-1.2, 1.0]);
    const analyticGrad = rosenbrock.gradient([-1.2, 1.0]);
    expect(grad[0]).toBeCloseTo(analyticGrad[0], 3);
    expect(grad[1]).toBeCloseTo(analyticGrad[1], 3);
  });

  test("beale gradient matches analytic at [1, 0.25]", () => {
    const numeric = forwardDiffGradient(beale.f, [1, 0.25]);
    const analytic = beale.gradient([1, 0.25]);
    expect(numeric[0]).toBeCloseTo(analytic[0], 3);
    expect(numeric[1]).toBeCloseTo(analytic[1], 3);
  });

  test("does not mutate input", () => {
    const x = [3, 4];
    forwardDiffGradient(sphere.f, x);
    expect(x).toEqual([3, 4]);
  });
});

describe("centralDiffGradient", () => {
  /**
   * Central differences should be more accurate than forward.
   * @provenance mathematical-definition
   */
  test("sphere gradient at [3, 4] — higher accuracy", () => {
    const grad = centralDiffGradient(sphere.f, [3, 4]);
    expect(grad[0]).toBeCloseTo(6, 8);
    expect(grad[1]).toBeCloseTo(8, 8);
  });

  test("rosenbrock gradient at starting point — higher accuracy", () => {
    const grad = centralDiffGradient(rosenbrock.f, [-1.2, 1.0]);
    const analyticGrad = rosenbrock.gradient([-1.2, 1.0]);
    expect(grad[0]).toBeCloseTo(analyticGrad[0], 5);
    expect(grad[1]).toBeCloseTo(analyticGrad[1], 5);
  });

  test("beale gradient at minimum is near-zero", () => {
    const grad = centralDiffGradient(beale.f, [3, 0.5]);
    expect(Math.abs(grad[0])).toBeLessThan(1e-8);
    expect(Math.abs(grad[1])).toBeLessThan(1e-8);
  });

  test("does not mutate input", () => {
    const x = [3, 4];
    centralDiffGradient(sphere.f, x);
    expect(x).toEqual([3, 4]);
  });
});

describe("makeGradient", () => {
  test("default is forward differences", () => {
    const grad = makeGradient(sphere.f);
    const result = grad([3, 4]);
    expect(result[0]).toBeCloseTo(6, 5);
    expect(result[1]).toBeCloseTo(8, 5);
  });

  test("central option", () => {
    const grad = makeGradient(sphere.f, "central");
    const result = grad([3, 4]);
    expect(result[0]).toBeCloseTo(6, 8);
    expect(result[1]).toBeCloseTo(8, 8);
  });
});
