import { describe, expect, test } from "bun:test";
import { xyzD65, xyzD50 } from "./color-types.ts";
import { xyzD65ToXyzD50, xyzD50ToXyzD65 } from "./xyz-d50.ts";

// @provenance ICC specification (Bradford chromatic adaptation, D50 white point)

describe("xyz-d50", () => {
  describe("xyzD65ToXyzD50", () => {
    test("origin stays at origin", () => {
      const result = xyzD65ToXyzD50(xyzD65(0, 0, 0));
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    test("D65 white → D50 white", () => {
      const result = xyzD65ToXyzD50(xyzD65(0.95047, 1.0, 1.08883));
      expect(result.x).toBeCloseTo(0.96422, 3);
      expect(result.y).toBeCloseTo(1.0, 3);
      expect(result.z).toBeCloseTo(0.82521, 3);
    });
  });

  describe("xyzD50ToXyzD65", () => {
    test("origin stays at origin", () => {
      const result = xyzD50ToXyzD65(xyzD50(0, 0, 0));
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    test("D50 white → D65 white", () => {
      const result = xyzD50ToXyzD65(xyzD50(0.96422, 1.0, 0.82521));
      expect(result.x).toBeCloseTo(0.95047, 3);
      expect(result.y).toBeCloseTo(1.0, 3);
      expect(result.z).toBeCloseTo(1.08883, 3);
    });
  });

  describe("round-trip", () => {
    test("D65 → D50 → D65 preserves values", () => {
      const colors = [
        xyzD65(0.95047, 1.0, 1.08883),
        xyzD65(0.4124, 0.2126, 0.0193),
        xyzD65(0.3576, 0.7152, 0.1192),
        xyzD65(0.1805, 0.0722, 0.9505),
        xyzD65(0.5, 0.3, 0.7),
      ];
      for (const c of colors) {
        const d50 = xyzD65ToXyzD50(c);
        const back = xyzD50ToXyzD65(d50);
        expect(back.x).toBeCloseTo(c.x, 3);
        expect(back.y).toBeCloseTo(c.y, 3);
        expect(back.z).toBeCloseTo(c.z, 3);
      }
    });
  });
});
