/**
 * Tests for Hager-Zhang line search.
 *
 * Verifies that the line search satisfies approximate Wolfe conditions
 * and produces descent on all standard test functions. Exercises all
 * code paths: initial acceptance, bracket expansion, secant/bisection
 * narrowing, and failure modes.
 *
 * @contract hager-zhang.test.ts
 */

import { describe, test, expect } from "bun:test";
import { hagerZhangLineSearch } from "./hager-zhang";
import { dot } from "./vec-ops";
import {
  sphere, booth, rosenbrock, beale, himmelblau, goldsteinPrice,
} from "./test-functions";

// Default HZ parameters for checking conditions
const DELTA = 0.1;
const SIGMA = 0.9;
const EPSILON = 1e-6;

/**
 * Check approximate Wolfe conditions.
 * Standard: phi(a) <= phi(0) + delta*a*phi'(0) AND phi'(a) >= sigma*phi'(0)
 * Approximate: phi(a) <= phi(0) + eps_k AND (2*delta-1)*phi'(0) >= phi'(a) >= sigma*phi'(0)
 */
function checkApproxWolfe(
  phi0: number, dphi0: number, phiA: number, dphiA: number, alpha: number,
): boolean {
  const epsK = EPSILON * Math.abs(phi0);
  const standardDecrease = phiA <= phi0 + DELTA * alpha * dphi0;
  const curvature = dphiA >= SIGMA * dphi0;
  if (standardDecrease && curvature) return true;
  const approxDecrease = (2 * DELTA - 1) * dphi0 >= dphiA;
  const approxBound = phiA <= phi0 + epsK;
  return approxBound && approxDecrease && curvature;
}

describe("hager-zhang: basic properties", () => {
  test("returns a positive step size", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = hagerZhangLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  test("reduces function value", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = hagerZhangLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("returns gradient at new point", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = hagerZhangLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.gNew).not.toBeNull();
    expect(result.gNew!.length).toBe(2);
  });

  test("tracks function and gradient calls", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = hagerZhangLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("initial step satisfies conditions (early return at alpha=1)", () => {
    // Sphere from [0.5, 0.5] with d=[-0.5, -0.5] → exact minimum at alpha=1
    // phi(0)=0.5, dphi0=-1, phi(1)=0, dphi(1)=0
    // Decrease: 0 <= 0.5+0.1*1*(-1) = 0.4 ✓  Curvature: 0 >= 0.9*(-1) ✓
    const x = [0.5, 0.5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-0.5, -0.5];
    const result = hagerZhangLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.alpha).toBe(1.0);
    expect(result.fNew).toBe(0);
    expect(result.success).toBe(true);
    // Should return in exactly 1 function + 1 gradient eval
    expect(result.functionCalls).toBe(1);
    expect(result.gradientCalls).toBe(1);
  });
});

describe("hager-zhang: Wolfe conditions on test functions", () => {
  const testFunctions = [
    { name: "Sphere", tf: sphere, x0: [5, 5] },
    { name: "Booth", tf: booth, x0: [0, 0] },
    { name: "Rosenbrock", tf: rosenbrock, x0: [-1.2, 1.0] },
    { name: "Beale", tf: beale, x0: [0, 0] },
    { name: "Himmelblau", tf: himmelblau, x0: [0, 0] },
    { name: "Goldstein-Price", tf: goldsteinPrice, x0: [0, -0.5] },
  ];

  for (const { name, tf, x0 } of testFunctions) {
    test(`${name}: satisfies approximate Wolfe conditions`, () => {
      const fx = tf.f(x0);
      const gx = tf.gradient(x0);
      const d = gx.map((g: number) => -g);
      const dphi0 = dot(gx, d);
      if (Math.abs(dphi0) < 1e-15) return;
      const result = hagerZhangLineSearch(tf.f, tf.gradient, x0, d, fx, gx);
      expect(result.success).toBe(true);
      expect(result.fNew).toBeLessThanOrEqual(fx);
      const dphiA = dot(result.gNew!, d);
      const wolfeOk = checkApproxWolfe(fx, dphi0, result.fNew, dphiA, result.alpha);
      expect(wolfeOk).toBe(true);
    });
  }
});

describe("hager-zhang: bracket expansion phase", () => {
  test("expands when initial step is too small (function still decreasing)", () => {
    // f(x) = x[0]^2, from x=[100], d=[-1]
    // phi(0)=10000, dphi0=-200. At c=1: phi=9801, dphi=-198 → still decreasing
    // Needs expansion: c=1,5,25,125... until overshoot
    const f = (x: number[]) => x[0] * x[0];
    const grad = (x: number[]) => [2 * x[0]];
    const x = [100];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx);
    expect(result.success).toBe(true);
    expect(result.alpha).toBeGreaterThan(1);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("satisfies conditions during expansion (returns early from loop)", () => {
    // f(x) = x[0]^2, from x=[1000], d=[-1]
    // phi(0)=1e6, dphi0=-2000. At c=1: phi=998001, dphi=-1998 → still decreasing
    // c=5: phi=995^2=990025, dphi=-1990 → still decreasing
    // Eventually expansion overshoots and finds Wolfe-satisfying point
    const f = (x: number[]) => x[0] * x[0];
    const grad = (x: number[]) => [2 * x[0]];
    const x = [1000];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx);
    expect(result.success).toBe(true);
    expect(result.alpha).toBeGreaterThan(1);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("expansion finds bracket boundary (bracket found, secant follows)", () => {
    // f(x) = (x[0]-50)^4 from x=[100], d=[-1]
    // Very flat near minimum → expansion overshoots but Wolfe curvature fails
    // at expanded point due to quartic shape, forcing bracket+secant
    const f = (x: number[]) => Math.pow(x[0] - 50, 4);
    const grad = (x: number[]) => [4 * Math.pow(x[0] - 50, 3)];
    const x = [100];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      sigma: 0.1, // tighter curvature → harder to satisfy during expansion
    });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("bracket expansion exhausted (returns failure)", () => {
    // Linear function: always decreasing, never brackets
    const f = (x: number[]) => -x[0];
    const grad = (_x: number[]) => [-1];
    const x = [0];
    const d = [1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      maxBracketIter: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe("hager-zhang: secant/bisection narrowing", () => {
  test("secant updates bj when interpolated point overshoots", () => {
    // f(x) = x[0]^6 from x=[2], d=[-1]. Steep walls → secant may overshoot.
    // With tight sigma, secant narrowing requires multiple bj updates.
    const f = (x: number[]) => Math.pow(x[0], 6);
    const grad = (x: number[]) => [6 * Math.pow(x[0], 5)];
    const x = [2];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      sigma: 0.1, // tighter curvature condition
    });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("bisection fallback when secant doesn't shrink bracket enough", () => {
    // gamma=0.01 means bisection triggers unless secant shrinks to 1% of bracket
    // f(x) = |x[0]-1|^1.5 — non-smooth near minimum causes poor secant
    const f = (x: number[]) => Math.pow(Math.abs(x[0] - 1), 1.5);
    const grad = (x: number[]) => {
      const t = x[0] - 1;
      return [1.5 * Math.sign(t) * Math.pow(Math.abs(t), 0.5)];
    };
    const x = [5];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      gamma: 0.01, // very aggressive bisection trigger
    });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("bisection updates aj when midpoint is in descent region", () => {
    // Use a function where bisection midpoint has phi <= phi0+epsK and dphi < 0
    // f(x) = (x[0]-3)^2 * (1 + 0.5*sin(10*x[0])) — oscillatory with clear minimum
    // The oscillation causes secant to make poor progress, forcing bisection
    const f = (x: number[]) => {
      const t = x[0];
      return (t - 3) * (t - 3) * (1 + 0.3 * Math.sin(10 * t));
    };
    const grad = (x: number[]) => {
      const t = x[0];
      const base = (t - 3) * (t - 3);
      const osc = 1 + 0.3 * Math.sin(10 * t);
      return [2 * (t - 3) * osc + base * 3 * Math.cos(10 * t)];
    };
    const x = [10];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      gamma: 0.01,
    });
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("secant phase exhaustion returns failure", () => {
    // maxSecantIter=1 with strict conditions: after finding bracket,
    // one secant iteration runs but conditions aren't met, then we
    // exhaust the secant loop and hit the fallback return.
    const x = [-1.2, 1.0];
    const fx = rosenbrock.f(x);
    const gx = rosenbrock.gradient(x);
    const d = gx.map((g: number) => -g);
    const result = hagerZhangLineSearch(
      rosenbrock.f, rosenbrock.gradient, x, d, fx, gx,
      { maxSecantIter: 1, delta: 0.99, sigma: 0.99 },
    );
    // With very strict Wolfe conditions and only 1 secant step,
    // the search should fail to find a satisfying point
    expect(result.success).toBe(false);
  });

  test("bracket converges to very narrow width", () => {
    // Use a function where secant converges to a narrow bracket
    // with many secant iterations allowed but tight conditions
    // f(x) = (x[0])^2 + 1e-10*x[0]^4 — nearly quadratic with tiny quartic
    const f = (x: number[]) => x[0] * x[0] + 1e-10 * Math.pow(x[0], 4);
    const grad = (x: number[]) => [2 * x[0] + 4e-10 * Math.pow(x[0], 3)];
    const x = [10];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      sigma: 0.001, // extremely tight curvature — forces many iterations
      maxSecantIter: 200,
    });
    // May or may not succeed with such tight conditions, but should not crash
    expect(result.alpha).toBeGreaterThan(0);
  });

  test("secant fallback to theta when derivative denominator is near zero", () => {
    // Use a function whose gradient is constant, so dphiAj === dphiBj.
    // f(x) = (x-5)^2 brackets because phi goes up, but gradient always
    // returns [-1] (a lie), so the line search sees identical phi' at
    // both bracket endpoints, forcing the theta fallback on line 224.
    const f = (x: number[]) => (x[0] - 5) * (x[0] - 5);
    const constGrad = (_x: number[]) => [-1]; // constant directional deriv
    const x = [5];
    const d = [1];
    const fx = f(x);
    const gx = constGrad(x);
    // phi(0)=0, dphi0=-1 (descent). At c=1: phi=1>0 → brackets [0,1].
    // dphiAj=-1, dphiBj=-1 → denom=0 → theta fallback.
    const result = hagerZhangLineSearch(f, constGrad, x, d, fx, gx);
    expect(result.alpha).toBeGreaterThan(0);
  });

  test("tight conditions force bj update and bisection aj update", () => {
    // f(x) = (x[0]-5)^2, from x=[0], d=[1]
    // With delta=0.99, sigma=0.99: standard decrease is very strict,
    // forcing secant points that satisfy Wolfe to be rare.
    // The secant step from bracket [0, c] may overshoot or undershoot,
    // triggering both bj and aj updates over multiple iterations.
    const f = (x: number[]) => (x[0] - 5) * (x[0] - 5);
    const grad = (x: number[]) => [2 * (x[0] - 5)];
    const x = [0];
    const d = [1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      delta: 0.99,
      sigma: 0.99,
      gamma: 0.01, // force bisection fallback
    });
    // Should still find a good step, just with more iterations
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("secant with oscillatory function forces multiple bracket updates", () => {
    // f(x) = x^2 + 2*sin(3x), from x=[5], d=[-1]
    // Oscillatory component causes secant to bounce between high/low regions,
    // exercising both bj and aj updates in the secant and bisection phases.
    const f = (x: number[]) => x[0] * x[0] + 2 * Math.sin(3 * x[0]);
    const grad = (x: number[]) => [2 * x[0] + 6 * Math.cos(3 * x[0])];
    const x = [5];
    const d = [-1];
    const fx = f(x);
    const gx = grad(x);
    const result = hagerZhangLineSearch(f, grad, x, d, fx, gx, {
      sigma: 0.1,
      gamma: 0.1, // frequent bisection fallback
    });
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });
});

describe("hager-zhang: convergence behavior", () => {
  test("Sphere: step size near optimal (alpha ≈ 0.5 for steepest descent)", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = hagerZhangLineSearch(sphere.f, sphere.gradient, x, d, fx, gx);
    expect(result.alpha).toBeGreaterThan(0.1);
    expect(result.alpha).toBeLessThan(2.0);
    expect(result.fNew).toBeLessThan(1);
  });

  test("Rosenbrock: handles curved valley", () => {
    const x = [-1.2, 1.0];
    const fx = rosenbrock.f(x);
    const gx = rosenbrock.gradient(x);
    const d = gx.map((g: number) => -g);
    const result = hagerZhangLineSearch(rosenbrock.f, rosenbrock.gradient, x, d, fx, gx);
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });

  test("works with custom parameters", () => {
    const x = [5, 5];
    const fx = sphere.f(x);
    const gx = sphere.gradient(x);
    const d = [-gx[0], -gx[1]];
    const result = hagerZhangLineSearch(
      sphere.f, sphere.gradient, x, d, fx, gx,
      { delta: 0.01, sigma: 0.5, rho: 2.0 },
    );
    expect(result.success).toBe(true);
    expect(result.fNew).toBeLessThan(fx);
  });
});

describe("hager-zhang: comparison with Strong Wolfe", () => {
  test("produces descent on all test functions from standard starting points", () => {
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
      const result = hagerZhangLineSearch(tf.f, tf.gradient, x0, d, fx, gx);
      expect(result.fNew).toBeLessThan(fx);
    }
  });
});
