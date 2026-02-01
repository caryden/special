import { describe, test, expect } from "bun:test";
import {
  dot, norm, normInf, scale, add, sub, negate, clone, zeros, addScaled,
} from "./vec-ops";

describe("dot", () => {
  test("dot product of two vectors", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  test("dot product of zero vectors", () => {
    expect(dot([0, 0], [0, 0])).toBe(0);
  });

  test("dot product of single element", () => {
    expect(dot([3], [7])).toBe(21);
  });

  test("dot product with negatives", () => {
    expect(dot([1, -2], [-3, 4])).toBe(-11);
  });
});

describe("norm", () => {
  test("norm of [3, 4]", () => {
    expect(norm([3, 4])).toBe(5);
  });

  test("norm of zero vector", () => {
    expect(norm([0, 0, 0])).toBe(0);
  });

  test("norm of unit vector", () => {
    expect(norm([1, 0, 0])).toBe(1);
  });

  test("norm of [1, 1, 1, 1]", () => {
    expect(norm([1, 1, 1, 1])).toBe(2);
  });
});

describe("normInf", () => {
  test("infinity norm picks max absolute value", () => {
    expect(normInf([1, -5, 3])).toBe(5);
  });

  test("infinity norm of zero vector", () => {
    expect(normInf([0, 0])).toBe(0);
  });

  test("infinity norm of single element", () => {
    expect(normInf([-7])).toBe(7);
  });
});

describe("scale", () => {
  test("scale by 2", () => {
    expect(scale([1, 2, 3], 2)).toEqual([2, 4, 6]);
  });

  test("scale by 0", () => {
    expect(scale([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  test("scale by -1", () => {
    expect(scale([1, -2, 3], -1)).toEqual([-1, 2, -3]);
  });

  test("does not mutate input", () => {
    const v = [1, 2, 3];
    scale(v, 5);
    expect(v).toEqual([1, 2, 3]);
  });
});

describe("add", () => {
  test("add two vectors", () => {
    expect(add([1, 2], [3, 4])).toEqual([4, 6]);
  });

  test("add with zero vector", () => {
    expect(add([1, 2], [0, 0])).toEqual([1, 2]);
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
  test("subtract two vectors", () => {
    expect(sub([5, 3], [2, 1])).toEqual([3, 2]);
  });

  test("subtract from self gives zeros", () => {
    expect(sub([7, 8], [7, 8])).toEqual([0, 0]);
  });

  test("does not mutate inputs", () => {
    const a = [5, 3];
    const b = [2, 1];
    sub(a, b);
    expect(a).toEqual([5, 3]);
    expect(b).toEqual([2, 1]);
  });
});

describe("negate", () => {
  test("negate vector", () => {
    expect(negate([1, -2, 3])).toEqual([-1, 2, -3]);
  });

  test("negate zero vector", () => {
    const result = negate([0, 0]);
    expect(result.length).toBe(2);
    expect(result[0] + 0).toBe(0); // handles -0
    expect(result[1] + 0).toBe(0);
  });
});

describe("clone", () => {
  test("clone produces equal array", () => {
    const v = [1, 2, 3];
    expect(clone(v)).toEqual([1, 2, 3]);
  });

  test("clone is a separate reference", () => {
    const v = [1, 2, 3];
    const c = clone(v);
    c[0] = 99;
    expect(v[0]).toBe(1);
  });
});

describe("zeros", () => {
  test("zeros(3)", () => {
    expect(zeros(3)).toEqual([0, 0, 0]);
  });

  test("zeros(1)", () => {
    expect(zeros(1)).toEqual([0]);
  });

  test("zeros(0)", () => {
    expect(zeros(0)).toEqual([]);
  });
});

describe("addScaled", () => {
  test("a + 2*b", () => {
    expect(addScaled([1, 2], [3, 4], 2)).toEqual([7, 10]);
  });

  test("a + 0*b = a", () => {
    expect(addScaled([1, 2], [3, 4], 0)).toEqual([1, 2]);
  });

  test("a + (-1)*b = sub(a, b)", () => {
    expect(addScaled([5, 3], [2, 1], -1)).toEqual([3, 2]);
  });

  test("does not mutate inputs", () => {
    const a = [1, 2];
    const b = [3, 4];
    addScaled(a, b, 2);
    expect(a).toEqual([1, 2]);
    expect(b).toEqual([3, 4]);
  });
});
