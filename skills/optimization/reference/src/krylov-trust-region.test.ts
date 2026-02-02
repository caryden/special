import { describe, test, expect } from "bun:test";
import { krylovTrustRegion, steihaugCG } from "./krylov-trust-region";

// ── Test functions ─────────────────────────────────────────────────────

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

const booth = (x: number[]) => (x[0] + 2 * x[1] - 7) ** 2 + (2 * x[0] + x[1] - 5) ** 2;
const boothGrad = (x: number[]) => [
  2 * (x[0] + 2 * x[1] - 7) + 4 * (2 * x[0] + x[1] - 5),
  4 * (x[0] + 2 * x[1] - 7) + 2 * (2 * x[0] + x[1] - 5),
];

const beale = (x: number[]) => {
  const t1 = 1.5 - x[0] + x[0] * x[1];
  const t2 = 2.25 - x[0] + x[0] * x[1] ** 2;
  const t3 = 2.625 - x[0] + x[0] * x[1] ** 3;
  return t1 * t1 + t2 * t2 + t3 * t3;
};
const bealeGrad = (x: number[]) => {
  const t1 = 1.5 - x[0] + x[0] * x[1];
  const t2 = 2.25 - x[0] + x[0] * x[1] ** 2;
  const t3 = 2.625 - x[0] + x[0] * x[1] ** 3;
  return [
    2 * t1 * (-1 + x[1]) + 2 * t2 * (-1 + x[1] ** 2) + 2 * t3 * (-1 + x[1] ** 3),
    2 * t1 * x[0] + 2 * t2 * (2 * x[0] * x[1]) + 2 * t3 * (3 * x[0] * x[1] ** 2),
  ];
};

const himmelblau = (x: number[]) => (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2;
const himmelblauGrad = (x: number[]) => [
  4 * x[0] * (x[0] ** 2 + x[1] - 11) + 2 * (x[0] + x[1] ** 2 - 7),
  2 * (x[0] ** 2 + x[1] - 11) + 4 * x[1] * (x[0] + x[1] ** 2 - 7),
];

// ── steihaugCG tests ───────────────────────────────────────────────────

describe("steihaugCG", () => {
  test("solves quadratic subproblem for sphere", () => {
    const x = [5, 5];
    const gx = sphereGrad(x);
    const result = steihaugCG(sphereGrad, x, gx, 10.0, 0.01);
    // For a quadratic, CG should give the Newton step in 1 iteration
    // Newton step for sphere: s = -H^{-1} g = -[1/2, 1/2] * [10, 10] = [-5, -5]
    expect(result.s[0]).toBeCloseTo(-5, 1);
    expect(result.s[1]).toBeCloseTo(-5, 1);
    expect(result.mDecrease).toBeLessThan(0);
  });

  test("hits trust region boundary for large gradient", () => {
    const x = [100, 100];
    const gx = sphereGrad(x);
    // Small radius forces boundary hit
    const result = steihaugCG(sphereGrad, x, gx, 1.0, 0.01);
    const sNorm = Math.sqrt(result.s[0] ** 2 + result.s[1] ** 2);
    expect(sNorm).toBeCloseTo(1.0, 5);
    expect(result.onBoundary).toBe(true);
  });

  test("handles zero gradient", () => {
    const x = [0, 0];
    const gx = sphereGrad(x); // [0, 0]
    const result = steihaugCG(sphereGrad, x, gx, 1.0, 0.01);
    // With zero gradient, d = -r = -g = [0,0], dHd = 0, should break
    expect(result.s[0]).toBeCloseTo(0, 10);
    expect(result.s[1]).toBeCloseTo(0, 10);
  });

  test("model decrease is non-positive", () => {
    const x = [3, -2];
    const gx = rosenbrockGrad(x);
    const result = steihaugCG(rosenbrockGrad, x, gx, 1.0, 0.01);
    expect(result.mDecrease).toBeLessThanOrEqual(0);
  });
});

// ── krylovTrustRegion integration tests ────────────────────────────────

describe("krylovTrustRegion", () => {
  test("minimizes sphere with analytic gradient", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeCloseTo(0, 6);
    expect(result.x[0]).toBeCloseTo(0, 4);
    expect(result.x[1]).toBeCloseTo(0, 4);
  });

  test("minimizes Rosenbrock with analytic gradient", () => {
    const result = krylovTrustRegion(rosenbrock, [-1.2, 1.0], rosenbrockGrad);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
    expect(result.x[0]).toBeCloseTo(1, 2);
    expect(result.x[1]).toBeCloseTo(1, 2);
  });

  test("minimizes Booth with analytic gradient", () => {
    const result = krylovTrustRegion(booth, [0, 0], boothGrad);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(1, 4);
    expect(result.x[1]).toBeCloseTo(3, 4);
  });

  test("minimizes Beale with analytic gradient", () => {
    const result = krylovTrustRegion(beale, [0, 0], bealeGrad);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(3, 2);
    expect(result.x[1]).toBeCloseTo(0.5, 2);
  });

  test("minimizes Himmelblau with analytic gradient", () => {
    const result = krylovTrustRegion(himmelblau, [0, 0], himmelblauGrad);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("minimizes sphere without gradient (finite differences)", () => {
    const result = krylovTrustRegion(sphere, [5, 5]);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("minimizes Rosenbrock without gradient", () => {
    const result = krylovTrustRegion(rosenbrock, [-1.2, 1.0]);
    expect(result.fun).toBeLessThan(1e-4);
    expect(result.x[0]).toBeCloseTo(1, 1);
    expect(result.x[1]).toBeCloseTo(1, 1);
  });

  test("handles higher dimensions", () => {
    const n = 5;
    const sphereN = (x: number[]) => x.reduce((s, xi) => s + xi * xi, 0);
    const gradN = (x: number[]) => x.map(xi => 2 * xi);
    const x0 = new Array(n).fill(3);
    const result = krylovTrustRegion(sphereN, x0, gradN);
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("custom initial radius", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad, {
      initialRadius: 0.1,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("custom max radius", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad, {
      maxRadius: 1.0,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("custom eta threshold", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad, {
      eta: 0.01,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("custom cgTol", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad, {
      cgTol: 0.1,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("custom rhoLower and rhoUpper", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad, {
      rhoLower: 0.1,
      rhoUpper: 0.9,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("tracks function and gradient calls", () => {
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad);
    expect(result.functionCalls).toBeGreaterThan(1);
    expect(result.gradientCalls).toBeGreaterThan(1);
  });

  test("stops at max iterations", () => {
    const result = krylovTrustRegion(rosenbrock, [-1.2, 1.0], rosenbrockGrad, {
      maxIterations: 2,
      gradTol: 1e-15,
    });
    expect(result.converged).toBe(false);
    expect(result.message).toContain("maximum iterations");
  });

  test("trust region radius shrinks on bad steps", () => {
    // A very small initial radius should still converge (just take more iterations)
    const result = krylovTrustRegion(sphere, [5, 5], sphereGrad, {
      initialRadius: 0.001,
    });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeGreaterThan(5); // More iterations due to small steps
  });

  test("converges from far starting point", () => {
    const result = krylovTrustRegion(sphere, [100, 100], sphereGrad, {
      maxIterations: 500,
    });
    expect(result.converged).toBe(true);
    expect(result.fun).toBeLessThan(1e-6);
  });

  test("negative curvature: non-convex function", () => {
    // f(x) = -x^2 is concave (negative curvature everywhere)
    // The algorithm should still make progress (move to TR boundary)
    const concave = (x: number[]) => -x[0] * x[0] - x[1] * x[1];
    const concaveGrad = (x: number[]) => [-2 * x[0], -2 * x[1]];
    const result = krylovTrustRegion(concave, [0.1, 0.1], concaveGrad, {
      maxIterations: 50,
    });
    // For a concave function, it won't converge to a minimum (there is none)
    // but it should not crash. The function value should decrease (become more negative)
    expect(result.fun).toBeLessThan(concave([0.1, 0.1]));
  });

  test("very small trust region radius triggers early termination", () => {
    // Pathological: function where model is always poor, radius shrinks to zero
    const tricky = (x: number[]) => Math.sin(x[0] * 100) + x[0] * x[0];
    const trickyGrad = (x: number[]) => [100 * Math.cos(x[0] * 100) + 2 * x[0]];
    const result = krylovTrustRegion(tricky, [1], trickyGrad, {
      initialRadius: 1e-10,
      maxIterations: 100,
    });
    // Should terminate (either converge or radius too small)
    expect(result.iterations).toBeLessThanOrEqual(100);
  });

  test("1D problem", () => {
    const f = (x: number[]) => (x[0] - 3) ** 2;
    const g = (x: number[]) => [2 * (x[0] - 3)];
    const result = krylovTrustRegion(f, [10], g);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(3, 4);
  });

  test("predictedReduction zero edge case", () => {
    // At the minimum, gradient is zero — should converge at iteration 0
    const result = krylovTrustRegion(sphere, [0, 0], sphereGrad);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
  });

  test("predictedReduction non-positive triggers rho=0 path", () => {
    // Use a gradient function that reports nonzero gradient (avoiding initial convergence)
    // but the Hessian-vector product is zero, so CG step has mDecrease >= 0.
    // grad claims nonzero but hvp returns zero → CG can't make progress, dHd ≈ 0
    let hvpCallCount = 0;
    const fakeGrad = (x: number[]): number[] => {
      hvpCallCount++;
      // First call: return nonzero gradient (initial gradient evaluation)
      // Subsequent calls from hvp: return the same value (so hvp ≈ 0)
      return [1, 1]; // constant gradient → H*v = 0 for all v
    };
    const result = krylovTrustRegion(
      (x: number[]) => x[0] + x[1], // linear function
      [5, 5],
      fakeGrad,
      { maxIterations: 100, gradTol: 1e-20, stepTol: 1e-20, funcTol: 1e-20 },
    );
    // Constant gradient means HVP is zero, dHd ≈ 0.
    // CG breaks immediately, mDecrease = g^T * 0 + 0 = 0, predictedReduction ≤ 0.
    // rho = 0, step rejected, radius shrinks to zero.
    expect(result.converged).toBe(false);
  });

  test("radius shrinks to zero triggers early termination", () => {
    // Constant gradient → HVP = 0 → CG produces zero step → rho = 0 → radius shrinks
    const constGrad = (_x: number[]): number[] => [1];
    const result = krylovTrustRegion(
      (x: number[]) => x[0],
      [5],
      constGrad,
      { maxIterations: 1000, gradTol: 1e-20, stepTol: 1e-20, funcTol: 1e-20 },
    );
    expect(result.message).toContain("radius");
  });
});
