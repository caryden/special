/**
 * Tests for Fminbox log-barrier box-constrained optimizer.
 *
 * @contract fminbox.test.ts
 * @provenance mathematical-definition — barrier function: -log(x-l)-log(u-x),
 *   gradient: -1/(x-l)+1/(u-x), projected gradient norm per Bertsekas 1999
 * @provenance Optim.jl v2.0.0 Fminbox(LBFGS()), verified 2026-02-02 —
 *   7 cross-validation tests (interior + boundary-active), all match
 * @provenance Test functions: sphere f(x)=Σx², rosenbrock f=100(y-x²)²+(1-x)²
 *   with known minima at origin and (1,1) respectively
 */

import { describe, test, expect } from "bun:test";
import {
  fminbox,
  barrierValue,
  barrierGradient,
  projectedGradientNorm,
} from "./fminbox";

// ── Helper test functions ──────────────────────────────────────────────

const sphere = (x: number[]) => x.reduce((s, xi) => s + xi * xi, 0);
const sphereGrad = (x: number[]) => x.map(xi => 2 * xi);

const rosenbrock = (x: number[]) => {
  const [a, b] = [x[0], x[1]];
  return (1 - a) ** 2 + 100 * (b - a * a) ** 2;
};
const rosenbrockGrad = (x: number[]) => {
  const [a, b] = [x[0], x[1]];
  return [
    -2 * (1 - a) - 400 * a * (b - a * a),
    200 * (b - a * a),
  ];
};

// ── barrierValue tests ─────────────────────────────────────────────────

describe("barrierValue", () => {
  test("returns correct value for interior point", () => {
    // x=2, l=0, u=4: -log(2) - log(2) = -2*log(2)
    const val = barrierValue([2], [0], [4]);
    expect(val).toBeCloseTo(-2 * Math.log(2), 10);
  });

  test("returns Infinity when x is at lower bound", () => {
    expect(barrierValue([0], [0], [4])).toBe(Infinity);
  });

  test("returns Infinity when x is at upper bound", () => {
    expect(barrierValue([4], [0], [4])).toBe(Infinity);
  });

  test("returns Infinity when x is below lower bound", () => {
    expect(barrierValue([-1], [0], [4])).toBe(Infinity);
  });

  test("returns Infinity when x is above upper bound", () => {
    expect(barrierValue([5], [0], [4])).toBe(Infinity);
  });

  test("handles infinite lower bound", () => {
    // No lower barrier, only upper: -log(u - x)
    const val = barrierValue([1], [-Infinity], [4]);
    expect(val).toBeCloseTo(-Math.log(3), 10);
  });

  test("handles infinite upper bound", () => {
    // No upper barrier, only lower: -log(x - l)
    const val = barrierValue([3], [1], [Infinity]);
    expect(val).toBeCloseTo(-Math.log(2), 10);
  });

  test("handles both bounds infinite (no barrier)", () => {
    expect(barrierValue([5], [-Infinity], [Infinity])).toBe(0);
  });

  test("multidimensional barrier", () => {
    const val = barrierValue([1, 3], [0, 0], [4, 4]);
    const expected = -Math.log(1) - Math.log(3) - Math.log(3) - Math.log(1);
    expect(val).toBeCloseTo(expected, 10);
  });
});

// ── barrierGradient tests ──────────────────────────────────────────────

describe("barrierGradient", () => {
  test("returns correct gradient for interior point", () => {
    // x=2, l=0, u=4: g = -1/2 + 1/2 = 0
    const g = barrierGradient([2], [0], [4]);
    expect(g[0]).toBeCloseTo(0, 10);
  });

  test("gradient pushes away from lower bound", () => {
    // x=0.1, l=0, u=4: g = -1/0.1 + 1/3.9 ≈ -9.74
    const g = barrierGradient([0.1], [0], [4]);
    expect(g[0]).toBeLessThan(0); // pushes toward interior
  });

  test("gradient pushes away from upper bound", () => {
    // x=3.9, l=0, u=4: g = -1/3.9 + 1/0.1 ≈ 9.74
    const g = barrierGradient([3.9], [0], [4]);
    expect(g[0]).toBeGreaterThan(0); // pushes toward interior (lower)
  });

  test("handles infinite lower bound", () => {
    const g = barrierGradient([1], [-Infinity], [4]);
    expect(g[0]).toBeCloseTo(1 / (4 - 1), 10);
  });

  test("handles infinite upper bound", () => {
    const g = barrierGradient([3], [1], [Infinity]);
    expect(g[0]).toBeCloseTo(-1 / (3 - 1), 10);
  });

  test("handles both bounds infinite", () => {
    const g = barrierGradient([5], [-Infinity], [Infinity]);
    expect(g[0]).toBe(0);
  });
});

// ── projectedGradientNorm tests ────────────────────────────────────────

describe("projectedGradientNorm", () => {
  test("equals gradient norm at interior point", () => {
    const x = [2, 3];
    const g = [0.5, -0.3];
    const norm = projectedGradientNorm(x, g, [0, 0], [10, 10]);
    expect(norm).toBeCloseTo(0.5, 10);
  });

  test("zeros out component at lower bound pointing outward", () => {
    // x at lower bound, gradient pointing outward (positive = decrease = toward lower)
    const x = [0, 5];
    const g = [-1, 0.5]; // g[0] = -1 points toward lower (x - g = 0 - (-1) = 1, clamped to 1, proj = 0 - 1 = -1... actually)
    // Wait: projected = x - clamp(x - g, l, u)
    // x=0, g=-1: x-g = 0-(-1) = 1, clamp(1, 0, 10) = 1, proj = 0 - 1 = -1
    // That's the right direction so it should NOT be zeroed
    // For zeroing: x at lower, g positive (gradient points toward decrease from below)
    const x2 = [0, 5];
    const g2 = [2, 0.5]; // g[0] = 2: x-g = 0-2 = -2, clamp(-2, 0, 10) = 0, proj = 0 - 0 = 0 (zeroed!)
    const norm2 = projectedGradientNorm(x2, g2, [0, 0], [10, 10]);
    expect(norm2).toBeCloseTo(0.5, 10); // only g[1] contributes
  });

  test("zeros out component at upper bound pointing outward", () => {
    const x = [5, 10];
    const g = [0.5, -2]; // g[1] = -2: x-g = 10-(-2) = 12, clamp(12, 0, 10) = 10, proj = 10 - 10 = 0
    const norm = projectedGradientNorm(x, g, [0, 0], [10, 10]);
    expect(norm).toBeCloseTo(0.5, 10);
  });

  test("returns zero when all projected gradients are zero", () => {
    // x at lower bound with gradient pointing outward
    const norm = projectedGradientNorm([0], [1], [0], [10]);
    expect(norm).toBe(0);
  });
});

// ── fminbox integration tests ──────────────────────────────────────────

describe("fminbox", () => {
  test("minimizes sphere within bounds (minimum inside box)", () => {
    const result = fminbox(sphere, [1, 1], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 4);
    expect(result.x[0]).toBeCloseTo(0, 3);
    expect(result.x[1]).toBeCloseTo(0, 3);
  });

  test("minimizes sphere when minimum is at lower bound", () => {
    // min x^2 s.t. x >= 2 => solution is x = 2
    const result = fminbox(sphere, [5], sphereGrad, {
      lower: [2],
      upper: [10],
    });
    expect(result.x[0]).toBeCloseTo(2, 2);
    expect(result.fun).toBeCloseTo(4, 2);
  });

  test("minimizes sphere when minimum is at upper bound", () => {
    // min x^2 s.t. x <= -2 => solution is x = -2
    const result = fminbox(sphere, [-5], sphereGrad, {
      lower: [-10],
      upper: [-2],
    });
    expect(result.x[0]).toBeCloseTo(-2, 2);
    expect(result.fun).toBeCloseTo(4, 2);
  });

  test("handles asymmetric bounds on rosenbrock", () => {
    // Rosenbrock min at (1,1); constrain to [0.5, 1.5] x [0.5, 1.5] — min still inside
    const result = fminbox(rosenbrock, [0.7, 0.7], rosenbrockGrad, {
      lower: [0.5, 0.5],
      upper: [1.5, 1.5],
    });
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(1.0, 2);
    expect(result.x[1]).toBeCloseTo(1.0, 2);
  });

  test("handles bound-constrained rosenbrock (min outside box)", () => {
    // Constrain to [1.5, 3] x [1.5, 3] — true min (1,1) is outside
    const result = fminbox(rosenbrock, [2, 2], rosenbrockGrad, {
      lower: [1.5, 1.5],
      upper: [3, 3],
    });
    // Solution should be at corner (1.5, 2.25) approximately
    expect(result.x[0]).toBeCloseTo(1.5, 1);
    expect(result.x[1]).toBeCloseTo(1.5 * 1.5, 1); // x2 ≈ x1^2 at Rosenbrock valley
  });

  test("uses BFGS inner method", () => {
    const result = fminbox(sphere, [1, 1], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
      method: "bfgs",
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 4);
  });

  test("uses conjugate-gradient inner method", () => {
    const result = fminbox(sphere, [1, 1], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
      method: "conjugate-gradient",
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 4);
  });

  test("uses gradient-descent inner method", () => {
    const result = fminbox(sphere, [3, 3], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
      method: "gradient-descent",
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 2);
  });

  test("handles infinite lower bounds", () => {
    // min x^2 s.t. x <= 5
    const result = fminbox(sphere, [3], sphereGrad, {
      lower: [-Infinity],
      upper: [5],
    });
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(0, 3);
  });

  test("handles infinite upper bounds", () => {
    // min x^2 s.t. x >= -5
    const result = fminbox(sphere, [3], sphereGrad, {
      lower: [-5],
      upper: [Infinity],
    });
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(0, 3);
  });

  test("handles all-infinite bounds (unconstrained)", () => {
    const result = fminbox(sphere, [3, -2], sphereGrad);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 4);
  });

  test("nudges initial point on lower boundary into interior", () => {
    const result = fminbox(sphere, [0], sphereGrad, {
      lower: [0],
      upper: [10],
    });
    // Should not crash; solution at x=0 (lower boundary)
    expect(result.x[0]).toBeCloseTo(0, 1);
  });

  test("nudges initial point on upper boundary into interior", () => {
    const result = fminbox(sphere, [10], sphereGrad, {
      lower: [0],
      upper: [10],
    });
    // Should not crash; solution at x=0 (near lower boundary)
    expect(result.x[0]).toBeCloseTo(0, 1);
  });

  test("returns error for invalid bounds (lower >= upper)", () => {
    const result = fminbox(sphere, [1], sphereGrad, {
      lower: [5],
      upper: [2],
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("Invalid bounds");
  });

  test("custom mu0 parameter", () => {
    const result = fminbox(sphere, [3, 3], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
      mu0: 0.01,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 3);
  });

  test("custom muFactor parameter", () => {
    const result = fminbox(sphere, [3, 3], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
      muFactor: 0.1,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 3);
  });

  test("stops at max outer iterations when problem is hard", () => {
    // Very tight tolerance on a hard problem with few outer iterations
    const result = fminbox(rosenbrock, [0.6, 0.6], rosenbrockGrad, {
      lower: [0.5, 0.5],
      upper: [1.5, 1.5],
      outerIterations: 1,
      outerGradTol: 1e-15,
    });
    expect(result.message).toContain("maximum outer iterations");
  });

  test("converged at initial point when projected gradient is zero", () => {
    // Minimum at origin is inside bounds; start exactly at origin
    const result = fminbox(sphere, [0, 0], sphereGrad, {
      lower: [-1, -1],
      upper: [1, 1],
    });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  test("nudges initial point below lower bound with finite bounds", () => {
    const result = fminbox(sphere, [-1], sphereGrad, {
      lower: [2],
      upper: [10],
    });
    // x0 = -1 < lower = 2, should be nudged to 0.99*2 + 0.01*10 = 2.08
    expect(result.x[0]).toBeCloseTo(2, 1);
  });

  test("nudges initial point above upper bound with finite bounds", () => {
    const result = fminbox(sphere, [15], sphereGrad, {
      lower: [2],
      upper: [10],
    });
    expect(result.x[0]).toBeCloseTo(2, 1);
  });

  test("nudges initial point below lower bound with infinite upper", () => {
    // lower=2, upper=Inf, x0=0 => nudge to lower + 1.0 = 3.0
    const result = fminbox(sphere, [0], sphereGrad, {
      lower: [2],
      upper: [Infinity],
    });
    expect(result.x[0]).toBeCloseTo(2, 1);
  });

  test("nudges initial point above upper bound with infinite lower", () => {
    // lower=-Inf, upper=5, x0=10 => nudge to upper - 1.0 = 4.0
    const result = fminbox(sphere, [10], sphereGrad, {
      lower: [-Infinity],
      upper: [5],
    });
    expect(result.x[0]).toBeCloseTo(0, 1);
  });

  test("tracks function and gradient calls", () => {
    const result = fminbox(sphere, [3, 3], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
    });
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("custom outerGradTol affects convergence", () => {
    // Very loose tolerance — should converge quickly
    const result = fminbox(sphere, [1, 1], sphereGrad, {
      lower: [-5, -5],
      upper: [5, 5],
      outerGradTol: 1.0,
    });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeLessThanOrEqual(2);
  });

  test("one-sided bound: lower only, multiple dimensions", () => {
    // min sum(x_i^2) s.t. x_i >= 1
    const result = fminbox(sphere, [3, 3, 3], sphereGrad, {
      lower: [1, 1, 1],
      upper: [Infinity, Infinity, Infinity],
    });
    for (let i = 0; i < 3; i++) {
      expect(result.x[i]).toBeCloseTo(1, 1);
    }
  });
});
