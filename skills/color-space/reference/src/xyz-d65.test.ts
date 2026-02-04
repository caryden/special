import { describe, expect, test } from "bun:test";
import { linearRgb, xyzD65 } from "./color-types.ts";
import { linearRgbToXyzD65, xyzD65ToLinearRgb } from "./xyz-d65.ts";

// @provenance IEC 61966-2-1:1999 (sRGB-to-XYZ matrix, D65 white point)

describe("xyz-d65", () => {
  describe("linearRgbToXyzD65", () => {
    test("black → origin", () => {
      const result = linearRgbToXyzD65(linearRgb(0, 0, 0));
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    test("white → D65 white point", () => {
      const result = linearRgbToXyzD65(linearRgb(1, 1, 1));
      expect(result.x).toBeCloseTo(0.95047, 4);
      expect(result.y).toBeCloseTo(1.0, 4);
      expect(result.z).toBeCloseTo(1.08883, 3);
    });

    test("pure red", () => {
      const result = linearRgbToXyzD65(linearRgb(1, 0, 0));
      expect(result.x).toBeCloseTo(0.4124, 3);
      expect(result.y).toBeCloseTo(0.2126, 3);
      expect(result.z).toBeCloseTo(0.0193, 3);
    });

    test("pure green", () => {
      const result = linearRgbToXyzD65(linearRgb(0, 1, 0));
      expect(result.x).toBeCloseTo(0.3576, 3);
      expect(result.y).toBeCloseTo(0.7152, 3);
      expect(result.z).toBeCloseTo(0.1192, 3);
    });

    test("pure blue", () => {
      const result = linearRgbToXyzD65(linearRgb(0, 0, 1));
      expect(result.x).toBeCloseTo(0.1805, 3);
      expect(result.y).toBeCloseTo(0.0722, 3);
      expect(result.z).toBeCloseTo(0.9505, 3);
    });
  });

  describe("xyzD65ToLinearRgb", () => {
    test("origin → black", () => {
      const result = xyzD65ToLinearRgb(xyzD65(0, 0, 0));
      expect(result.r).toBeCloseTo(0, 10);
      expect(result.g).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("D65 white → white", () => {
      const result = xyzD65ToLinearRgb(xyzD65(0.95047, 1.0, 1.08883));
      expect(result.r).toBeCloseTo(1, 3);
      expect(result.g).toBeCloseTo(1, 3);
      expect(result.b).toBeCloseTo(1, 3);
    });
  });

  describe("round-trip", () => {
    test("linear RGB → XYZ D65 → linear RGB", () => {
      const colors = [
        linearRgb(1, 0, 0),
        linearRgb(0, 1, 0),
        linearRgb(0, 0, 1),
        linearRgb(0.5, 0.3, 0.7),
        linearRgb(0.1, 0.9, 0.4),
      ];
      for (const c of colors) {
        const xyz = linearRgbToXyzD65(c);
        const back = xyzD65ToLinearRgb(xyz);
        expect(back.r).toBeCloseTo(c.r, 8);
        expect(back.g).toBeCloseTo(c.g, 8);
        expect(back.b).toBeCloseTo(c.b, 8);
      }
    });
  });
});
