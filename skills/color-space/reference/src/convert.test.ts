import { describe, expect, test } from "bun:test";
import {
  srgb, linearRgb, hsl, hwb, xyzD65, xyzD50,
  labD65, labD50, lchD65, oklab, oklch,
  type ColorSpace,
} from "./color-types.ts";
import { convert } from "./convert.ts";

// @provenance Structural — routes through linear RGB hub

describe("convert", () => {
  describe("identity", () => {
    test("sRGB → sRGB", () => {
      const c = srgb(1, 0, 0);
      const result = convert(c, "srgb");
      expect(result).toEqual(c);
    });

    test("Oklab → Oklab", () => {
      const c = oklab(0.5, 0.1, -0.1);
      const result = convert(c, "oklab");
      expect(result).toEqual(c);
    });
  });

  describe("sRGB conversions", () => {
    test("sRGB → HSL → sRGB round-trip", () => {
      const c = srgb(0.8, 0.3, 0.6);
      const hslResult = convert(c, "hsl");
      expect(hslResult.space).toBe("hsl");
      const back = convert(hslResult, "srgb");
      expect(back.r).toBeCloseTo(c.r, 6);
      expect(back.g).toBeCloseTo(c.g, 6);
      expect(back.b).toBeCloseTo(c.b, 6);
    });

    test("sRGB → HWB → sRGB round-trip", () => {
      const c = srgb(0.8, 0.3, 0.6);
      const hwbResult = convert(c, "hwb");
      expect(hwbResult.space).toBe("hwb");
      const back = convert(hwbResult, "srgb");
      expect(back.r).toBeCloseTo(c.r, 6);
      expect(back.g).toBeCloseTo(c.g, 6);
      expect(back.b).toBeCloseTo(c.b, 6);
    });

    test("sRGB → linear-rgb → sRGB round-trip", () => {
      const c = srgb(0.5, 0.7, 0.2);
      const lin = convert(c, "linear-rgb");
      expect(lin.space).toBe("linear-rgb");
      const back = convert(lin, "srgb");
      expect(back.r).toBeCloseTo(c.r, 6);
      expect(back.g).toBeCloseTo(c.g, 6);
      expect(back.b).toBeCloseTo(c.b, 6);
    });
  });

  describe("XYZ conversions", () => {
    test("sRGB → XYZ D65", () => {
      const c = srgb(1, 0, 0);
      const xyz = convert(c, "xyz-d65");
      expect(xyz.space).toBe("xyz-d65");
      expect(xyz.x).toBeCloseTo(0.4124, 3);
      expect(xyz.y).toBeCloseTo(0.2126, 3);
    });

    test("sRGB → XYZ D50 → sRGB round-trip", () => {
      const c = srgb(0.5, 0.7, 0.2);
      const d50 = convert(c, "xyz-d50");
      expect(d50.space).toBe("xyz-d50");
      const back = convert(d50, "srgb");
      expect(back.r).toBeCloseTo(c.r, 3);
      expect(back.g).toBeCloseTo(c.g, 3);
      expect(back.b).toBeCloseTo(c.b, 3);
    });
  });

  describe("Lab/LCH conversions", () => {
    test("sRGB → Lab D65 → sRGB round-trip", () => {
      const c = srgb(0.8, 0.3, 0.6);
      const lab = convert(c, "lab-d65");
      expect(lab.space).toBe("lab-d65");
      const back = convert(lab, "srgb");
      expect(back.r).toBeCloseTo(c.r, 3);
      expect(back.g).toBeCloseTo(c.g, 3);
      expect(back.b).toBeCloseTo(c.b, 3);
    });

    test("sRGB → Lab D50 → sRGB round-trip", () => {
      const c = srgb(0.5, 0.7, 0.2);
      const lab = convert(c, "lab-d50");
      expect(lab.space).toBe("lab-d50");
      const back = convert(lab, "srgb");
      expect(back.r).toBeCloseTo(c.r, 3);
      expect(back.g).toBeCloseTo(c.g, 3);
      expect(back.b).toBeCloseTo(c.b, 3);
    });

    test("sRGB → LCH D65 → sRGB round-trip", () => {
      const c = srgb(0.8, 0.3, 0.6);
      const lch = convert(c, "lch-d65");
      expect(lch.space).toBe("lch-d65");
      const back = convert(lch, "srgb");
      expect(back.r).toBeCloseTo(c.r, 3);
      expect(back.g).toBeCloseTo(c.g, 3);
      expect(back.b).toBeCloseTo(c.b, 3);
    });
  });

  describe("Oklab/Oklch conversions", () => {
    test("sRGB → Oklab → sRGB round-trip", () => {
      const c = srgb(0.8, 0.3, 0.6);
      const ok = convert(c, "oklab");
      expect(ok.space).toBe("oklab");
      const back = convert(ok, "srgb");
      expect(back.r).toBeCloseTo(c.r, 3);
      expect(back.g).toBeCloseTo(c.g, 3);
      expect(back.b).toBeCloseTo(c.b, 3);
    });

    test("sRGB → Oklch → sRGB round-trip", () => {
      const c = srgb(0.8, 0.3, 0.6);
      const ok = convert(c, "oklch");
      expect(ok.space).toBe("oklch");
      const back = convert(ok, "srgb");
      expect(back.r).toBeCloseTo(c.r, 3);
      expect(back.g).toBeCloseTo(c.g, 3);
      expect(back.b).toBeCloseTo(c.b, 3);
    });
  });

  describe("cross-space conversions", () => {
    test("HSL → Oklab", () => {
      const c = hsl(120, 1, 0.5);
      const ok = convert(c, "oklab");
      expect(ok.space).toBe("oklab");
      expect(ok.l).toBeGreaterThan(0);
    });

    test("HWB → Lab D65", () => {
      const c = hwb(0, 0, 0);
      const lab = convert(c, "lab-d65");
      expect(lab.space).toBe("lab-d65");
      // Red → high positive a
      expect(lab.a).toBeGreaterThan(0);
    });

    test("Oklch → XYZ D50", () => {
      const c = oklch(0.7, 0.15, 180);
      const d50 = convert(c, "xyz-d50");
      expect(d50.space).toBe("xyz-d50");
    });

    test("LCH D65 → Oklch", () => {
      const c = lchD65(50, 30, 270);
      const ok = convert(c, "oklch");
      expect(ok.space).toBe("oklch");
    });

    test("Lab D50 → HSL", () => {
      const c = labD50(50, 20, -30);
      const result = convert(c, "hsl");
      expect(result.space).toBe("hsl");
    });

    test("XYZ D65 → HWB", () => {
      const c = xyzD65(0.4, 0.2, 0.1);
      const result = convert(c, "hwb");
      expect(result.space).toBe("hwb");
    });

    test("XYZ D50 → Oklch", () => {
      const c = xyzD50(0.4, 0.3, 0.2);
      const result = convert(c, "oklch");
      expect(result.space).toBe("oklch");
    });

    test("linear-rgb → LCH D65", () => {
      const c = linearRgb(0.5, 0.3, 0.7);
      const result = convert(c, "lch-d65");
      expect(result.space).toBe("lch-d65");
    });
  });

  describe("black and white through all spaces", () => {
    const spaces: ColorSpace[] = [
      "srgb", "linear-rgb", "hsl", "hwb", "xyz-d65", "xyz-d50",
      "lab-d65", "lab-d50", "lch-d65", "oklab", "oklch",
    ];

    test("white converts to all spaces and back", () => {
      const white = srgb(1, 1, 1);
      for (const space of spaces) {
        const converted = convert(white, space);
        expect(converted.space).toBe(space);
        const back = convert(converted, "srgb");
        expect(back.r).toBeCloseTo(1, 2);
        expect(back.g).toBeCloseTo(1, 2);
        expect(back.b).toBeCloseTo(1, 2);
      }
    });

    test("black converts to all spaces and back", () => {
      const black = srgb(0, 0, 0);
      for (const space of spaces) {
        const converted = convert(black, space);
        expect(converted.space).toBe(space);
        const back = convert(converted, "srgb");
        expect(back.r).toBeCloseTo(0, 2);
        expect(back.g).toBeCloseTo(0, 2);
        expect(back.b).toBeCloseTo(0, 2);
      }
    });
  });
});
