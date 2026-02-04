import { test, expect, describe } from "bun:test";
import {
  dot,
  norm,
  normInf,
  scale,
  add,
  sub,
  negate,
  clone,
  zeros,
  addScaled,
} from "./vec-ops";

describe("vec-ops", () => {
  describe("dot", () => {
    test("computes dot product", () => {
      expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    });

    test("returns 0 for zero vectors", () => {
      expect(dot([0, 0], [1, 1])).toBe(0);
    });
  });

  describe("norm", () => {
    test("computes L2 norm", () => {
      expect(norm([3, 4])).toBe(5);
    });

    test("returns 0 for zero vector", () => {
      expect(norm([0, 0, 0])).toBe(0);
    });
  });

  describe("normInf", () => {
    test("returns max absolute value", () => {
      expect(normInf([1, -3, 2])).toBe(3);
    });

    test("returns 0 for zero vector", () => {
      expect(normInf([0, 0])).toBe(0);
    });
  });

  describe("scale", () => {
    test("multiplies by scalar", () => {
      expect(scale([1, 2], 3)).toEqual([3, 6]);
    });

    test("multiplies by zero", () => {
      expect(scale([1, 2], 0)).toEqual([0, 0]);
    });

    test("does not mutate input", () => {
      const v = [1, 2];
      scale(v, 3);
      expect(v).toEqual([1, 2]);
    });
  });

  describe("add", () => {
    test("adds vectors element-wise", () => {
      expect(add([1, 2], [3, 4])).toEqual([4, 6]);
    });

    test("does not mutate inputs", () => {
      const a = [1, 2];
      const b = [3, 4];
      add(a, b);
      expect(a).toEqual([1, 2]);
      expect(b).toEqual([3, 4]);
    });
  });

  describe("sub", () => {
    test("subtracts vectors element-wise", () => {
      expect(sub([3, 4], [1, 2])).toEqual([2, 2]);
    });
  });

  describe("negate", () => {
    test("negates all elements", () => {
      expect(negate([1, -2])).toEqual([-1, 2]);
    });
  });

  describe("clone", () => {
    test("creates a copy", () => {
      expect(clone([1, 2])).toEqual([1, 2]);
    });

    test("creates a distinct array", () => {
      const v = [1, 2];
      const c = clone(v);
      c[0] = 99;
      expect(v[0]).toBe(1);
    });
  });

  describe("zeros", () => {
    test("creates zero vector of given size", () => {
      expect(zeros(3)).toEqual([0, 0, 0]);
    });
  });

  describe("addScaled", () => {
    test("computes a + s*b", () => {
      expect(addScaled([1, 2], [3, 4], 2)).toEqual([7, 10]);
    });
  });
});
