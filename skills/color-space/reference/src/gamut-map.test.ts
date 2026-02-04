import { describe, expect, test } from "bun:test";
import { linearRgb, oklch, srgb } from "./color-types.ts";
import { isInGamut, clampToGamut, gamutMapOklch } from "./gamut-map.ts";
import { srgbToLinear } from "./srgb-linear.ts";
import { linearRgbToOklab } from "./oklab.ts";
import { oklabToOklch } from "./oklch.ts";

// @provenance CSS Color Level 4, §13.2 (gamut mapping)

describe("gamut-map", () => {
  describe("isInGamut", () => {
    test("black is in gamut", () => {
      expect(isInGamut(linearRgb(0, 0, 0))).toBe(true);
    });

    test("white is in gamut", () => {
      expect(isInGamut(linearRgb(1, 1, 1))).toBe(true);
    });

    test("mid gray is in gamut", () => {
      expect(isInGamut(linearRgb(0.5, 0.5, 0.5))).toBe(true);
    });

    test("slightly negative is in gamut (within epsilon)", () => {
      expect(isInGamut(linearRgb(-0.0005, 0.5, 0.5))).toBe(true);
    });

    test("clearly negative is out of gamut", () => {
      expect(isInGamut(linearRgb(-0.1, 0.5, 0.5))).toBe(false);
    });

    test("above 1 is out of gamut", () => {
      expect(isInGamut(linearRgb(0.5, 1.5, 0.5))).toBe(false);
    });

    test("slightly above 1 is in gamut (within epsilon)", () => {
      expect(isInGamut(linearRgb(0.5, 1.0005, 0.5))).toBe(true);
    });
  });

  describe("clampToGamut", () => {
    test("in-gamut color passes through", () => {
      const result = clampToGamut(linearRgb(0.5, 0.3, 0.7));
      expect(result.space).toBe("srgb");
    });

    test("negative values clamped to 0", () => {
      const result = clampToGamut(linearRgb(-0.5, 0.3, 0.7));
      expect(result.r).toBeCloseTo(0, 10);
      expect(result.g).toBeGreaterThan(0);
    });

    test("values above 1 clamped to 1", () => {
      const result = clampToGamut(linearRgb(0.5, 1.5, 0.7));
      expect(result.g).toBeCloseTo(1, 10);
    });
  });

  describe("gamutMapOklch", () => {
    test("in-gamut color stays similar", () => {
      // sRGB red in Oklch
      const inGamut = oklch(0.6279, 0.2577, 29.23);
      const result = gamutMapOklch(inGamut);
      expect(result.space).toBe("srgb");
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
    });

    test("out-of-gamut high chroma is brought in", () => {
      // Very high chroma — definitely out of sRGB gamut
      const outOfGamut = oklch(0.5, 0.5, 180);
      const result = gamutMapOklch(outOfGamut);
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeLessThanOrEqual(1);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeLessThanOrEqual(1);
    });

    test("achromatic color works", () => {
      const gray = oklch(0.5, 0, 0);
      const result = gamutMapOklch(gray);
      expect(result.r).toBeCloseTo(result.g, 2);
      expect(result.g).toBeCloseTo(result.b, 2);
    });

    test("preserves lightness approximately", () => {
      const color = oklch(0.7, 0.4, 120);
      const result = gamutMapOklch(color);
      // Convert result back to Oklch to verify lightness preserved
      const lin = srgbToLinear(result);
      const lab = linearRgbToOklab(lin);
      const mapped = oklabToOklch(lab);
      expect(mapped.l).toBeCloseTo(0.7, 1);
    });

    test("very high chroma with different hues", () => {
      const colors = [
        oklch(0.5, 0.8, 0),
        oklch(0.5, 0.8, 90),
        oklch(0.5, 0.8, 270),
      ];
      for (const c of colors) {
        const result = gamutMapOklch(c);
        expect(result.r).toBeGreaterThanOrEqual(0);
        expect(result.r).toBeLessThanOrEqual(1);
        expect(result.g).toBeGreaterThanOrEqual(0);
        expect(result.g).toBeLessThanOrEqual(1);
        expect(result.b).toBeGreaterThanOrEqual(0);
        expect(result.b).toBeLessThanOrEqual(1);
      }
    });

    test("near-achromatic out of gamut", () => {
      // Very small chroma but out-of-gamut due to lightness
      const result = gamutMapOklch(oklch(1.5, 0.0001, 0));
      expect(result.r).toBeLessThanOrEqual(1);
    });

    test("black stays black", () => {
      const result = gamutMapOklch(oklch(0, 0, 0));
      expect(result.r).toBeCloseTo(0, 2);
      expect(result.g).toBeCloseTo(0, 2);
      expect(result.b).toBeCloseTo(0, 2);
    });

    test("white stays white", () => {
      const result = gamutMapOklch(oklch(1, 0, 0));
      expect(result.r).toBeCloseTo(1, 2);
      expect(result.g).toBeCloseTo(1, 2);
      expect(result.b).toBeCloseTo(1, 2);
    });
  });
});
