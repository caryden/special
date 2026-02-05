import { describe, expect, test } from "bun:test";
import { xyzD65, labD65 } from "./color-types.ts";
import { xyzD65ToLabD65, labD65ToXyzD65 } from "./lab-d65.ts";

// @provenance CIE 15:2004 (CIELAB), IEC 61966-2-1:1999 (D65 white point)

describe("lab-d65", () => {
  describe("xyzD65ToLabD65", () => {
    test("D65 white → L=100, a≈0, b≈0", () => {
      const result = xyzD65ToLabD65(xyzD65(0.95047, 1.0, 1.08883));
      expect(result.l).toBeCloseTo(100, 3);
      expect(result.a).toBeCloseTo(0, 3);
      expect(result.b).toBeCloseTo(0, 3);
    });

    test("black → L=0, a=0, b=0", () => {
      const result = xyzD65ToLabD65(xyzD65(0, 0, 0));
      expect(result.l).toBeCloseTo(0, 3);
      expect(result.a).toBeCloseTo(0, 3);
      expect(result.b).toBeCloseTo(0, 3);
    });

    test("red XYZ → positive a", () => {
      // sRGB red in XYZ D65: approximately (0.4124, 0.2126, 0.0193)
      const result = xyzD65ToLabD65(xyzD65(0.4124, 0.2126, 0.0193));
      expect(result.l).toBeCloseTo(53.23, 1);
      expect(result.a).toBeGreaterThan(0); // Red → positive a
      expect(result.b).toBeGreaterThan(0); // Red → positive b
    });

    test("below epsilon threshold uses linear segment", () => {
      // Very small XYZ values should trigger the linear branch
      const small = xyzD65(0.001, 0.001, 0.001);
      const result = xyzD65ToLabD65(small);
      expect(result.l).toBeGreaterThan(0);
    });
  });

  describe("labD65ToXyzD65", () => {
    test("L=100, a=0, b=0 → D65 white", () => {
      const result = labD65ToXyzD65(labD65(100, 0, 0));
      expect(result.x).toBeCloseTo(0.95047, 3);
      expect(result.y).toBeCloseTo(1.0, 3);
      expect(result.z).toBeCloseTo(1.08883, 3);
    });

    test("L=0 → black", () => {
      const result = labD65ToXyzD65(labD65(0, 0, 0));
      expect(result.x).toBeCloseTo(0, 3);
      expect(result.y).toBeCloseTo(0, 3);
      expect(result.z).toBeCloseTo(0, 3);
    });

    test("L=50 mid-gray", () => {
      const result = labD65ToXyzD65(labD65(50, 0, 0));
      expect(result.y).toBeCloseTo(0.1842, 3); // Y for L=50
    });

    test("inverse of below-epsilon values", () => {
      // L value that produces f(y) below the cube threshold
      const result = labD65ToXyzD65(labD65(5, 0, 0));
      expect(result.y).toBeGreaterThan(0);
      expect(result.y).toBeLessThan(0.01);
    });
  });

  describe("round-trip", () => {
    test("XYZ → Lab → XYZ", () => {
      const colors = [
        xyzD65(0.95047, 1.0, 1.08883),
        xyzD65(0.4124, 0.2126, 0.0193),
        xyzD65(0.3576, 0.7152, 0.1192),
        xyzD65(0.1805, 0.0722, 0.9505),
        xyzD65(0.5, 0.3, 0.7),
        xyzD65(0.001, 0.001, 0.001), // below epsilon
      ];
      for (const c of colors) {
        const lab = xyzD65ToLabD65(c);
        const back = labD65ToXyzD65(lab);
        expect(back.x).toBeCloseTo(c.x, 6);
        expect(back.y).toBeCloseTo(c.y, 6);
        expect(back.z).toBeCloseTo(c.z, 6);
      }
    });
  });
});
