/**
 * Tests for Brent's 1D minimization method.
 *
 * Verifies convergence on standard univariate test functions,
 * edge cases, and failure modes.
 *
 * @provenance mathematical-definition — analytic minima of elementary functions:
 *   x^2 → 0, (x-3)^2 → 3, -sin(x) → π/2, x·ln(x) → 1/e, e^x-2x → ln(2),
 *   x^4-2x^2 → ±1
 * @provenance Optim.jl v2.0.0 Brent(), verified 2026-02-02 — 8 test functions
 *   cross-validated, all converge to same minima within floating-point tolerance
 * @provenance Brent 1973, "Algorithms for Minimization without Derivatives"
 *
 * @contract brent-1d.test.ts
 */

import { describe, test, expect } from "bun:test";
import { brent1d } from "./brent-1d";

describe("brent-1d: quadratic functions", () => {
  test("minimizes x^2 on [-2, 2]", () => {
    const result = brent1d(x => x * x, -2, 2);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x)).toBeLessThan(1e-7);
    expect(result.fun).toBeLessThan(1e-14);
    expect(result.functionCalls).toBeGreaterThan(0);
  });

  test("minimizes (x-3)^2 on [0, 10]", () => {
    const result = brent1d(x => (x - 3) * (x - 3), 0, 10);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 3)).toBeLessThan(1e-7);
    expect(result.fun).toBeLessThan(1e-14);
  });

  test("minimizes x^2 + 2x + 1 = (x+1)^2 on [-5, 5]", () => {
    const result = brent1d(x => x * x + 2 * x + 1, -5, 5);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x + 1)).toBeLessThan(1e-7);
    expect(result.fun).toBeLessThan(1e-14);
  });
});

describe("brent-1d: non-smooth functions", () => {
  test("minimizes |x| on [-3, 2]", () => {
    const result = brent1d(x => Math.abs(x), -3, 2);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x)).toBeLessThan(1e-7);
    expect(result.fun).toBeLessThan(1e-7);
  });

  test("minimizes |x - 1.5| on [0, 5]", () => {
    const result = brent1d(x => Math.abs(x - 1.5), 0, 5);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 1.5)).toBeLessThan(1e-6);
  });
});

describe("brent-1d: transcendental functions", () => {
  test("minimizes -sin(x) on [0, pi] (minimum at pi/2)", () => {
    const result = brent1d(x => -Math.sin(x), 0, Math.PI);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - Math.PI / 2)).toBeLessThan(1e-7);
    expect(Math.abs(result.fun + 1)).toBeLessThan(1e-14);
  });

  test("minimizes x*log(x) on [0.1, 3] (minimum at 1/e)", () => {
    const result = brent1d(x => x * Math.log(x), 0.1, 3);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 1 / Math.E)).toBeLessThan(1e-7);
  });

  test("minimizes exp(x) - 2x on [-1, 2] (minimum at ln(2))", () => {
    const result = brent1d(x => Math.exp(x) - 2 * x, -1, 2);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - Math.LN2)).toBeLessThan(1e-7);
  });
});

describe("brent-1d: edge cases", () => {
  test("reversed bracket [b, a] with b > a", () => {
    const result = brent1d(x => x * x, 2, -2);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x)).toBeLessThan(1e-7);
  });

  test("narrow bracket near minimum", () => {
    const result = brent1d(x => x * x, -0.001, 0.001);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x)).toBeLessThan(1e-7);
  });

  test("asymmetric bracket [0.5, 100] for (x-1)^2", () => {
    const result = brent1d(x => (x - 1) * (x - 1), 0.5, 100);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 1)).toBeLessThan(1e-7);
  });

  test("minimum near left endpoint", () => {
    // f(x) = (x - 0.001)^2 on [0, 10]
    const result = brent1d(x => (x - 0.001) * (x - 0.001), 0, 10);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 0.001)).toBeLessThan(1e-6);
  });

  test("minimum near right endpoint", () => {
    // f(x) = (x - 9.999)^2 on [0, 10]
    const result = brent1d(x => (x - 9.999) * (x - 9.999), 0, 10);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 9.999)).toBeLessThan(1e-6);
  });
});

describe("brent-1d: options and failure modes", () => {
  test("custom tolerance", () => {
    const result = brent1d(x => x * x, -2, 2, { tol: 1e-12 });
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x)).toBeLessThan(1e-11);
  });

  test("maximum iterations exceeded", () => {
    // Very tight tolerance with very few iterations
    const result = brent1d(x => x * x, -100, 100, { maxIter: 3 });
    expect(result.converged).toBe(false);
    expect(result.message).toBe("Maximum iterations exceeded");
    expect(result.iterations).toBe(3);
  });

  test("returns iteration count and function calls", () => {
    const result = brent1d(x => (x - 5) * (x - 5), 0, 10);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.functionCalls).toBeGreaterThan(result.iterations); // initial eval + 1 per iter
    expect(result.converged).toBe(true);
  });
});

describe("brent-1d: higher-order functions", () => {
  test("minimizes x^4 - 2x^2 on [-2, 0] (minimum at -1)", () => {
    const result = brent1d(x => x ** 4 - 2 * x * x, -2, 0);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x + 1)).toBeLessThan(1e-7);
    expect(Math.abs(result.fun + 1)).toBeLessThan(1e-14);
  });

  test("minimizes x^4 - 2x^2 on [0, 2] (minimum at +1)", () => {
    const result = brent1d(x => x ** 4 - 2 * x * x, 0, 2);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x - 1)).toBeLessThan(1e-7);
    expect(Math.abs(result.fun + 1)).toBeLessThan(1e-14);
  });

  test("flat function near minimum", () => {
    // f(x) = x^8, very flat near 0
    const result = brent1d(x => x ** 8, -1, 1);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.x)).toBeLessThan(0.01);
    expect(result.fun).toBeLessThan(1e-10);
  });
});
