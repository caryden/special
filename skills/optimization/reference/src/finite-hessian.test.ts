/**
 * Tests for finite-difference Hessian estimation.
 *
 * Verifies accuracy of full Hessian and Hessian-vector product
 * against analytic Hessians of standard test functions.
 *
 * @contract finite-hessian.test.ts
 */

import { describe, test, expect } from "bun:test";
import { finiteDiffHessian, hessianVectorProduct } from "./finite-hessian";
import { sphere, booth, rosenbrock } from "./test-functions";

describe("finiteDiffHessian: sphere function", () => {
  test("Hessian of x^2+y^2 is 2*I at origin", () => {
    // H = [[2, 0], [0, 2]] everywhere
    const H = finiteDiffHessian(sphere.f, [0, 0]);
    expect(H.length).toBe(2);
    expect(H[0].length).toBe(2);
    expect(H[0][0]).toBeCloseTo(2, 6);
    expect(H[0][1]).toBeCloseTo(0, 6);
    expect(H[1][0]).toBeCloseTo(0, 6);
    expect(H[1][1]).toBeCloseTo(2, 6);
  });

  test("Hessian of sphere at [5, 3] is still 2*I", () => {
    const H = finiteDiffHessian(sphere.f, [5, 3]);
    expect(H[0][0]).toBeCloseTo(2, 6);
    expect(H[0][1]).toBeCloseTo(0, 6);
    expect(H[1][0]).toBeCloseTo(0, 6);
    expect(H[1][1]).toBeCloseTo(2, 6);
  });

  test("Hessian is symmetric", () => {
    const H = finiteDiffHessian(sphere.f, [1, 2]);
    expect(H[0][1]).toBeCloseTo(H[1][0], 10);
  });
});

describe("finiteDiffHessian: booth function", () => {
  test("Hessian at origin matches analytic", () => {
    // Booth: f = (x+2y-7)^2 + (2x+y-5)^2
    // H = [[2+8, 4+4], [4+4, 8+2]] = [[10, 8], [8, 10]]
    const H = finiteDiffHessian(booth.f, [0, 0]);
    expect(H[0][0]).toBeCloseTo(10, 4);
    expect(H[0][1]).toBeCloseTo(8, 4);
    expect(H[1][0]).toBeCloseTo(8, 4);
    expect(H[1][1]).toBeCloseTo(10, 4);
  });

  test("Hessian at [1, 3] matches (constant Hessian)", () => {
    // Booth is quadratic, so Hessian is constant
    const H = finiteDiffHessian(booth.f, [1, 3]);
    expect(H[0][0]).toBeCloseTo(10, 4);
    expect(H[0][1]).toBeCloseTo(8, 4);
    expect(H[1][0]).toBeCloseTo(8, 4);
    expect(H[1][1]).toBeCloseTo(10, 4);
  });
});

describe("finiteDiffHessian: rosenbrock", () => {
  test("Hessian at [1, 1] (minimum) matches analytic", () => {
    // At (1,1): H = [[1200*1^2 - 400*1 + 2, -400*1], [-400*1, 200]]
    //             = [[802, -400], [-400, 200]]
    const H = finiteDiffHessian(rosenbrock.f, [1, 1]);
    expect(H[0][0]).toBeCloseTo(802, 2);
    expect(H[0][1]).toBeCloseTo(-400, 2);
    expect(H[1][0]).toBeCloseTo(-400, 2);
    expect(H[1][1]).toBeCloseTo(200, 2);
  });

  test("Hessian at [-1.2, 1.0] matches analytic", () => {
    // At (-1.2,1): H = [[1200*1.44 - 400*1 + 2, -400*(-1.2)],
    //                    [-400*(-1.2), 200]]
    //             = [[1328 - 400 + 2, 480], [480, 200]]
    //             = [[1330, 480], [480, 200]]
    // Wait: H_11 = 1200*x^2 - 400*y + 2 = 1200*(1.44) - 400 + 2 = 1728-400+2 = 1330
    const H = finiteDiffHessian(rosenbrock.f, [-1.2, 1.0]);
    expect(H[0][0]).toBeCloseTo(1330, 1);
    expect(H[0][1]).toBeCloseTo(480, 1);
    expect(H[1][0]).toBeCloseTo(480, 1);
    expect(H[1][1]).toBeCloseTo(200, 1);
  });
});

describe("finiteDiffHessian: higher dimensions", () => {
  test("3D sphere has Hessian 2*I", () => {
    const f = (x: number[]) => x[0] ** 2 + x[1] ** 2 + x[2] ** 2;
    const H = finiteDiffHessian(f, [1, 2, 3]);
    expect(H.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(H[i][j]).toBeCloseTo(i === j ? 2 : 0, 5);
      }
    }
  });

  test("1D case: f(x)=x^3, H=[6x]", () => {
    const f = (x: number[]) => x[0] ** 3;
    const H = finiteDiffHessian(f, [2]);
    expect(H.length).toBe(1);
    expect(H[0][0]).toBeCloseTo(12, 2); // 6*2 = 12
  });
});

describe("hessianVectorProduct: sphere", () => {
  test("H*v for sphere is 2*v", () => {
    const x = [1, 2];
    const gx = sphere.gradient(x);
    const v = [3, 4];
    const Hv = hessianVectorProduct(sphere.gradient, x, v, gx);
    expect(Hv[0]).toBeCloseTo(6, 4); // 2*3
    expect(Hv[1]).toBeCloseTo(8, 4); // 2*4
  });

  test("H*e1 for sphere is [2, 0]", () => {
    const x = [5, 5];
    const gx = sphere.gradient(x);
    const Hv = hessianVectorProduct(sphere.gradient, x, [1, 0], gx);
    expect(Hv[0]).toBeCloseTo(2, 4);
    expect(Hv[1]).toBeCloseTo(0, 4);
  });
});

describe("hessianVectorProduct: booth", () => {
  test("H*[1,0] gives first column of Hessian", () => {
    // H = [[10, 8], [8, 10]], so H*[1,0] = [10, 8]
    const x = [0, 0];
    const gx = booth.gradient(x);
    const Hv = hessianVectorProduct(booth.gradient, x, [1, 0], gx);
    expect(Hv[0]).toBeCloseTo(10, 2);
    expect(Hv[1]).toBeCloseTo(8, 2);
  });

  test("H*[1,1] gives [18, 18]", () => {
    // H*[1,1] = [10+8, 8+10] = [18, 18]
    const x = [0, 0];
    const gx = booth.gradient(x);
    const Hv = hessianVectorProduct(booth.gradient, x, [1, 1], gx);
    expect(Hv[0]).toBeCloseTo(18, 2);
    expect(Hv[1]).toBeCloseTo(18, 2);
  });
});

describe("hessianVectorProduct: rosenbrock", () => {
  test("H*v at minimum [1,1]", () => {
    // H = [[802, -400], [-400, 200]], v = [1, 1]
    // Hv = [802-400, -400+200] = [402, -200]
    const x = [1, 1];
    const gx = rosenbrock.gradient(x);
    const v = [1, 1];
    const Hv = hessianVectorProduct(rosenbrock.gradient, x, v, gx);
    expect(Hv[0]).toBeCloseTo(402, 0);
    expect(Hv[1]).toBeCloseTo(-200, 0);
  });

  test("H*v with zero vector returns near-zero", () => {
    const x = [1, 1];
    const gx = rosenbrock.gradient(x);
    const Hv = hessianVectorProduct(rosenbrock.gradient, x, [0, 0], gx);
    expect(Math.abs(Hv[0])).toBeLessThan(1);
    expect(Math.abs(Hv[1])).toBeLessThan(1);
  });
});
