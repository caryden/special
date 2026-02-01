import { describe, test, expect } from "bun:test";
import {
  sphere, booth, rosenbrock, beale, himmelblau, goldsteinPrice,
  himmelblauMinima, allTestFunctions,
  type TestFunction,
} from "./test-functions";

/** Check that f(minimumAt) === minimumValue within tolerance. */
function verifyMinimum(tf: TestFunction, tol = 1e-10) {
  const value = tf.f(tf.minimumAt);
  expect(Math.abs(value - tf.minimumValue)).toBeLessThan(tol);
}

/** Check gradient is near-zero at the minimum (necessary condition). */
function verifyGradientAtMinimum(tf: TestFunction, tol = 1e-6) {
  const grad = tf.gradient(tf.minimumAt);
  for (const gi of grad) {
    expect(Math.abs(gi)).toBeLessThan(tol);
  }
}

/** Verify gradient via finite differences at a point. */
function verifyGradientNumerically(tf: TestFunction, x: number[], h = 1e-7, tol = 1e-4) {
  const grad = tf.gradient(x);
  for (let i = 0; i < x.length; i++) {
    const xPlus = [...x];
    const xMinus = [...x];
    xPlus[i] += h;
    xMinus[i] -= h;
    const numerical = (tf.f(xPlus) - tf.f(xMinus)) / (2 * h);
    expect(Math.abs(grad[i] - numerical)).toBeLessThan(tol);
  }
}

describe("sphere", () => {
  /** @provenance mathematical-definition (trivially derived) */
  test("f at minimum is 0", () => verifyMinimum(sphere));
  test("gradient at minimum is zero", () => verifyGradientAtMinimum(sphere));

  /** @provenance mathematical-definition */
  test("f([3, 4]) = 25", () => {
    expect(sphere.f([3, 4])).toBe(25);
  });

  test("gradient matches finite differences", () => {
    verifyGradientNumerically(sphere, [3.0, -2.0]);
  });
});

describe("booth", () => {
  /** @provenance mathematical-definition */
  test("f at minimum is 0", () => verifyMinimum(booth));
  test("gradient at minimum is zero", () => verifyGradientAtMinimum(booth));

  /** @provenance mathematical-definition: (0+0-7)^2 + (0+0-5)^2 = 49+25 = 74 */
  test("f([0, 0]) = 74", () => {
    expect(booth.f([0, 0])).toBe(74);
  });

  test("gradient matches finite differences", () => {
    verifyGradientNumerically(booth, [2.0, 1.0]);
  });
});

describe("rosenbrock", () => {
  /** @provenance mathematical-definition (Rosenbrock 1960) */
  test("f at minimum is 0", () => verifyMinimum(rosenbrock));
  test("gradient at minimum is zero", () => verifyGradientAtMinimum(rosenbrock));

  /**
   * @provenance scipy.optimize.rosen v1.17.0
   * scipy.optimize.rosen([-1.2, 1.0]) == 24.2
   */
  test("f([-1.2, 1.0]) = 24.2 (standard starting point)", () => {
    expect(rosenbrock.f([-1.2, 1.0])).toBeCloseTo(24.2, 10);
  });

  /**
   * @provenance mathematical-definition
   * f(0, 0) = (1-0)^2 + 100*(0-0)^2 = 1
   */
  test("f([0, 0]) = 1", () => {
    expect(rosenbrock.f([0, 0])).toBe(1);
  });

  test("gradient matches finite differences at starting point", () => {
    verifyGradientNumerically(rosenbrock, [-1.2, 1.0]);
  });

  test("gradient matches finite differences at [2, 3]", () => {
    verifyGradientNumerically(rosenbrock, [2.0, 3.0]);
  });
});

describe("beale", () => {
  /** @provenance mathematical-definition (Beale 1958) */
  test("f at minimum is 0", () => verifyMinimum(beale));
  test("gradient at minimum is zero", () => verifyGradientAtMinimum(beale));

  /**
   * @provenance mathematical-definition
   * f(0, 0) = 1.5^2 + 2.25^2 + 2.625^2 = 2.25 + 5.0625 + 6.890625 = 14.203125
   */
  test("f([0, 0]) = 14.203125", () => {
    expect(beale.f([0, 0])).toBeCloseTo(14.203125, 10);
  });

  test("gradient matches finite differences", () => {
    verifyGradientNumerically(beale, [1.0, 0.25]);
  });
});

describe("himmelblau", () => {
  /** @provenance mathematical-definition (Himmelblau 1972) */
  test("f at primary minimum (3, 2) is 0", () => verifyMinimum(himmelblau));
  test("gradient at primary minimum is zero", () => verifyGradientAtMinimum(himmelblau));

  /**
   * @provenance mathematical-definition
   * All four minima have value 0.
   */
  test("f is 0 at all four minima", () => {
    for (const min of himmelblauMinima) {
      expect(himmelblau.f(min)).toBeCloseTo(0, 4);
    }
  });

  /**
   * @provenance mathematical-definition
   * f(0, 0) = (0+0-11)^2 + (0+0-7)^2 = 121 + 49 = 170
   */
  test("f([0, 0]) = 170", () => {
    expect(himmelblau.f([0, 0])).toBe(170);
  });

  test("gradient matches finite differences", () => {
    verifyGradientNumerically(himmelblau, [1.0, 1.0]);
  });
});

describe("goldsteinPrice", () => {
  /**
   * @provenance mathematical-definition (Goldstein & Price 1971)
   * Minimum value is 3 (not 0).
   */
  test("f at minimum is 3", () => verifyMinimum(goldsteinPrice));
  test("gradient at minimum is zero", () => verifyGradientAtMinimum(goldsteinPrice));

  /**
   * @provenance mathematical-definition
   * f(0, 0): a = 1 + 1*19 = 20, b = 30 + 0*18 = 30, f = 600
   */
  test("f([0, 0]) = 600", () => {
    expect(goldsteinPrice.f([0, 0])).toBe(600);
  });

  test("gradient matches finite differences at starting point", () => {
    verifyGradientNumerically(goldsteinPrice, [0, -0.5]);
  });

  test("gradient matches finite differences at [1, 1]", () => {
    verifyGradientNumerically(goldsteinPrice, [1.0, 1.0]);
  });
});

describe("allTestFunctions", () => {
  test("contains 6 functions", () => {
    expect(allTestFunctions.length).toBe(6);
  });

  test("all have matching dimensions in minimumAt and startingPoint", () => {
    for (const tf of allTestFunctions) {
      expect(tf.minimumAt.length).toBe(tf.dimensions);
      expect(tf.startingPoint.length).toBe(tf.dimensions);
    }
  });
});
