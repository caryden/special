import { describe, expect, test } from "bun:test";
import { labD65, lchD65 } from "./color-types.ts";
import { labD65ToLchD65, lchD65ToLabD65 } from "./lch-d65.ts";

// @provenance CIE 15:2004 (CIELCH polar form)

describe("lch-d65", () => {
  describe("labD65ToLchD65", () => {
    test("achromatic (a=0, b=0) → C=0, H=0", () => {
      const result = labD65ToLchD65(labD65(50, 0, 0));
      expect(result.l).toBeCloseTo(50, 10);
      expect(result.c).toBe(0);
      expect(result.h).toBe(0);
    });

    test("near-achromatic → C=0, H=0", () => {
      const result = labD65ToLchD65(labD65(50, 1e-12, 1e-12));
      expect(result.c).toBe(0);
      expect(result.h).toBe(0);
    });

    test("positive a axis → H ≈ 0", () => {
      const result = labD65ToLchD65(labD65(50, 30, 0));
      expect(result.c).toBeCloseTo(30, 10);
      expect(result.h).toBeCloseTo(0, 10);
    });

    test("positive b axis → H ≈ 90", () => {
      const result = labD65ToLchD65(labD65(50, 0, 30));
      expect(result.c).toBeCloseTo(30, 10);
      expect(result.h).toBeCloseTo(90, 10);
    });

    test("negative a axis → H ≈ 180", () => {
      const result = labD65ToLchD65(labD65(50, -30, 0));
      expect(result.c).toBeCloseTo(30, 10);
      expect(result.h).toBeCloseTo(180, 10);
    });

    test("negative b axis → H ≈ 270", () => {
      const result = labD65ToLchD65(labD65(50, 0, -30));
      expect(result.c).toBeCloseTo(30, 10);
      expect(result.h).toBeCloseTo(270, 10);
    });

    test("chroma computation", () => {
      const result = labD65ToLchD65(labD65(50, 3, 4));
      expect(result.c).toBeCloseTo(5, 10);
    });
  });

  describe("lchD65ToLabD65", () => {
    test("achromatic (C=0) → a=0, b=0", () => {
      const result = lchD65ToLabD65(lchD65(50, 0, 180));
      expect(result.l).toBeCloseTo(50, 10);
      expect(result.a).toBe(0);
      expect(result.b).toBe(0);
    });

    test("H=0 → positive a, b=0", () => {
      const result = lchD65ToLabD65(lchD65(50, 30, 0));
      expect(result.a).toBeCloseTo(30, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("H=90 → a=0, positive b", () => {
      const result = lchD65ToLabD65(lchD65(50, 30, 90));
      expect(result.a).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(30, 10);
    });
  });

  describe("round-trip", () => {
    test("Lab → LCH → Lab", () => {
      const colors = [
        labD65(50, 30, 20),
        labD65(80, -20, 40),
        labD65(30, 10, -50),
        labD65(100, 0, 0),
      ];
      for (const c of colors) {
        const lch = labD65ToLchD65(c);
        const back = lchD65ToLabD65(lch);
        expect(back.l).toBeCloseTo(c.l, 8);
        expect(back.a).toBeCloseTo(c.a, 8);
        expect(back.b).toBeCloseTo(c.b, 8);
      }
    });
  });
});
