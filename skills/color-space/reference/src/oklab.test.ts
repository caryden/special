import { describe, expect, test } from "bun:test";
import { linearRgb, oklab } from "./color-types.ts";
import { linearRgbToOklab, oklabToLinearRgb } from "./oklab.ts";

// @provenance Björn Ottosson, "A perceptual color space for image processing", 2020

describe("oklab", () => {
  describe("linearRgbToOklab", () => {
    test("black → L=0", () => {
      const result = linearRgbToOklab(linearRgb(0, 0, 0));
      expect(result.l).toBeCloseTo(0, 10);
      expect(result.a).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("white → L≈1, a≈0, b≈0", () => {
      const result = linearRgbToOklab(linearRgb(1, 1, 1));
      expect(result.l).toBeCloseTo(1, 3);
      expect(result.a).toBeCloseTo(0, 3);
      expect(result.b).toBeCloseTo(0, 3);
    });

    test("pure red", () => {
      // Known reference: linear red → Oklab
      const result = linearRgbToOklab(linearRgb(1, 0, 0));
      expect(result.l).toBeCloseTo(0.6279, 3);
      expect(result.a).toBeCloseTo(0.2249, 3);
      expect(result.b).toBeCloseTo(0.1258, 3);
    });

    test("pure green", () => {
      const result = linearRgbToOklab(linearRgb(0, 1, 0));
      expect(result.l).toBeCloseTo(0.8664, 3);
      expect(result.a).toBeCloseTo(-0.2339, 3);
      expect(result.b).toBeCloseTo(0.1795, 3);
    });

    test("pure blue", () => {
      const result = linearRgbToOklab(linearRgb(0, 0, 1));
      expect(result.l).toBeCloseTo(0.4520, 3);
      expect(result.a).toBeCloseTo(-0.0324, 3);
      expect(result.b).toBeCloseTo(-0.3116, 3);
    });
  });

  describe("oklabToLinearRgb", () => {
    test("L=0 → black", () => {
      const result = oklabToLinearRgb(oklab(0, 0, 0));
      expect(result.r).toBeCloseTo(0, 8);
      expect(result.g).toBeCloseTo(0, 8);
      expect(result.b).toBeCloseTo(0, 8);
    });

    test("L=1, a=0, b=0 → white", () => {
      const result = oklabToLinearRgb(oklab(1, 0, 0));
      expect(result.r).toBeCloseTo(1, 3);
      expect(result.g).toBeCloseTo(1, 3);
      expect(result.b).toBeCloseTo(1, 3);
    });
  });

  describe("round-trip", () => {
    test("linear RGB → Oklab → linear RGB", () => {
      const colors = [
        linearRgb(1, 0, 0),
        linearRgb(0, 1, 0),
        linearRgb(0, 0, 1),
        linearRgb(1, 1, 1),
        linearRgb(0.5, 0.3, 0.7),
        linearRgb(0.1, 0.9, 0.4),
      ];
      for (const c of colors) {
        const lab = linearRgbToOklab(c);
        const back = oklabToLinearRgb(lab);
        expect(back.r).toBeCloseTo(c.r, 6);
        expect(back.g).toBeCloseTo(c.g, 6);
        expect(back.b).toBeCloseTo(c.b, 6);
      }
    });
  });
});
