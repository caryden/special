import { describe, expect, test } from "bun:test";
import { srgb, hwb } from "./color-types.ts";
import { srgbToHwb, hwbToSrgb } from "./hwb-convert.ts";

// @provenance CSS Color Level 4, §7.2 (HWB)

describe("hwb-convert", () => {
  describe("srgbToHwb", () => {
    test("black", () => {
      const result = srgbToHwb(srgb(0, 0, 0));
      expect(result.h).toBe(0);
      expect(result.w).toBe(0);
      expect(result.b).toBe(1);
    });

    test("white", () => {
      const result = srgbToHwb(srgb(1, 1, 1));
      expect(result.h).toBe(0);
      expect(result.w).toBe(1);
      expect(result.b).toBe(0);
    });

    test("pure red", () => {
      const result = srgbToHwb(srgb(1, 0, 0));
      expect(result.h).toBeCloseTo(0, 10);
      expect(result.w).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("pure green", () => {
      const result = srgbToHwb(srgb(0, 1, 0));
      expect(result.h).toBeCloseTo(120, 10);
      expect(result.w).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("pure blue", () => {
      const result = srgbToHwb(srgb(0, 0, 1));
      expect(result.h).toBeCloseTo(240, 10);
      expect(result.w).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("50% gray", () => {
      const result = srgbToHwb(srgb(0.5, 0.5, 0.5));
      expect(result.h).toBe(0);
      expect(result.w).toBeCloseTo(0.5, 10);
      expect(result.b).toBeCloseTo(0.5, 10);
    });
  });

  describe("hwbToSrgb", () => {
    test("pure red (h=0, w=0, b=0)", () => {
      const result = hwbToSrgb(hwb(0, 0, 0));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("white (w=1, b=0)", () => {
      const result = hwbToSrgb(hwb(0, 1, 0));
      expect(result.r).toBeCloseTo(1, 10);
      expect(result.g).toBeCloseTo(1, 10);
      expect(result.b).toBeCloseTo(1, 10);
    });

    test("black (w=0, b=1)", () => {
      const result = hwbToSrgb(hwb(0, 0, 1));
      expect(result.r).toBeCloseTo(0, 10);
      expect(result.g).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("normalization when w+b >= 1", () => {
      // w=0.6, b=0.6 — sum is 1.2, normalize to gray
      const result = hwbToSrgb(hwb(0, 0.6, 0.6));
      const expected = 0.6 / 1.2; // 0.5
      expect(result.r).toBeCloseTo(expected, 10);
      expect(result.g).toBeCloseTo(expected, 10);
      expect(result.b).toBeCloseTo(expected, 10);
    });

    test("normalization when w+b = 1", () => {
      const result = hwbToSrgb(hwb(120, 0.3, 0.7));
      const expected = 0.3 / 1.0;
      expect(result.r).toBeCloseTo(expected, 10);
      expect(result.g).toBeCloseTo(expected, 10);
      expect(result.b).toBeCloseTo(expected, 10);
    });

    test("50% gray (w=0.5, b=0.5)", () => {
      const result = hwbToSrgb(hwb(0, 0.5, 0.5));
      expect(result.r).toBeCloseTo(0.5, 10);
      expect(result.g).toBeCloseTo(0.5, 10);
      expect(result.b).toBeCloseTo(0.5, 10);
    });
  });

  describe("hwbToSrgb hue sectors", () => {
    test("hue in sector 1 (60-120)", () => {
      const result = hwbToSrgb(hwb(90, 0, 0));
      expect(result.r).toBeCloseTo(0.5, 2);
      expect(result.g).toBeCloseTo(1, 2);
    });

    test("hue in sector 2 (120-180)", () => {
      const result = hwbToSrgb(hwb(150, 0, 0));
      expect(result.g).toBeCloseTo(1, 2);
    });

    test("hue in sector 3 (180-240)", () => {
      const result = hwbToSrgb(hwb(210, 0, 0));
      expect(result.b).toBeGreaterThan(0.4);
    });

    test("hue in sector 4 (240-300)", () => {
      const result = hwbToSrgb(hwb(270, 0, 0));
      expect(result.b).toBeCloseTo(1, 2);
    });

    test("hue in sector 5 (300-360)", () => {
      const result = hwbToSrgb(hwb(330, 0, 0));
      expect(result.r).toBeCloseTo(1, 2);
    });
  });

  describe("round-trip", () => {
    test("sRGB → HWB → sRGB preserves values", () => {
      const testColors = [
        srgb(1, 0, 0),
        srgb(0, 1, 0),
        srgb(0, 0, 1),
        srgb(0.8, 0.3, 0.6),
        srgb(0.2, 0.7, 0.4),
      ];
      for (const c of testColors) {
        const hwbVal = srgbToHwb(c);
        const back = hwbToSrgb(hwbVal);
        expect(back.r).toBeCloseTo(c.r, 8);
        expect(back.g).toBeCloseTo(c.g, 8);
        expect(back.b).toBeCloseTo(c.b, 8);
      }
    });
  });
});
