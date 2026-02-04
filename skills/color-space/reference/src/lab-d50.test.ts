import { describe, expect, test } from "bun:test";
import { xyzD50, labD50 } from "./color-types.ts";
import { xyzD50ToLabD50, labD50ToXyzD50 } from "./lab-d50.ts";

// @provenance CIE 15:2004 (CIELAB), ICC specification (D50 white point)

describe("lab-d50", () => {
  describe("xyzD50ToLabD50", () => {
    test("D50 white → L=100, a≈0, b≈0", () => {
      const result = xyzD50ToLabD50(xyzD50(0.96422, 1.0, 0.82521));
      expect(result.l).toBeCloseTo(100, 3);
      expect(result.a).toBeCloseTo(0, 3);
      expect(result.b).toBeCloseTo(0, 3);
    });

    test("black → L=0", () => {
      const result = xyzD50ToLabD50(xyzD50(0, 0, 0));
      expect(result.l).toBeCloseTo(0, 3);
    });

    test("below epsilon uses linear segment", () => {
      const result = xyzD50ToLabD50(xyzD50(0.001, 0.001, 0.001));
      expect(result.l).toBeGreaterThan(0);
    });
  });

  describe("labD50ToXyzD50", () => {
    test("L=100, a=0, b=0 → D50 white", () => {
      const result = labD50ToXyzD50(labD50(100, 0, 0));
      expect(result.x).toBeCloseTo(0.96422, 3);
      expect(result.y).toBeCloseTo(1.0, 3);
      expect(result.z).toBeCloseTo(0.82521, 3);
    });

    test("L=0 → black", () => {
      const result = labD50ToXyzD50(labD50(0, 0, 0));
      expect(result.x).toBeCloseTo(0, 3);
      expect(result.y).toBeCloseTo(0, 3);
      expect(result.z).toBeCloseTo(0, 3);
    });

    test("inverse of below-epsilon", () => {
      const result = labD50ToXyzD50(labD50(5, 0, 0));
      expect(result.y).toBeGreaterThan(0);
      expect(result.y).toBeLessThan(0.01);
    });
  });

  describe("round-trip", () => {
    test("XYZ D50 → Lab D50 → XYZ D50", () => {
      const colors = [
        xyzD50(0.96422, 1.0, 0.82521),
        xyzD50(0.4, 0.2, 0.1),
        xyzD50(0.5, 0.7, 0.3),
        xyzD50(0.001, 0.001, 0.001),
      ];
      for (const c of colors) {
        const lab = xyzD50ToLabD50(c);
        const back = labD50ToXyzD50(lab);
        expect(back.x).toBeCloseTo(c.x, 6);
        expect(back.y).toBeCloseTo(c.y, 6);
        expect(back.z).toBeCloseTo(c.z, 6);
      }
    });
  });
});
