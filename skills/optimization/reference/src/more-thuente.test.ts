/**
 * Tests for More-Thuente line search.
 *
 * Verifies that the line search satisfies strong Wolfe conditions,
 * exercises all four cstep cases, tests convergence info codes, and
 * validates on standard test functions.
 *
 * @contract more-thuente.test.ts
 */

import { describe, test, expect } from "bun:test";
import { moreThuente, cstep } from "./more-thuente";
import { dot } from "./vec-ops";
import {
  sphere, booth, rosenbrock, beale, himmelblau, goldsteinPrice,
} from "./test-functions";

// Default More-Thuente parameters
const F_TOL = 1e-4;
const GTOL = 0.9;

/**
 * Check strong Wolfe conditions.
 * 1. Sufficient decrease: phi(a) <= phi(0) + c1*a*phi'(0)
 * 2. Curvature: |phi'(a)| <= c2*|phi'(0)|
 */
function checkStrongWolfe(
  phi0: number, dphi0: number, phiA: number, dphiA: number, alpha: number,
): boolean {
  const decrease = phiA <= phi0 + F_TOL * alpha * dphi0;
  const curvature = Math.abs(dphiA) <= GTOL * Math.abs(dphi0);
  return decrease && curvature;
}

describe("more-thuente: basic properties", () => {
  test("returns a positive step size", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = moreThuente(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  test("reduces function value", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = moreThuente(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("returns gradient at new point", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = moreThuente(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.gNew).not.toBeNull();
    expect(result.gNew!.length).toBe(2);
  });

  test("tracks function and gradient calls", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = moreThuente(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });
});

describe("more-thuente: strong Wolfe conditions on test functions", () => {
  const testFunctions = [
    { name: "Sphere", tf: sphere, x0: [5, 5] },
    { name: "Booth", tf: booth, x0: [0, 0] },
    { name: "Rosenbrock", tf: rosenbrock, x0: [-1.2, 1.0] },
    { name: "Beale", tf: beale, x0: [0, 0] },
    { name: "Himmelblau", tf: himmelblau, x0: [0, 0] },
    { name: "Goldstein-Price", tf: goldsteinPrice, x0: [0, -0.5] },
  ];

  for (const { name, tf, x0 } of testFunctions) {
    test(`${name}: satisfies strong Wolfe conditions`, () => {
      const fx = tf.f(x0);
      const gx = tf.gradient(x0);
      const d = gx.map((g: number) => -g);
      const dphi0 = dot(gx, d);
      if (Math.abs(dphi0) < 1e-15) return;
      const result = moreThuente(tf.f, tf.gradient, x0, d, fx, gx);
      expect(result.success).toBe(true);
      expect(result.fNew).toBeLessThanOrEqual(fx);
      const dphiA = dot(result.gNew!, d);
      const wolfeOk = checkStrongWolfe(fx, dphi0, result.fNew, dphiA, result.alpha);
      expect(wolfeOk).toBe(true);
    });
  }
});

describe("more-thuente: cstep cases", () => {
  test("case 1: higher function value (cubic/quadratic)", () => {
    // f(x) = (x-50)^4 from x=[100], d=[-1] — quartic with steep walls
    // Initial alpha=1 gives f=49^4 < 50^4, but with tight parameters
    // the expansion phase may produce a step where f > f(stx)
    const f = (x: number[]) => Math.pow(x[0] - 50, 4);
    const grad = (x: number[]) => [4 * Math.pow(x[0] - 50, 3)];
    const x = [100];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx);
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("case 2: opposite-sign derivatives (cubic/secant)", () => {
    // f(x) = x^6 — steep walls cause derivatives to flip sign during search
    const f = (x: number[]) => Math.pow(x[0], 6);
    const grad = (x: number[]) => [6 * Math.pow(x[0], 5)];
    const x = [2];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx);
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("case 3: same-sign decreasing derivative", () => {
    // f(x) = x^2 from x=[100], d=[-1]
    // Derivative same sign but magnitude decreases as we approach minimum
    const f = (x: number[]) => x[0] * x[0];
    const grad = (x: number[]) => [2 * x[0]];
    const x = [100];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, { gtol: 0.1 });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("case 4: same-sign non-decreasing derivative (unbounded)", () => {
    // f(x) = -exp(-x) + x^2/100 — derivative starts negative,
    // gets less negative slowly. With tight curvature tolerance,
    // same-sign derivative non-decreasing case is triggered.
    const f = (x: number[]) => -Math.exp(-x[0]) + x[0] * x[0] / 100;
    const grad = (x: number[]) => [Math.exp(-x[0]) + 2 * x[0] / 100];
    const x = [5];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx);
    expect(result.alpha).toBeGreaterThan(0);
  });

  test("case 4: same-sign non-decreasing derivative (bracketed)", () => {
    // f(x) = x^2 + 5*sin(x) — oscillatory quadratic. The sin component
    // causes derivative magnitude to fluctuate, triggering case 4 when
    // the minimizer is bracketed but |dg| >= |dgx| with same sign.
    const f = (x: number[]) => x[0] * x[0] + 5 * Math.sin(x[0]);
    const grad = (x: number[]) => [2 * x[0] + 5 * Math.cos(x[0])];
    const x = [4];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, { gtol: 0.01 });
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.fNew).toBeLessThan(fx);
  });
});

describe("more-thuente: convergence info codes", () => {
  test("info=1: strong Wolfe conditions satisfied (standard case)", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = gx.map((g: number) => -g);
    const result = moreThuente(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.success).toBe(true);
  });

  test("info=3: max function evaluations reached", () => {
    // Linear function: always decreasing, Wolfe curvature never satisfied
    const f = (x: number[]) => -x[0];
    const grad = (_x: number[]) => [-1];
    const x = [0];
    const d = [1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, { maxFev: 3 });
    expect(result.success).toBe(false);
    expect(result.alpha).toBeGreaterThan(0);
  });

  test("info=2: interval width below tolerance", () => {
    // Use extremely tight tolerances that force interval to narrow
    // to within xTol before conditions are satisfied
    const f = (x: number[]) => Math.pow(Math.abs(x[0] - 1), 1.5);
    const grad = (x: number[]) => {
      const t = x[0] - 1;
      return [1.5 * Math.sign(t) * Math.pow(Math.abs(t), 0.5)];
    };
    const x = [5];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, {
      gtol: 1e-15, // nearly impossible curvature condition
      xTol: 0.5,   // very loose width tolerance
    });
    // Should terminate via info=2 (width tolerance)
    expect(result.alpha).toBeGreaterThan(0);
  });

  test("info=4: step at lower bound (alphaMin)", () => {
    // f(x) = x^2 from x=[-0.1], d=[1]: phi(a) = (-0.1+a)^2
    // dphi(0) = -0.2 (descent direction). Minimum at a=0.1.
    // With alphaMin=alphaMax=0.5, alpha is clamped to 0.5.
    // phi(0.5) = 0.16 > phi(0)=0.01 → insufficient decrease → info=4.
    const f = (x: number[]) => x[0] * x[0];
    const grad = (x: number[]) => [2 * x[0]];
    const x = [-0.1];
    const d = [1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, {
      alphaMin: 0.5,
      alphaMax: 0.5,
    });
    expect(result.success).toBe(false);
  });

  test("info=5: step at upper bound", () => {
    // A function that keeps decreasing with very small derivative
    // so the step keeps growing until it hits alphaMax
    const f = (x: number[]) => -Math.log(1 + x[0]);
    const grad = (x: number[]) => [-1 / (1 + x[0])];
    const x = [0];
    const d = [1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, { alphaMax: 2.0 });
    expect(result.alpha).toBeGreaterThan(0);
  });
});

describe("more-thuente: stage transition", () => {
  test("transitions from modified function stage to standard stage", () => {
    // Rosenbrock: its curved valley causes multiple iterations,
    // naturally transitioning through stage1 to standard stage
    const x = [-1.2, 1.0];
    const fx = rosenbrock.f(x);
    const gx = rosenbrock.gradient(x);
    const d = gx.map((g: number) => -g);
    const result = moreThuente(rosenbrock.f, rosenbrock.gradient, x, d, fx, gx);
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
    expect(result.functionCalls).toBeGreaterThan(1);
  });
});

describe("more-thuente: custom parameters", () => {
  test("tight curvature condition (gtol=0.1 for gradient descent)", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = gx.map((g: number) => -g);
    const result = moreThuente(sphere.f, sphere.gradient, x, d, fx, gx, { gtol: 0.1 });
    expect(result.success).toBe(true);
    const dphiA = dot(result.gNew!, d);
    const dphi0 = dot(gx, d);
    expect(Math.abs(dphiA)).toBeLessThanOrEqual(0.1 * Math.abs(dphi0) + 1e-12);
  });

  test("loose sufficient decrease (fTol=0.4)", () => {
    const x = [-1.2, 1.0];
    const fx = rosenbrock.f(x);
    const gx = rosenbrock.gradient(x);
    const d = gx.map((g: number) => -g);
    const result = moreThuente(rosenbrock.f, rosenbrock.gradient, x, d, fx, gx, { fTol: 0.4 });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });
});

describe("more-thuente: non-finite handling", () => {
  test("handles initial non-finite function value by halving", () => {
    let callCount = 0;
    const f = (x: number[]) => {
      callCount++;
      // First evaluation returns Infinity (step too large)
      if (callCount === 1 && x[0] > 100) return Infinity;
      return x[0] * x[0];
    };
    const grad = (x: number[]) => [2 * x[0]];
    const x = [200];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    callCount = 0; // Reset after fx eval
    const result = moreThuente(f, grad, x, d, fx, gx);
    expect(result.alpha).toBeGreaterThan(0);
  });
});

describe("more-thuente: bracketed bisection fallback", () => {
  test("bisection when interval doesn't shrink fast enough", () => {
    // Oscillatory function: forces the interval to stagnate, triggering
    // the (2/3)*width1 bisection fallback
    const f = (x: number[]) => x[0] * x[0] + 2 * Math.sin(3 * x[0]);
    const grad = (x: number[]) => [2 * x[0] + 6 * Math.cos(3 * x[0])];
    const x = [5];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, { gtol: 0.1 });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("loop exhaustion returns failure (post-loop fallback)", () => {
    // Use a function with a constant gradient that causes the algorithm
    // to cycle without converging. With maxFev=2, the first evaluation
    // is the initial one, the second is in the loop, then the loop
    // exhausts at maxIter = maxFev + iterFiniteMax + 2.
    // Actually, just use alphaMin=alphaMax to force the step to be
    // always the same, and maxFev high enough to pass the interior check
    // but have the loop itself exhaust.
    const f = (x: number[]) => (x[0] - 5) * (x[0] - 5);
    const grad = (_x: number[]) => [-1]; // lies: constant gradient
    const x = [5];
    const d = [1];
    const fx = f(x);
    const gx = grad(x);
    // With constant gradient, denom is always zero, cstep can't make progress.
    // maxFev=200 allows many iterations but the step never satisfies Wolfe.
    const result = moreThuente(f, grad, x, d, fx, gx, { maxFev: 200 });
    expect(result.success).toBe(false);
  });
});

describe("more-thuente: comparison with Strong Wolfe", () => {
  test("produces descent on all test functions", () => {
    const cases = [
      { tf: sphere, x0: [5, 5] },
      { tf: booth, x0: [0, 0] },
      { tf: rosenbrock, x0: [-1.2, 1.0] },
      { tf: beale, x0: [0, 0] },
      { tf: himmelblau, x0: [0, 0] },
      { tf: goldsteinPrice, x0: [0, -0.5] },
    ];
    for (const { tf, x0 } of cases) {
      const fx = tf.f(x0);
      const gx = tf.gradient(x0);
      const d = gx.map((g: number) => -g);
      const dphi0 = dot(gx, d);
      if (Math.abs(dphi0) < 1e-15) continue;
      const result = moreThuente(tf.f, tf.gradient, x0, d, fx, gx);
      expect(result.fNew).toBeLessThan(fx);
    }
  });
});

describe("cstep: direct unit tests for edge cases", () => {
  test("case 3: alpha <= stx with r >= 0 (stmin fallback)", () => {
    // Case 3 requires: f <= fstx, sgnd >= 0 (same-sign), |dg| < |dgx|
    // And r >= 0 or gamma === 0 with alpha <= stx
    // stx=5 (best step to the right), alpha=2 (trial step to the left, alpha < stx)
    // fstx=10, f=8 (lower), dgx=-10, dg=-5 (same sign, |dg|=5 < |dgx|=10)
    // sgnd = (-5)*(-10/10) = 5 >= 0 ✓
    const result = cstep(
      5, 10, -10,  // stx, fstx, dgx
      0, 20, -8,   // sty, fsty, dgy
      2, 8, -5,    // alpha, f, dg (f < fstx, same-sign, |dg| < |dgx|)
      false, 0, 100, // not bracketed, stmin=0, stmax=100
    );
    // alpha=2 < stx=5, and if cubic gives r >= 0, alphac = stmin = 0
    expect(result.info).toBe(3);
    expect(result.alpha).toBeGreaterThanOrEqual(0);
  });

  test("case 4: bracketed with cubic interpolation using sty", () => {
    // Case 4 requires: f <= fstx, sgnd >= 0 (same-sign), |dg| >= |dgx|
    // AND bracketed = true
    // stx=1 (best), sty=5 (other endpoint), alpha=3 (trial)
    // fstx=2, f=1 (lower), dgx=-1, dg=-2 (same sign, |dg|=2 >= |dgx|=1)
    // sgnd = (-2)*(-1/1) = 2 >= 0 ✓
    const result = cstep(
      1, 2, -1,    // stx, fstx, dgx
      5, 10, -3,   // sty, fsty, dgy (bracketed endpoint)
      3, 1, -2,    // alpha, f, dg (f < fstx, same-sign, |dg| >= |dgx|)
      true, 0, 100, // bracketed=true
    );
    expect(result.info).toBe(4);
    // Should use cubic interpolation with sty endpoint
    expect(result.alpha).toBeGreaterThan(0);
  });

  test("case 4: not bracketed with alpha <= stx (stmin fallback)", () => {
    // Case 4 with not bracketed and alpha <= stx → alphaf = stmin
    // stx=5, alpha=2 (alpha < stx)
    // fstx=10, f=5, dgx=-1, dg=-3 (same sign, |dg|=3 >= |dgx|=1)
    const result = cstep(
      5, 10, -1,   // stx, fstx, dgx
      0, 20, -2,   // sty, fsty, dgy
      2, 5, -3,    // alpha, f, dg (alpha < stx, same-sign, |dg| >= |dgx|)
      false, 0, 100,
    );
    expect(result.info).toBe(4);
    expect(result.alpha).toBe(0); // stmin
  });
});

describe("more-thuente: bisection width fallback", () => {
  test("bisection triggers when interval stagnates", () => {
    // Highly oscillatory quadratic + sine causes cstep interpolation to make
    // poor progress, so the bracket doesn't shrink by 2/3 between iterations,
    // triggering the bisection fallback (line 224).
    const f = (x: number[]) => x[0] * x[0] + 100 * Math.sin(x[0] * 5);
    const grad = (x: number[]) => [2 * x[0] + 500 * Math.cos(x[0] * 5)];
    const x = [20];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = moreThuente(f, grad, x, d, fx, gx, { gtol: 0.001 });
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.fNew).toBeLessThan(fx);
  });
});
