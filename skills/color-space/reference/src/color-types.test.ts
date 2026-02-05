import { describe, expect, test } from "bun:test";
import {
  srgb, linearRgb, hsl, hwb, xyzD65, xyzD50,
  labD65, labD50, lchD65, oklab, oklch,
  type Color, type ColorSpace,
} from "./color-types.ts";

describe("color-types", () => {
  test("srgb factory", () => {
    const c = srgb(1, 0, 0);
    expect(c).toEqual({ space: "srgb", r: 1, g: 0, b: 0 });
  });

  test("linearRgb factory", () => {
    const c = linearRgb(0.5, 0.5, 0.5);
    expect(c).toEqual({ space: "linear-rgb", r: 0.5, g: 0.5, b: 0.5 });
  });

  test("hsl factory", () => {
    const c = hsl(120, 1, 0.5);
    expect(c).toEqual({ space: "hsl", h: 120, s: 1, l: 0.5 });
  });

  test("hwb factory", () => {
    const c = hwb(0, 0, 0);
    expect(c).toEqual({ space: "hwb", h: 0, w: 0, b: 0 });
  });

  test("xyzD65 factory", () => {
    const c = xyzD65(0.95047, 1.0, 1.08883);
    expect(c).toEqual({ space: "xyz-d65", x: 0.95047, y: 1.0, z: 1.08883 });
  });

  test("xyzD50 factory", () => {
    const c = xyzD50(0.96422, 1.0, 0.82521);
    expect(c).toEqual({ space: "xyz-d50", x: 0.96422, y: 1.0, z: 0.82521 });
  });

  test("labD65 factory", () => {
    const c = labD65(50, 20, -30);
    expect(c).toEqual({ space: "lab-d65", l: 50, a: 20, b: -30 });
  });

  test("labD50 factory", () => {
    const c = labD50(100, 0, 0);
    expect(c).toEqual({ space: "lab-d50", l: 100, a: 0, b: 0 });
  });

  test("lchD65 factory", () => {
    const c = lchD65(50, 30, 270);
    expect(c).toEqual({ space: "lch-d65", l: 50, c: 30, h: 270 });
  });

  test("oklab factory", () => {
    const c = oklab(0.5, 0.1, -0.1);
    expect(c).toEqual({ space: "oklab", l: 0.5, a: 0.1, b: -0.1 });
  });

  test("oklch factory", () => {
    const c = oklch(0.7, 0.15, 180);
    expect(c).toEqual({ space: "oklch", l: 0.7, c: 0.15, h: 180 });
  });

  test("Color union accepts all types", () => {
    const colors: Color[] = [
      srgb(1, 0, 0),
      linearRgb(1, 0, 0),
      hsl(0, 1, 0.5),
      hwb(0, 0, 0),
      xyzD65(0.4, 0.2, 0.1),
      xyzD50(0.4, 0.2, 0.1),
      labD65(50, 20, -30),
      labD50(50, 20, -30),
      lchD65(50, 30, 270),
      oklab(0.5, 0.1, -0.1),
      oklch(0.7, 0.15, 180),
    ];
    expect(colors).toHaveLength(11);
  });

  test("space discriminant is correct for each type", () => {
    const spaces: ColorSpace[] = [
      "srgb", "linear-rgb", "hsl", "hwb",
      "xyz-d65", "xyz-d50", "lab-d65", "lab-d50",
      "lch-d65", "oklab", "oklch",
    ];
    const colors: Color[] = [
      srgb(0, 0, 0), linearRgb(0, 0, 0), hsl(0, 0, 0), hwb(0, 0, 0),
      xyzD65(0, 0, 0), xyzD50(0, 0, 0), labD65(0, 0, 0), labD50(0, 0, 0),
      lchD65(0, 0, 0), oklab(0, 0, 0), oklch(0, 0, 0),
    ];
    for (let i = 0; i < colors.length; i++) {
      expect(colors[i].space).toBe(spaces[i]);
    }
  });
});
