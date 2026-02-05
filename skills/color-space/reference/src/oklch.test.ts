import { describe, expect, test } from "bun:test";
import { oklab, oklch } from "./color-types.ts";
import { oklabToOklch, oklchToOklab } from "./oklch.ts";

// @provenance Björn Ottosson, Oklab/Oklch polar conversion

describe("oklch", () => {
  describe("oklabToOklch", () => {
    test("achromatic (a=0, b=0) → C=0, H=0", () => {
      const result = oklabToOklch(oklab(0.5, 0, 0));
      expect(result.l).toBeCloseTo(0.5, 10);
      expect(result.c).toBe(0);
      expect(result.h).toBe(0);
    });

    test("near-achromatic → C=0, H=0", () => {
      const result = oklabToOklch(oklab(0.5, 1e-12, 1e-12));
      expect(result.c).toBe(0);
      expect(result.h).toBe(0);
    });

    test("positive a axis (red direction) → H ≈ 0", () => {
      const result = oklabToOklch(oklab(0.5, 0.1, 0));
      expect(result.c).toBeCloseTo(0.1, 10);
      expect(result.h).toBeCloseTo(0, 10);
    });

    test("positive b axis → H ≈ 90", () => {
      const result = oklabToOklch(oklab(0.5, 0, 0.1));
      expect(result.c).toBeCloseTo(0.1, 10);
      expect(result.h).toBeCloseTo(90, 10);
    });

    test("negative a axis → H ≈ 180", () => {
      const result = oklabToOklch(oklab(0.5, -0.1, 0));
      expect(result.c).toBeCloseTo(0.1, 10);
      expect(result.h).toBeCloseTo(180, 10);
    });

    test("negative b axis → H ≈ 270", () => {
      const result = oklabToOklch(oklab(0.5, 0, -0.1));
      expect(result.c).toBeCloseTo(0.1, 10);
      expect(result.h).toBeCloseTo(270, 10);
    });

    test("diagonal a=b → H ≈ 45", () => {
      const result = oklabToOklch(oklab(0.5, 0.1, 0.1));
      expect(result.c).toBeCloseTo(Math.sqrt(0.02), 10);
      expect(result.h).toBeCloseTo(45, 10);
    });
  });

  describe("oklchToOklab", () => {
    test("achromatic (C=0) → a=0, b=0", () => {
      const result = oklchToOklab(oklch(0.5, 0, 180));
      expect(result.l).toBeCloseTo(0.5, 10);
      expect(result.a).toBe(0);
      expect(result.b).toBe(0);
    });

    test("H=0 → positive a, b=0", () => {
      const result = oklchToOklab(oklch(0.5, 0.1, 0));
      expect(result.a).toBeCloseTo(0.1, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });

    test("H=90 → a=0, positive b", () => {
      const result = oklchToOklab(oklch(0.5, 0.1, 90));
      expect(result.a).toBeCloseTo(0, 10);
      expect(result.b).toBeCloseTo(0.1, 10);
    });

    test("H=180 → negative a, b=0", () => {
      const result = oklchToOklab(oklch(0.5, 0.1, 180));
      expect(result.a).toBeCloseTo(-0.1, 10);
      expect(result.b).toBeCloseTo(0, 10);
    });
  });

  describe("round-trip", () => {
    test("Oklab → Oklch → Oklab", () => {
      const colors = [
        oklab(0.5, 0.1, 0.05),
        oklab(0.8, -0.15, 0.1),
        oklab(0.3, 0.05, -0.2),
        oklab(1, 0, 0),
      ];
      for (const c of colors) {
        const lch = oklabToOklch(c);
        const back = oklchToOklab(lch);
        expect(back.l).toBeCloseTo(c.l, 8);
        expect(back.a).toBeCloseTo(c.a, 8);
        expect(back.b).toBeCloseTo(c.b, 8);
      }
    });
  });
});
