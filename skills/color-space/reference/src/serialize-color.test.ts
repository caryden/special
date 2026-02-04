import { describe, expect, test } from "bun:test";
import {
  srgb, linearRgb, hsl, hwb, xyzD65, xyzD50,
  labD65, labD50, lchD65, oklab, oklch,
} from "./color-types.ts";
import { serializeColor } from "./serialize-color.ts";
import { parseColor } from "./parse-color.ts";

// @provenance CSS Color Level 4 (color serialization)

describe("serialize-color", () => {
  test("sRGB", () => {
    expect(serializeColor(srgb(1, 0, 0))).toBe("rgb(255, 0, 0)");
  });

  test("sRGB mid values", () => {
    expect(serializeColor(srgb(0.5, 0.5, 0.5))).toBe("rgb(128, 128, 128)");
  });

  test("sRGB clamps out of range", () => {
    expect(serializeColor(srgb(1.5, -0.1, 0.5))).toBe("rgb(255, 0, 128)");
  });

  test("linear-rgb", () => {
    expect(serializeColor(linearRgb(0.5, 0.3, 0.7))).toBe("color(srgb-linear 0.5 0.3 0.7)");
  });

  test("hsl", () => {
    expect(serializeColor(hsl(120, 1, 0.5))).toBe("hsl(120, 100%, 50%)");
  });

  test("hsl with decimals", () => {
    expect(serializeColor(hsl(240, 0.75, 0.333))).toBe("hsl(240, 75%, 33.3%)");
  });

  test("hwb", () => {
    expect(serializeColor(hwb(0, 0, 0))).toBe("hwb(0 0% 0%)");
  });

  test("hwb with values", () => {
    expect(serializeColor(hwb(120, 0.2, 0.3))).toBe("hwb(120 20% 30%)");
  });

  test("xyz-d65", () => {
    expect(serializeColor(xyzD65(0.95047, 1, 1.08883))).toBe("color(xyz-d65 0.9505 1 1.0888)");
  });

  test("xyz-d50", () => {
    expect(serializeColor(xyzD50(0.96422, 1, 0.82521))).toBe("color(xyz-d50 0.9642 1 0.8252)");
  });

  test("lab-d65", () => {
    expect(serializeColor(labD65(50, 20, -30))).toBe("lab(50 20 -30)");
  });

  test("lab-d50", () => {
    expect(serializeColor(labD50(100, 0, 0))).toBe("lab(100 0 0)");
  });

  test("lch-d65", () => {
    expect(serializeColor(lchD65(50, 30, 270))).toBe("lch(50 30 270)");
  });

  test("oklab", () => {
    expect(serializeColor(oklab(0.5, 0.1, -0.1))).toBe("oklab(0.5 0.1 -0.1)");
  });

  test("oklch", () => {
    expect(serializeColor(oklch(0.7, 0.15, 180))).toBe("oklch(0.7 0.15 180)");
  });

  test("rounds to 4 decimal places", () => {
    expect(serializeColor(oklab(0.123456789, 0, 0))).toBe("oklab(0.1235 0 0)");
  });

  describe("parse → serialize round-trip", () => {
    test("rgb round-trips", () => {
      const css = "rgb(255, 0, 128)";
      const parsed = parseColor(css);
      expect(serializeColor(parsed)).toBe("rgb(255, 0, 128)");
    });

    test("hsl round-trips", () => {
      const css = "hsl(120, 100%, 50%)";
      const parsed = parseColor(css);
      expect(serializeColor(parsed)).toBe("hsl(120, 100%, 50%)");
    });

    test("oklch round-trips", () => {
      const css = "oklch(0.7 0.15 180)";
      const parsed = parseColor(css);
      expect(serializeColor(parsed)).toBe("oklch(0.7 0.15 180)");
    });
  });
});
