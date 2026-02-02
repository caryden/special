/**
 * Tests for IPNewton interior-point constrained optimizer.
 *
 * @contract ip-newton.test.ts
 */

import { describe, test, expect } from "bun:test";
import { ipNewton, type ConstraintDef, type IPNewtonOptions } from "./ip-newton";
import { sphere, rosenbrock, booth, beale, himmelblau } from "./test-functions";
import { norm } from "./vec-ops";

// ─── Unconstrained: reduces to Newton ──────────────────────────────────────

describe("ipNewton: unconstrained (no bounds, no constraints)", () => {
  test("minimizes sphere function", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
    expect(result.x[0]).toBeCloseTo(0, 3);
    expect(result.x[1]).toBeCloseTo(0, 3);
  });

  test("minimizes Booth function", () => {
    const result = ipNewton(booth.f, [0, 0], booth.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
    expect(result.x[0]).toBeCloseTo(1, 2);
    expect(result.x[1]).toBeCloseTo(3, 2);
  });

  test("minimizes Rosenbrock", () => {
    const result = ipNewton(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, undefined, {
      maxIterations: 200,
    });
    expect(result.fun).toBeLessThan(1e-4);
    expect(result.x[0]).toBeCloseTo(1, 1);
    expect(result.x[1]).toBeCloseTo(1, 1);
  });

  test("uses finite-difference gradient when grad omitted", () => {
    const result = ipNewton(sphere.f, [3, 3]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-4);
  });

  test("uses finite-difference Hessian when hess omitted", () => {
    const result = ipNewton(sphere.f, [3, 3], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-8);
  });
});

// ─── Box-constrained ───────────────────────────────────────────────────────

describe("ipNewton: box constraints", () => {
  test("sphere with interior minimum: finds (0,0)", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      lower: [-10, -10],
      upper: [10, 10],
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-4);
    expect(result.x[0]).toBeCloseTo(0, 2);
    expect(result.x[1]).toBeCloseTo(0, 2);
  });

  test("sphere with active lower bound: finds (1,1)", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      lower: [1, 1],
      upper: [10, 10],
    });
    expect(result.x[0]).toBeCloseTo(1, 1);
    expect(result.x[1]).toBeCloseTo(1, 1);
    expect(result.fun).toBeCloseTo(2, 0);
  });

  test("sphere with active upper bound: finds (-1,-1)", () => {
    const result = ipNewton(sphere.f, [-5, -5], sphere.gradient, undefined, {
      lower: [-10, -10],
      upper: [-1, -1],
    });
    expect(result.x[0]).toBeCloseTo(-1, 1);
    expect(result.x[1]).toBeCloseTo(-1, 1);
  });

  test("Rosenbrock with tight box excluding true minimum", () => {
    // True min at (1,1), but box is [1.5, 3] x [1.5, 3]
    const result = ipNewton(rosenbrock.f, [2, 2], rosenbrock.gradient, undefined, {
      lower: [1.5, 1.5],
      upper: [3, 3],
      maxIterations: 200,
    });
    expect(result.x[0]).toBeCloseTo(1.5, 0);
    // x2 ≈ x1^2 = 2.25, but clamped to [1.5, 3]
    expect(result.x[1]).toBeGreaterThan(1.5);
    expect(result.x[1]).toBeLessThan(3.0);
  });

  test("one-sided bounds (only lower)", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      lower: [2, 2],
    });
    expect(result.x[0]).toBeCloseTo(2, 1);
    expect(result.x[1]).toBeCloseTo(2, 1);
  });

  test("one-sided bounds (only upper)", () => {
    const result = ipNewton(sphere.f, [-5, -5], sphere.gradient, undefined, {
      upper: [-2, -2],
    });
    expect(result.x[0]).toBeCloseTo(-2, 1);
    expect(result.x[1]).toBeCloseTo(-2, 1);
  });

  test("starting point outside bounds is nudged inside", () => {
    const result = ipNewton(sphere.f, [0, 0], sphere.gradient, undefined, {
      lower: [1, 1],
      upper: [10, 10],
    });
    // Should still converge to boundary
    expect(result.x[0]).toBeCloseTo(1, 0);
    expect(result.x[1]).toBeCloseTo(1, 0);
  });
});

// ─── Equality constraints ──────────────────────────────────────────────────

describe("ipNewton: equality constraints", () => {
  test("minimize x^2 + y^2 subject to x + y = 1", () => {
    // min x^2 + y^2 s.t. x + y = 1 => x = y = 0.5
    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [1],
      upper: [1], // equality: lower === upper
    };

    const result = ipNewton(sphere.f, [2, 3], sphere.gradient, undefined, {
      constraints,
      maxIterations: 100,
    });
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(0.5, 2);
    expect(result.x[1]).toBeCloseTo(0.5, 2);
    expect(result.fun).toBeCloseTo(0.5, 2);
  });

  test("minimize x^2 + y^2 subject to x - y = 2", () => {
    const constraints: ConstraintDef = {
      c: (x) => [x[0] - x[1]],
      jacobian: (_x) => [[1, -1]],
      lower: [2],
      upper: [2],
    };

    const result = ipNewton(sphere.f, [3, 0], sphere.gradient, undefined, {
      constraints,
    });
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(1, 2);
    expect(result.x[1]).toBeCloseTo(-1, 2);
    expect(result.fun).toBeCloseTo(2, 1);
  });

  test("box equality constraint (lower === upper)", () => {
    // Fix x[0] = 3 via box bounds
    const result = ipNewton(sphere.f, [4, 5], sphere.gradient, undefined, {
      lower: [3, -Infinity],
      upper: [3, Infinity],
    });
    expect(result.x[0]).toBeCloseTo(3, 1);
    expect(result.x[1]).toBeCloseTo(0, 1);
  });
});

// ─── Inequality constraints ────────────────────────────────────────────────

describe("ipNewton: inequality constraints", () => {
  test("minimize sphere subject to x + y >= 3", () => {
    // min x^2 + y^2 s.t. x + y >= 3 => x = y = 1.5
    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [3],
      upper: [Infinity],
    };

    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      constraints,
      maxIterations: 200,
    });
    expect(result.x[0]).toBeCloseTo(1.5, 1);
    expect(result.x[1]).toBeCloseTo(1.5, 1);
    expect(result.fun).toBeCloseTo(4.5, 0);
  });

  test("minimize sphere subject to x + y <= 1 (inactive at optimum)", () => {
    // min x^2 + y^2 with x + y <= 1 => optimum at (0,0), constraint inactive
    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [-Infinity],
      upper: [1],
    };

    const result = ipNewton(sphere.f, [0.3, 0.3], sphere.gradient, undefined, {
      constraints,
    });
    expect(result.fun).toBeLessThan(0.1);
    expect(result.x[0]).toBeCloseTo(0, 0);
    expect(result.x[1]).toBeCloseTo(0, 0);
  });

  test("minimize sphere subject to nonlinear constraint x^2 + y^2 >= 4", () => {
    // min x^2 + y^2 s.t. x^2 + y^2 >= 4 => on circle of radius 2
    const constraints: ConstraintDef = {
      c: (x) => [x[0] * x[0] + x[1] * x[1]],
      jacobian: (x) => [[2 * x[0], 2 * x[1]]],
      lower: [4],
      upper: [Infinity],
    };

    const result = ipNewton(sphere.f, [3, 3], sphere.gradient, undefined, {
      constraints,
      maxIterations: 200,
    });
    // Should be on the boundary: x^2 + y^2 ≈ 4
    expect(result.fun).toBeCloseTo(4, 0);
  });

  test("two-sided constraint: 2 <= x + y <= 4", () => {
    // min x^2 + y^2 s.t. 2 <= x+y <= 4 => x = y = 1 (active lower)
    // Start feasible: (1.5, 1.5) where x+y = 3, satisfies 2 <= 3 <= 4
    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [2],
      upper: [4],
    };

    const result = ipNewton(sphere.f, [1.5, 1.5], sphere.gradient, undefined, {
      constraints,
      maxIterations: 200,
    });
    expect(result.x[0]).toBeCloseTo(1, 0);
    expect(result.x[1]).toBeCloseTo(1, 0);
    // x+y should be near 2
    expect(result.x[0] + result.x[1]).toBeCloseTo(2, 0);
  });
});

// ─── Mixed constraints ─────────────────────────────────────────────────────

describe("ipNewton: mixed equality + inequality + box", () => {
  test("sphere with box + equality: fix x=0.5, bounds [0,2] x [0,2]", () => {
    const constraints: ConstraintDef = {
      c: (x) => [x[0]],
      jacobian: (_x) => [[1, 0]],
      lower: [0.5],
      upper: [0.5], // equality: x[0] = 0.5
    };

    const result = ipNewton(sphere.f, [1, 1], sphere.gradient, undefined, {
      constraints,
      lower: [0, 0],
      upper: [2, 2],
    });
    expect(result.x[0]).toBeCloseTo(0.5, 1);
    expect(result.x[1]).toBeCloseTo(0, 1);
  });

  test("sphere with box + inequality constraint", () => {
    // min x^2+y^2, x in [0,5], y in [0,5], x+y >= 4
    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [4],
      upper: [Infinity],
    };

    const result = ipNewton(sphere.f, [3, 3], sphere.gradient, undefined, {
      constraints,
      lower: [0, 0],
      upper: [5, 5],
      maxIterations: 200,
    });
    expect(result.x[0]).toBeCloseTo(2, 0);
    expect(result.x[1]).toBeCloseTo(2, 0);
  });
});

// ─── Options and edge cases ────────────────────────────────────────────────

describe("ipNewton: options and edge cases", () => {
  test("custom mu0", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      lower: [1, 1],
      upper: [10, 10],
      mu0: 0.01,
    });
    expect(result.x[0]).toBeCloseTo(1, 0);
    expect(result.x[1]).toBeCloseTo(1, 0);
  });

  test("custom kktTol", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      lower: [-10, -10],
      upper: [10, 10],
      kktTol: 1e-4, // looser tolerance
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1);
  });

  test("max iterations reached", () => {
    const result = ipNewton(rosenbrock.f, [-1.2, 1.0], rosenbrock.gradient, undefined, {
      maxIterations: 2,
      lower: [-5, -5],
      upper: [5, 5],
    });
    expect(result.iterations).toBe(2);
    expect(result.message).toContain("maximum iterations");
  });

  test("1D problem with box bounds", () => {
    const f1d = (x: number[]) => (x[0] - 3) * (x[0] - 3);
    const g1d = (x: number[]) => [2 * (x[0] - 3)];

    const result = ipNewton(f1d, [0], g1d, undefined, {
      lower: [1],
      upper: [5],
    });
    expect(result.x[0]).toBeCloseTo(3, 1);
    expect(result.fun).toBeLessThan(0.1);
  });

  test("1D with active bound", () => {
    const f1d = (x: number[]) => (x[0] - 3) * (x[0] - 3);
    const g1d = (x: number[]) => [2 * (x[0] - 3)];

    const result = ipNewton(f1d, [0], g1d, undefined, {
      lower: [4],
      upper: [10],
    });
    expect(result.x[0]).toBeCloseTo(4, 0);
  });

  test("already at optimum", () => {
    const result = ipNewton(sphere.f, [0, 0], sphere.gradient);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  test("provides gradient in result", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient);
    expect(result.gradient).not.toBeNull();
    expect(result.gradient!.length).toBe(2);
  });

  test("functionCalls and gradientCalls are tracked", () => {
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      lower: [-10, -10],
      upper: [10, 10],
    });
    expect(result.functionCalls).toBeGreaterThan(0);
    expect(result.gradientCalls).toBeGreaterThan(0);
  });

  test("custom Hessian function", () => {
    const hess = (_x: number[]) => [
      [2, 0],
      [0, 2],
    ];
    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, hess, {
      lower: [-10, -10],
      upper: [10, 10],
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-4);
  });
});

// ─── Classic constrained optimization problems ─────────────────────────────

describe("ipNewton: classic constrained problems", () => {
  test("HS7: min log(1+x1^2) - x2, s.t. (1+x1^2)^2 + x2^2 = 4", () => {
    // Hock-Schittkowski problem 7
    // Known solution: x* ≈ (0, sqrt(3)), f* ≈ -sqrt(3)
    const f = (x: number[]) => Math.log(1 + x[0] * x[0]) - x[1];
    const g = (x: number[]) => [
      2 * x[0] / (1 + x[0] * x[0]),
      -1,
    ];
    const constraints: ConstraintDef = {
      c: (x) => [(1 + x[0] * x[0]) * (1 + x[0] * x[0]) + x[1] * x[1]],
      jacobian: (x) => [[4 * x[0] * (1 + x[0] * x[0]), 2 * x[1]]],
      lower: [4],
      upper: [4], // equality
    };

    const result = ipNewton(f, [1, 1], g, undefined, {
      constraints,
      maxIterations: 200,
    });
    expect(result.x[0]).toBeCloseTo(0, 0);
    expect(result.x[1]).toBeCloseTo(Math.sqrt(3), 0);
  });

  test("minimize linear function with box + linear inequality", () => {
    // min -x - y s.t. x + y <= 1, x >= 0, y >= 0
    // Solution: x + y = 1, many solutions on the line
    const f = (x: number[]) => -x[0] - x[1];
    const g = (_x: number[]) => [-1, -1];

    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [-Infinity],
      upper: [1],
    };

    const result = ipNewton(f, [0.3, 0.3], g, undefined, {
      constraints,
      lower: [0, 0],
      upper: [Infinity, Infinity],
      maxIterations: 200,
    });
    // x + y should be near 1
    expect(result.x[0] + result.x[1]).toBeCloseTo(1, 0);
    expect(result.x[0]).toBeGreaterThanOrEqual(-0.1);
    expect(result.x[1]).toBeGreaterThanOrEqual(-0.1);
    expect(result.fun).toBeCloseTo(-1, 0);
  });

  test("quadratic with two inequality constraints", () => {
    // min (x-2)^2 + (y-2)^2 s.t. x+y <= 2, x >= 0, y >= 0
    // Solution: x = y = 1
    const f = (x: number[]) => (x[0] - 2) * (x[0] - 2) + (x[1] - 2) * (x[1] - 2);
    const g = (x: number[]) => [2 * (x[0] - 2), 2 * (x[1] - 2)];

    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1]],
      jacobian: (_x) => [[1, 1]],
      lower: [-Infinity],
      upper: [2],
    };

    const result = ipNewton(f, [0.5, 0.5], g, undefined, {
      constraints,
      lower: [0, 0],
      upper: [Infinity, Infinity],
      maxIterations: 200,
    });
    expect(result.x[0]).toBeCloseTo(1, 0);
    expect(result.x[1]).toBeCloseTo(1, 0);
    expect(result.fun).toBeCloseTo(2, 0);
  });
});

// ─── Multiple constraints ──────────────────────────────────────────────────

describe("ipNewton: multiple constraints", () => {
  test("two equality constraints fixing x and y", () => {
    const constraints: ConstraintDef = {
      c: (x) => [x[0], x[1]],
      jacobian: (_x) => [
        [1, 0],
        [0, 1],
      ],
      lower: [2, 3],
      upper: [2, 3], // equalities: x=2, y=3
    };

    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, undefined, {
      constraints,
      maxIterations: 100,
    });
    expect(result.x[0]).toBeCloseTo(2, 1);
    expect(result.x[1]).toBeCloseTo(3, 1);
    expect(result.fun).toBeCloseTo(13, 0);
  });

  test("NaN in objective triggers best-point return", () => {
    // Function that returns NaN after a few evaluations, forcing the
    // line search to accept a minimal step where f is NaN, triggering the guard.
    let calls = 0;
    const f = (x: number[]) => {
      calls++;
      if (calls > 8) return NaN;
      return x[0] * x[0] + x[1] * x[1];
    };

    const result = ipNewton(f, [5, 5], (x) => [2 * x[0], 2 * x[1]], undefined, {
      lower: [-10, -10],
      upper: [10, 10],
      maxIterations: 50,
    });
    // Should detect NaN and return best feasible point
    expect(isFinite(result.fun)).toBe(true);
    expect(result.message).toContain("NaN");
  });

  test("severely indefinite Hessian triggers robustSolve fallback", () => {
    // Provide an extremely negative-definite Hessian that exhausts regularization
    const badHess = (_x: number[]) => [[-1e20, 0], [0, -1e20]];

    const result = ipNewton(sphere.f, [5, 5], sphere.gradient, badHess, {
      lower: [-10, -10],
      upper: [10, 10],
      maxIterations: 10,
    });
    // Should still return a result (not crash), using fallback solve
    expect(result.x.length).toBe(2);
    expect(result.x.every((v: number) => isFinite(v))).toBe(true);
  });

  test("equality + inequality constraints", () => {
    // min x^2+y^2+z^2 s.t. x+y+z=3, x >= 1
    const constraints: ConstraintDef = {
      c: (x) => [x[0] + x[1] + x[2], x[0]],
      jacobian: (_x) => [
        [1, 1, 1],
        [1, 0, 0],
      ],
      lower: [3, 1],
      upper: [3, Infinity], // first is equality, second is inequality
    };

    const result = ipNewton(
      (x) => x[0] * x[0] + x[1] * x[1] + x[2] * x[2],
      [2, 1, 1],
      (x) => [2 * x[0], 2 * x[1], 2 * x[2]],
      undefined,
      { constraints, maxIterations: 200 },
    );
    // x + y + z = 3, x >= 1
    // If x=1 active: min 1 + y^2+z^2 s.t. y+z=2 => y=z=1
    expect(result.x[0]).toBeCloseTo(1, 0);
    expect(result.x[1]).toBeCloseTo(1, 0);
    expect(result.x[2]).toBeCloseTo(1, 0);
  });
});
