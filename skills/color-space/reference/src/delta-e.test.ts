import { describe, expect, test } from "bun:test";
import { labD65, oklch } from "./color-types.ts";
import { deltaE76, deltaE2000, deltaEOk } from "./delta-e.ts";

describe("delta-e", () => {
  describe("deltaE76", () => {
    test("identical colors → 0", () => {
      const c = labD65(50, 20, -30);
      expect(deltaE76(c, c)).toBe(0);
    });

    test("known distance", () => {
      // Euclidean: sqrt((60-50)^2 + (30-20)^2 + (-20-(-30))^2) = sqrt(300)
      const a = labD65(50, 20, -30);
      const b = labD65(60, 30, -20);
      expect(deltaE76(a, b)).toBeCloseTo(Math.sqrt(300), 10);
    });

    test("only lightness difference", () => {
      const a = labD65(50, 0, 0);
      const b = labD65(60, 0, 0);
      expect(deltaE76(a, b)).toBeCloseTo(10, 10);
    });

    test("black vs white", () => {
      expect(deltaE76(labD65(0, 0, 0), labD65(100, 0, 0))).toBeCloseTo(100, 10);
    });
  });

  describe("deltaE2000", () => {
    // Test vectors from Sharma et al. 2005 paper (Table 1)
    // @provenance Sharma, Wu, Dalal, 2005, Table 1

    test("identical colors → 0", () => {
      const c = labD65(50, 20, -30);
      expect(deltaE2000(c, c)).toBeCloseTo(0, 10);
    });

    test("pair 1 from Sharma", () => {
      // L1=50.0, a1=2.6772, b1=-79.7751
      // L2=50.0, a2=0.0, b2=-82.7485
      const a = labD65(50.0, 2.6772, -79.7751);
      const b = labD65(50.0, 0.0, -82.7485);
      expect(deltaE2000(a, b)).toBeCloseTo(2.0425, 3);
    });

    test("pair 2 from Sharma", () => {
      const a = labD65(50.0, 3.1571, -77.2803);
      const b = labD65(50.0, 0.0, -82.7485);
      expect(deltaE2000(a, b)).toBeCloseTo(2.8615, 3);
    });

    test("pair 3 from Sharma", () => {
      const a = labD65(50.0, 2.8361, -74.0200);
      const b = labD65(50.0, 0.0, -82.7485);
      expect(deltaE2000(a, b)).toBeCloseTo(3.4412, 3);
    });

    test("pair 7 — achromatic", () => {
      const a = labD65(50.0, 0.0, 0.0);
      const b = labD65(50.0, -1.0, 2.0);
      expect(deltaE2000(a, b)).toBeCloseTo(2.3669, 3);
    });

    test("pair 13 — near-achromatic", () => {
      const a = labD65(50.0, 2.5, 0.0);
      const b = labD65(56.0, -27.0, -3.0);
      expect(deltaE2000(a, b)).toBeCloseTo(31.9030, 3);
    });

    test("pair 4 from Sharma", () => {
      const a = labD65(50.0, 2.4900, -74.9380);
      const b = labD65(50.0, 0.0, -82.7485);
      expect(deltaE2000(a, b)).toBeCloseTo(3.0298, 3);
    });

    test("pair 9 — achromatic vs chromatic", () => {
      const a = labD65(50.0, -1.0, 2.0);
      const b = labD65(50.0, 0.0, 0.0);
      expect(deltaE2000(a, b)).toBeCloseTo(2.3669, 3);
    });

    test("pair 21 — very dark near-neutral", () => {
      const a = labD65(2.0776, 0.0795, -1.135);
      const b = labD65(0.9033, -0.0636, -0.5514);
      expect(deltaE2000(a, b)).toBeCloseTo(0.9082, 3);
    });

    test("pair 25 from Sharma — chromatic pair", () => {
      // @provenance Sharma, Wu, Dalal, 2005, Table 1, pair 25
      const a = labD65(60.2574, -34.0099, 36.2677);
      const b = labD65(60.4626, -34.1751, 39.4387);
      expect(deltaE2000(a, b)).toBeCloseTo(1.2644, 3);
    });

    test("dhp branch: h2p - h1p > 180 (large positive hue gap)", () => {
      // h1p ~4°, h2p ~278° → diff ~274 > 180
      const a = labD65(50.0, 10.0, 1.0);
      const b = labD65(50.0, 1.0, -10.0);
      expect(deltaE2000(a, b)).toBeCloseTo(14.2371, 1);
    });

    test("dhp branch: h2p - h1p < -180", () => {
      // h1p ~266°, h2p ~2° → diff ~-264 < -180
      const a = labD65(50.0, -0.5, -10.0);
      const b = labD65(50.0, 10.0, 0.5);
      expect(deltaE2000(a, b)).toBeCloseTo(16.0275, 1);
    });

    test("hp branch: h1p+h2p < 360", () => {
      const a = labD65(50.0, 5.0, 5.0);
      const b = labD65(50.0, -5.0, 5.0);
      expect(deltaE2000(a, b)).toBeCloseTo(13.7913, 1);
    });

    test("hp branch: h1p+h2p >= 360 and abs(h1p-h2p) > 180", () => {
      // h1p ~352°, h2p ~40° → sum ~393 >= 360, absDiff ~312 > 180
      const a = labD65(50.0, 10.0, -2.0);
      const b = labD65(50.0, 8.0, 10.0);
      expect(deltaE2000(a, b)).toBeCloseTo(10.0268, 1);
    });

    test("custom kL, kC, kH parameters", () => {
      const a = labD65(50, 20, -30);
      const b = labD65(60, 30, -20);
      const defaultResult = deltaE2000(a, b, 1, 1, 1);
      const customResult = deltaE2000(a, b, 2, 1, 1);
      // Higher kL means lightness differences are penalized less
      expect(customResult).toBeLessThan(defaultResult);
    });
  });

  describe("deltaEOk", () => {
    test("identical colors → 0", () => {
      const c = oklch(0.5, 0.15, 180);
      expect(deltaEOk(c, c)).toBeCloseTo(0, 10);
    });

    test("only lightness difference", () => {
      const a = oklch(0.3, 0, 0);
      const b = oklch(0.5, 0, 0);
      expect(deltaEOk(a, b)).toBeCloseTo(0.2, 10);
    });

    test("same hue, different chroma", () => {
      const a = oklch(0.5, 0.1, 90);
      const b = oklch(0.5, 0.2, 90);
      expect(deltaEOk(a, b)).toBeCloseTo(0.1, 6);
    });

    test("opposite hues", () => {
      const a = oklch(0.5, 0.1, 0);
      const b = oklch(0.5, 0.1, 180);
      // Distance should be 2 * chroma (diameter of circle)
      expect(deltaEOk(a, b)).toBeCloseTo(0.2, 6);
    });
  });
});
