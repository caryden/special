import { describe, expect, test } from "bun:test";
import { srgb, linearRgb } from "./color-types.ts";
import {
  srgbToLinearComponent, linearToSrgbComponent,
  srgbToLinear, linearToSrgb,
} from "./srgb-linear.ts";

// @provenance IEC 61966-2-1:1999 (sRGB transfer function)

describe("srgb-linear", () => {
  describe("srgbToLinearComponent", () => {
    test("zero stays zero", () => {
      expect(srgbToLinearComponent(0)).toBe(0);
    });

    test("one stays one", () => {
      expect(srgbToLinearComponent(1)).toBeCloseTo(1, 10);
    });

    test("below threshold uses linear segment", () => {
      // 0.04 is below 0.04045
      expect(srgbToLinearComponent(0.04)).toBeCloseTo(0.04 / 12.92, 10);
    });

    test("at threshold boundary (0.04045)", () => {
      // Exactly at threshold — should use linear formula
      expect(srgbToLinearComponent(0.04045)).toBeCloseTo(0.04045 / 12.92, 10);
    });

    test("just above threshold uses gamma curve", () => {
      const val = 0.04046;
      const expected = Math.pow((val + 0.055) / 1.055, 2.4);
      expect(srgbToLinearComponent(val)).toBeCloseTo(expected, 10);
    });

    test("mid-range value (0.5)", () => {
      const expected = Math.pow((0.5 + 0.055) / 1.055, 2.4);
      expect(srgbToLinearComponent(0.5)).toBeCloseTo(expected, 10);
    });

    test("sRGB 0.5 ≈ linear 0.214", () => {
      // @provenance IEC 61966-2-1:1999 transfer function, computed reference
      expect(srgbToLinearComponent(0.5)).toBeCloseTo(0.214041, 4);
    });
  });

  describe("linearToSrgbComponent", () => {
    test("zero stays zero", () => {
      expect(linearToSrgbComponent(0)).toBe(0);
    });

    test("one stays one", () => {
      expect(linearToSrgbComponent(1)).toBeCloseTo(1, 10);
    });

    test("below linear threshold uses linear segment", () => {
      expect(linearToSrgbComponent(0.003)).toBeCloseTo(0.003 * 12.92, 10);
    });

    test("at linear threshold boundary (0.0031308)", () => {
      expect(linearToSrgbComponent(0.0031308)).toBeCloseTo(0.0031308 * 12.92, 10);
    });

    test("just above linear threshold uses gamma curve", () => {
      const val = 0.0031309;
      const expected = 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
      expect(linearToSrgbComponent(val)).toBeCloseTo(expected, 10);
    });

    test("mid-range value (0.5)", () => {
      const expected = 1.055 * Math.pow(0.5, 1 / 2.4) - 0.055;
      expect(linearToSrgbComponent(0.5)).toBeCloseTo(expected, 10);
    });
  });

  describe("round-trip", () => {
    test("sRGB → linear → sRGB preserves values", () => {
      const values = [0, 0.01, 0.04045, 0.1, 0.25, 0.5, 0.75, 1.0];
      for (const v of values) {
        const linear = srgbToLinearComponent(v);
        const back = linearToSrgbComponent(linear);
        expect(back).toBeCloseTo(v, 6);
      }
    });

    test("linear → sRGB → linear preserves values", () => {
      const values = [0, 0.001, 0.0031308, 0.01, 0.1, 0.5, 1.0];
      for (const v of values) {
        const srgbVal = linearToSrgbComponent(v);
        const back = srgbToLinearComponent(srgbVal);
        expect(back).toBeCloseTo(v, 6);
      }
    });
  });

  describe("srgbToLinear (full color)", () => {
    test("converts black", () => {
      const result = srgbToLinear(srgb(0, 0, 0));
      expect(result).toEqual(linearRgb(0, 0, 0));
    });

    test("converts white", () => {
      const result = srgbToLinear(srgb(1, 1, 1));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBeCloseTo(1, 10);
      expect(result.b).toBeCloseTo(1, 10);
      expect(result.space).toBe("linear-rgb");
    });

    test("converts pure red", () => {
      const result = srgbToLinear(srgb(1, 0, 0));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });
  });

  describe("linearToSrgb (full color)", () => {
    test("converts black", () => {
      const result = linearToSrgb(linearRgb(0, 0, 0));
      expect(result).toEqual(srgb(0, 0, 0));
    });

    test("converts white", () => {
      const result = linearToSrgb(linearRgb(1, 1, 1));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBeCloseTo(1, 10);
      expect(result.b).toBeCloseTo(1, 10);
      expect(result.space).toBe("srgb");
    });

    test("round-trip full color", () => {
      const original = srgb(0.8, 0.3, 0.6);
      const linear = srgbToLinear(original);
      const back = linearToSrgb(linear);
      expect(back.r).toBeCloseTo(original.r, 8);
      expect(back.g).toBeCloseTo(original.g, 8);
      expect(back.b).toBeCloseTo(original.b, 8);
    });
  });
});
