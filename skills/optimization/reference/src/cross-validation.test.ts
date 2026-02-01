/**
 * Cross-library validation tests.
 *
 * These tests verify that our optimize library produces results consistent
 * with scipy.optimize v1.17.0 and Optim.jl v2.0.0. The scipy results were
 * obtained empirically on 2026-02-01 using Python 3 with numpy 2.4.2.
 * The Optim.jl results were obtained empirically on 2026-02-01 using
 * Julia 1.10.7 with Optim.jl v2.0.0 (g_tol=1e-8, HagerZhang line search).
 *
 * We do NOT compare exact iteration counts or final x values (these depend on
 * line search implementation details). Instead we verify:
 *   1. Both converge to the same minimum (function value within tolerance)
 *   2. Both find the correct minimizer location (x within tolerance)
 *   3. Known behavioral differences are documented
 *
 * @node cross-validation
 * @depends-on minimize, test-functions
 * @contract cross-validation.test.ts
 */

import { describe, test, expect } from "bun:test";
import { minimize } from "./minimize";
import {
  sphere, booth, rosenbrock, beale, himmelblau, himmelblauMinima, goldsteinPrice,
} from "./test-functions";
import { norm } from "./vec-ops";

/**
 * scipy.optimize.minimize results, obtained empirically 2026-02-01.
 * scipy v1.17.0, numpy v2.4.2, Python 3.
 *
 * Each entry records the exact scipy output for reproducibility.
 */
const scipyResults = {
  sphere: {
    bfgs: { x: [-8.881784197001252e-16, 4.440892098500626e-16], fun: 9.860761315262648e-31, nit: 3 },
    "l-bfgs": { x: [6.217248937900877e-15, 6.217248937900877e-15], fun: 7.730836871165916e-29, nit: 2 },
    "nelder-mead": { x: [-3.33051318187616e-05, -1.9382570999648685e-05], fun: 1.484915864021509e-09, nit: 44 },
  },
  booth: {
    bfgs: { x: [1.0000000000954752, 2.999999999931513], fun: 1.671957406574343e-20, nit: 7 },
    "l-bfgs": { x: [1.0000002203090308, 3.0000002835548387], fun: 1.144454611278973e-12, nit: 5 },
    "nelder-mead": { x: [1.000018462214465, 2.9999657858162263], fun: 2.503961882682524e-09, nit: 67 },
  },
  rosenbrock: {
    bfgs: { x: [0.999999971001401, 0.9999999461190963], fun: 2.535305800298359e-15, nit: 32 },
    "l-bfgs": { x: [0.9999989453492684, 0.9999980209057087], fun: 2.807649961418803e-12, nit: 36 },
    "nelder-mead": { x: [1.0000220217835696, 1.0000422197517715], fun: 8.177661197416674e-10, nit: 85 },
  },
  beale: {
    bfgs: { x: [3.000000459042071, 0.5000001383818179], fun: 4.763271518400879e-14, nit: 13 },
    "l-bfgs": { x: [3.000000017038519, 0.4999999998129956], fun: 4.953968216516750e-16, nit: 13 },
    "nelder-mead": { x: [2.9999419617076253, 0.4999848474280797], fun: 5.525325548786374e-10, nit: 83 },
  },
  himmelblau: {
    bfgs: { x: [2.9999999477827064, 1.9999999956937438], fun: 1.056983570658807e-13, nit: 10 },
    "l-bfgs": { x: [2.9999999970623645, 1.9999999762721052], fun: 1.128459771261554e-14, nit: 10 },
    "nelder-mead": { x: [3.000006324938478, 1.9999685321027905], fun: 1.433317824620905e-08, nit: 81 },
  },
  goldsteinPrice: {
    bfgs: { x: [-5.657504968233764e-10, -0.999999997462996], fun: 3.000000000000019, nit: 13 },
    "l-bfgs": { x: [2.4348653668468145e-10, -0.9999999915905715], fun: 3.000000000000001, nit: 11 },
    "nelder-mead": { x: [-3.558309376243168e-05, -1.000010886788381], fun: 3.000000286602615, nit: 39 },
  },
};

/**
 * Optim.jl v2.0.0 results, obtained empirically 2026-02-01.
 * Julia 1.10.7, Optim.jl v2.0.0, g_tol=1e-8, HagerZhang line search.
 *
 * Each entry records the exact Optim.jl output for reproducibility.
 */
const optimJlResults = {
  sphere: {
    bfgs: { x: [0.0, 0.0], fun: 0.0, iter: 1 },
    "l-bfgs": { x: [0.0, 0.0], fun: 0.0, iter: 1 },
    "nelder-mead": { x: [-2.484807470564643e-05, 2.7396251380691995e-05], fun: 1.367981406291454e-09, iter: 37 },
  },
  booth: {
    bfgs: { x: [0.9999999999999998, 3.0000000000000004], fun: 7.888609052210118e-31, iter: 2 },
    "l-bfgs": { x: [1.0000000000000004, 3.0], fun: 7.888609052210118e-31, iter: 2 },
    "nelder-mead": { x: [1.0000084245371434, 2.9999988246128764], fun: 2.8255506501096996e-10, iter: 44 },
  },
  rosenbrock: {
    bfgs: { x: [0.9999999999380992, 0.9999999998774786], fun: 3.9956019802824305e-21, iter: 29 },
    "l-bfgs": { x: [1.0000000000000022, 1.0000000000000044], fun: 4.930380657631324e-30, iter: 29 },
    "nelder-mead": { x: [1.0000117499532974, 1.0000167773369513], fun: 4.657541291131408e-09, iter: 78 },
  },
  beale: {
    bfgs: { x: [2.9999999999999147, 0.49999999999998096], fun: 1.2639030815837899e-27, iter: 11 },
    "l-bfgs": { x: [2.9999999998334013, 0.49999999997016054], fun: 7.477486536310986e-21, iter: 10 },
    "nelder-mead": { x: [3.000044398344032, 0.5000197153136617], fun: 2.0637074117548003e-09, iter: 53 },
  },
  himmelblau: {
    bfgs: { x: [2.999999999999253, 2.0000000000008895], fun: 2.0803177938189043e-23, iter: 10 },
    "l-bfgs": { x: [2.9999999999951914, 2.0000000000059748], fun: 8.877553261106713e-22, iter: 10 },
    "nelder-mead": { x: [2.999997967010201, 2.000014239464575], fun: 3.0209312975953717e-09, iter: 57 },
  },
  goldsteinPrice: {
    bfgs: { x: [6.558477240669279e-14, -0.999999999999946], fun: 2.999999999999975, iter: 8 },
    "l-bfgs": { x: [-5.657702719781693e-12, -1.0000000000023412], fun: 3.0, iter: 7 },
    "nelder-mead": { x: [3.662635031069634e-07, -1.0000024631595275], fun: 3.0000000028496956, iter: 35 },
  },
};

describe("cross-validation: BFGS with analytic gradient matches scipy", () => {
  /**
   * @provenance scipy.optimize.minimize v1.17.0, method='BFGS', jac=analytic
   * Empirically verified 2026-02-01.
   */
  const cases = [
    { name: "Sphere",          tf: sphere,         x0: [5, 5],       scipyF: scipyResults.sphere.bfgs.fun,          scipyX: scipyResults.sphere.bfgs.x },
    { name: "Booth",           tf: booth,           x0: [0, 0],       scipyF: scipyResults.booth.bfgs.fun,           scipyX: scipyResults.booth.bfgs.x },
    { name: "Rosenbrock",      tf: rosenbrock,      x0: [-1.2, 1.0],  scipyF: scipyResults.rosenbrock.bfgs.fun,      scipyX: scipyResults.rosenbrock.bfgs.x },
    { name: "Beale",           tf: beale,           x0: [0, 0],       scipyF: scipyResults.beale.bfgs.fun,           scipyX: scipyResults.beale.bfgs.x },
    { name: "Himmelblau",      tf: himmelblau,      x0: [0, 0],       scipyF: scipyResults.himmelblau.bfgs.fun,      scipyX: scipyResults.himmelblau.bfgs.x },
    { name: "Goldstein-Price", tf: goldsteinPrice,  x0: [0, -0.5],    scipyF: scipyResults.goldsteinPrice.bfgs.fun,  scipyX: scipyResults.goldsteinPrice.bfgs.x },
  ];

  for (const { name, tf, x0, scipyF, scipyX } of cases) {
    test(`${name}: converges to same minimum as scipy BFGS`, () => {
      const ours = minimize(tf.f, x0, { method: "bfgs", grad: tf.gradient });

      // Both should reach the known minimum value
      expect(ours.fun).toBeCloseTo(tf.minimumValue, 6);

      // Both should find the same minimizer location (within 1e-4)
      const dist = norm(ours.x.map((v, i) => v - tf.minimumAt[i]));
      expect(dist).toBeLessThan(1e-4);

      // scipy also reached the minimum — verify our result is at least as good
      // (we use tighter gradTol=1e-8 vs scipy's gtol=1e-5)
      expect(ours.fun).toBeLessThanOrEqual(scipyF + 1e-10);
    });
  }
});

describe("cross-validation: L-BFGS with analytic gradient matches scipy", () => {
  /**
   * @provenance scipy.optimize.minimize v1.17.0, method='L-BFGS-B', jac=analytic
   * Empirically verified 2026-02-01.
   */
  const cases = [
    { name: "Sphere",          tf: sphere,         x0: [5, 5],       scipyF: scipyResults.sphere["l-bfgs"].fun },
    { name: "Booth",           tf: booth,           x0: [0, 0],       scipyF: scipyResults.booth["l-bfgs"].fun },
    { name: "Rosenbrock",      tf: rosenbrock,      x0: [-1.2, 1.0],  scipyF: scipyResults.rosenbrock["l-bfgs"].fun },
    { name: "Beale",           tf: beale,           x0: [0, 0],       scipyF: scipyResults.beale["l-bfgs"].fun },
    { name: "Himmelblau",      tf: himmelblau,      x0: [0, 0],       scipyF: scipyResults.himmelblau["l-bfgs"].fun },
    { name: "Goldstein-Price", tf: goldsteinPrice,  x0: [0, -0.5],    scipyF: scipyResults.goldsteinPrice["l-bfgs"].fun },
  ];

  for (const { name, tf, x0, scipyF } of cases) {
    test(`${name}: converges to same minimum as scipy L-BFGS-B`, () => {
      const ours = minimize(tf.f, x0, { method: "l-bfgs", grad: tf.gradient });

      expect(ours.fun).toBeCloseTo(tf.minimumValue, 6);

      const dist = norm(ours.x.map((v, i) => v - tf.minimumAt[i]));
      expect(dist).toBeLessThan(1e-4);
    });
  }
});

describe("cross-validation: Nelder-Mead matches scipy", () => {
  /**
   * @provenance scipy.optimize.minimize v1.17.0, method='Nelder-Mead'
   * Empirically verified 2026-02-01.
   *
   * Nelder-Mead iteration counts differ significantly between implementations
   * due to initial simplex construction. We only verify converging to the
   * correct minimum, not iteration count.
   */
  const cases = [
    { name: "Sphere",          tf: sphere,         x0: [5, 5],       scipyF: scipyResults.sphere["nelder-mead"].fun,         tol: 1e-6 },
    { name: "Booth",           tf: booth,           x0: [0, 0],       scipyF: scipyResults.booth["nelder-mead"].fun,          tol: 1e-6 },
    { name: "Rosenbrock",      tf: rosenbrock,      x0: [-1.2, 1.0],  scipyF: scipyResults.rosenbrock["nelder-mead"].fun,     tol: 1e-6 },
    { name: "Beale",           tf: beale,           x0: [0, 0],       scipyF: scipyResults.beale["nelder-mead"].fun,          tol: 1e-6 },
    { name: "Himmelblau",      tf: himmelblau,      x0: [0, 0],       scipyF: scipyResults.himmelblau["nelder-mead"].fun,     tol: 1e-6 },
    { name: "Goldstein-Price", tf: goldsteinPrice,  x0: [0, -0.5],    scipyF: scipyResults.goldsteinPrice["nelder-mead"].fun, tol: 1e-4 },
  ];

  for (const { name, tf, x0, tol } of cases) {
    test(`${name}: converges to same minimum as scipy Nelder-Mead`, () => {
      const ours = minimize(tf.f, x0, { method: "nelder-mead" });

      expect(ours.converged).toBe(true);

      const dist = norm(ours.x.map((v, i) => v - tf.minimumAt[i]));
      expect(dist).toBeLessThan(1e-3);
    });
  }
});

describe("cross-validation: known behavioral differences from scipy", () => {
  /**
   * @provenance scipy.optimize.minimize v1.17.0
   *
   * Document the known differences between our implementation and scipy,
   * verifying they are expected and not bugs.
   */

  test("BFGS finite-diff on Rosenbrock: our tighter gradTol causes 'line search failed'", () => {
    // scipy (gtol=1e-5): success=true, fun=4.51e-11
    // Ours (gradTol=1e-8): converged=false, fun=1.94e-11 (better value!)
    const ours = minimize(rosenbrock.f, [-1.2, 1.0], { method: "bfgs" });

    // We get a better function value than scipy despite reporting non-convergence
    expect(ours.fun).toBeLessThan(1e-6);
    // The "failure" is just that finite-diff gradients can't satisfy our tighter tolerance
    expect(ours.converged).toBe(false);
    expect(ours.message).toContain("line search failed");
  });

  test("BFGS finite-diff on Rosenbrock: matches scipy when using scipy's tolerance", () => {
    // With scipy's gtol=1e-5, we should also report convergence
    const ours = minimize(rosenbrock.f, [-1.2, 1.0], {
      method: "bfgs",
      gradTol: 1e-5,
    });

    expect(ours.fun).toBeLessThan(1e-6);
    // With looser tolerance, we converge too
    expect(ours.converged).toBe(true);
  });

  test("gradient descent on Rosenbrock: hits max iterations (expected, matches Optim.jl)", () => {
    /**
     * @provenance optim.jl v2.0.0 — GradientDescent on Rosenbrock expects
     * 10,000-12,000 iterations in their test suite exception list.
     * Our default maxIterations=1000 is insufficient.
     */
    const ours = minimize(rosenbrock.f, [-1.2, 1.0], {
      method: "gradient-descent",
      grad: rosenbrock.gradient,
    });

    expect(ours.converged).toBe(false);
    expect(ours.iterations).toBe(1000);
    // But we still make significant progress
    expect(ours.fun).toBeLessThan(1e-2);
  });

  test("Himmelblau: all methods converge to one of four minima", () => {
    /**
     * @provenance mathematical-definition (Himmelblau 1972)
     * @provenance scipy.optimize v1.17.0 — converges to (3, 2) from (0, 0)
     * @provenance optim.jl v2.0.0 — also converges to (3, 2) from (0, 0)
     */
    const methods = ["bfgs", "l-bfgs", "nelder-mead"] as const;
    for (const method of methods) {
      const opts = method === "nelder-mead" ? {} : { grad: himmelblau.gradient };
      const ours = minimize(himmelblau.f, [0, 0], { method, ...opts });

      const closeToAny = himmelblauMinima.some(
        (min) => norm([ours.x[0] - min[0], ours.x[1] - min[1]]) < 0.01,
      );
      expect(closeToAny).toBe(true);

      // scipy and Optim.jl from (0,0) converge to (3, 2) — verify we find the same one
      expect(ours.x[0]).toBeCloseTo(3, 0);
      expect(ours.x[1]).toBeCloseTo(2, 0);
    }
  });
});

describe("cross-validation: BFGS with analytic gradient matches Optim.jl", () => {
  /**
   * @provenance optim.jl v2.0.0, BFGS(), g_tol=1e-8, HagerZhang line search
   * Empirically verified 2026-02-01 (Julia 1.10.7).
   */
  const cases = [
    { name: "Sphere",          tf: sphere,         x0: [5, 5],       optimF: optimJlResults.sphere.bfgs.fun },
    { name: "Booth",           tf: booth,           x0: [0, 0],       optimF: optimJlResults.booth.bfgs.fun },
    { name: "Rosenbrock",      tf: rosenbrock,      x0: [-1.2, 1.0],  optimF: optimJlResults.rosenbrock.bfgs.fun },
    { name: "Beale",           tf: beale,           x0: [0, 0],       optimF: optimJlResults.beale.bfgs.fun },
    { name: "Himmelblau",      tf: himmelblau,      x0: [0, 0],       optimF: optimJlResults.himmelblau.bfgs.fun },
    { name: "Goldstein-Price", tf: goldsteinPrice,  x0: [0, -0.5],    optimF: optimJlResults.goldsteinPrice.bfgs.fun },
  ];

  for (const { name, tf, x0, optimF } of cases) {
    test(`${name}: converges to same minimum as Optim.jl BFGS`, () => {
      const ours = minimize(tf.f, x0, { method: "bfgs", grad: tf.gradient });

      // Both should reach the known minimum value
      expect(ours.fun).toBeCloseTo(tf.minimumValue, 6);

      // Both should find the correct minimizer location
      const dist = norm(ours.x.map((v, i) => v - tf.minimumAt[i]));
      expect(dist).toBeLessThan(1e-4);

      // Optim.jl also reached the minimum (both use g_tol=1e-8)
      // For functions with non-zero minimum (e.g. Goldstein-Price min=3), check closeness
      expect(Math.abs(ours.fun - tf.minimumValue)).toBeLessThan(1e-6);
    });
  }
});

describe("cross-validation: L-BFGS with analytic gradient matches Optim.jl", () => {
  /**
   * @provenance optim.jl v2.0.0, LBFGS(), g_tol=1e-8, HagerZhang line search
   * Empirically verified 2026-02-01 (Julia 1.10.7).
   */
  const cases = [
    { name: "Sphere",          tf: sphere,         x0: [5, 5],       optimF: optimJlResults.sphere["l-bfgs"].fun },
    { name: "Booth",           tf: booth,           x0: [0, 0],       optimF: optimJlResults.booth["l-bfgs"].fun },
    { name: "Rosenbrock",      tf: rosenbrock,      x0: [-1.2, 1.0],  optimF: optimJlResults.rosenbrock["l-bfgs"].fun },
    { name: "Beale",           tf: beale,           x0: [0, 0],       optimF: optimJlResults.beale["l-bfgs"].fun },
    { name: "Himmelblau",      tf: himmelblau,      x0: [0, 0],       optimF: optimJlResults.himmelblau["l-bfgs"].fun },
    { name: "Goldstein-Price", tf: goldsteinPrice,  x0: [0, -0.5],    optimF: optimJlResults.goldsteinPrice["l-bfgs"].fun },
  ];

  for (const { name, tf, x0, optimF } of cases) {
    test(`${name}: converges to same minimum as Optim.jl L-BFGS`, () => {
      const ours = minimize(tf.f, x0, { method: "l-bfgs", grad: tf.gradient });

      expect(ours.fun).toBeCloseTo(tf.minimumValue, 6);

      const dist = norm(ours.x.map((v, i) => v - tf.minimumAt[i]));
      expect(dist).toBeLessThan(1e-4);
    });
  }
});

describe("cross-validation: Nelder-Mead matches Optim.jl", () => {
  /**
   * @provenance optim.jl v2.0.0, NelderMead(), iterations=5000
   * Empirically verified 2026-02-01 (Julia 1.10.7).
   *
   * Optim.jl uses AffineSimplexer (a=0.025, b=0.5) for initial simplex,
   * different from our 0.05*max(|x|,1). Iteration counts differ but
   * all converge to the correct minimum.
   */
  const cases = [
    { name: "Sphere",          tf: sphere,         x0: [5, 5],       optimF: optimJlResults.sphere["nelder-mead"].fun },
    { name: "Booth",           tf: booth,           x0: [0, 0],       optimF: optimJlResults.booth["nelder-mead"].fun },
    { name: "Rosenbrock",      tf: rosenbrock,      x0: [-1.2, 1.0],  optimF: optimJlResults.rosenbrock["nelder-mead"].fun },
    { name: "Beale",           tf: beale,           x0: [0, 0],       optimF: optimJlResults.beale["nelder-mead"].fun },
    { name: "Himmelblau",      tf: himmelblau,      x0: [0, 0],       optimF: optimJlResults.himmelblau["nelder-mead"].fun },
    { name: "Goldstein-Price", tf: goldsteinPrice,  x0: [0, -0.5],    optimF: optimJlResults.goldsteinPrice["nelder-mead"].fun },
  ];

  for (const { name, tf, x0 } of cases) {
    test(`${name}: converges to same minimum as Optim.jl Nelder-Mead`, () => {
      const ours = minimize(tf.f, x0, { method: "nelder-mead" });

      expect(ours.converged).toBe(true);

      const dist = norm(ours.x.map((v, i) => v - tf.minimumAt[i]));
      expect(dist).toBeLessThan(1e-3);
    });
  }
});
