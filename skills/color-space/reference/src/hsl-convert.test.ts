import { describe, expect, test } from "bun:test";
import { srgb, hsl } from "./color-types.ts";
import { srgbToHsl, hslToSrgb } from "./hsl-convert.ts";

// @provenance CSS Color Level 4, §5 (HSL)

describe("hsl-convert", () => {
  describe("srgbToHsl", () => {
    test("black", () => {
      const result = srgbToHsl(srgb(0, 0, 0));
      expect(result).toEqual(hsl(0, 0, 0));
    });

    test("white", () => {
      const result = srgbToHsl(srgb(1, 1, 1));
      expect(result).toEqual(hsl(0, 0, 1));
    });

    test("pure red", () => {
      const result = srgbToHsl(srgb(1, 0, 0));
      expect(result.h).toBeCloseTo(0, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.5, 10);
    });

    test("pure green", () => {
      const result = srgbToHsl(srgb(0, 1, 0));
      expect(result.h).toBeCloseTo(120, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.5, 10);
    });

    test("pure blue", () => {
      const result = srgbToHsl(srgb(0, 0, 1));
      expect(result.h).toBeCloseTo(240, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.5, 10);
    });

    test("50% gray (achromatic)", () => {
      const result = srgbToHsl(srgb(0.5, 0.5, 0.5));
      expect(result.h).toBe(0);
      expect(result.s).toBe(0);
      expect(result.l).toBe(0.5);
    });

    test("yellow", () => {
      const result = srgbToHsl(srgb(1, 1, 0));
      expect(result.h).toBeCloseTo(60, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.5, 10);
    });

    test("cyan", () => {
      const result = srgbToHsl(srgb(0, 1, 1));
      expect(result.h).toBeCloseTo(180, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.5, 10);
    });

    test("magenta", () => {
      const result = srgbToHsl(srgb(1, 0, 1));
      expect(result.h).toBeCloseTo(300, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.5, 10);
    });

    test("dark red (lightness < 0.5)", () => {
      const result = srgbToHsl(srgb(0.5, 0, 0));
      expect(result.h).toBeCloseTo(0, 10);
      expect(result.s).toBeCloseTo(1, 10);
      expect(result.l).toBeCloseTo(0.25, 10);
    });

    test("light blue (lightness > 0.5)", () => {
      const result = srgbToHsl(srgb(0.5, 0.5, 1));
      expect(result.h).toBeCloseTo(240, 10);
      expect(result.l).toBeGreaterThan(0.5);
    });
  });

  describe("hslToSrgb", () => {
    test("black", () => {
      const result = hslToSrgb(hsl(0, 0, 0));
      expect(result).toEqual(srgb(0, 0, 0));
    });

    test("white", () => {
      const result = hslToSrgb(hsl(0, 0, 1));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBeCloseTo(1, 10);
      expect(result.b).toBeCloseTo(1, 10);
    });

    test("pure red", () => {
      const result = hslToSrgb(hsl(0, 1, 0.5));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("pure green", () => {
      const result = hslToSrgb(hsl(120, 1, 0.5));
      expect(result.r).toBeCloseTo(0, 10);
      expect(result.g).toBeCloseTo(1, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("achromatic gray", () => {
      const result = hslToSrgb(hsl(0, 0, 0.5));
      expect(result.r).toBeCloseTo(0.5, 10);
      expect(result.g).toBeCloseTo(0.5, 10);
      expect(result.b).toBeCloseTo(0.5, 10);
    });

    test("achromatic gray with non-zero hue ignored", () => {
      const result = hslToSrgb(hsl(180, 0, 0.5));
      expect(result.r).toBeCloseTo(0.5, 10);
      expect(result.g).toBeCloseTo(0.5, 10);
      expect(result.b).toBeCloseTo(0.5, 10);
    });
  });

  describe("round-trip", () => {
    test("sRGB → HSL → sRGB preserves values", () => {
      const testColors = [
        srgb(1, 0, 0),
        srgb(0, 1, 0),
        srgb(0, 0, 1),
        srgb(0.8, 0.3, 0.6),
        srgb(0.2, 0.7, 0.4),
        srgb(0.5, 0.5, 0.5),
      ];
      for (const c of testColors) {
        const hslVal = srgbToHsl(c);
        const back = hslToSrgb(hslVal);
        expect(back.r).toBeCloseTo(c.r, 8);
        expect(back.g).toBeCloseTo(c.g, 8);
        expect(back.b).toBeCloseTo(c.b, 8);
      }
    });
  });
});
