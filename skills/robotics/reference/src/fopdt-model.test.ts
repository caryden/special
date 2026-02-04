import { describe, expect, test } from 'bun:test';
import {
  fopdtModel,
  validateFOPDT,
  simulateFOPDT,
  identifyFOPDT,
} from './fopdt-model';

describe('fopdt-model', () => {
  // -------------------------------------------------------------------------
  // simulateFOPDT
  // -------------------------------------------------------------------------

  describe('simulateFOPDT', () => {
    const model = fopdtModel(2.0, 5.0, 1.0); // K=2, τ=5, θ=1

    test('y(0) = 0 (before dead time)', () => {
      const y = simulateFOPDT(model, [0]);
      expect(y[0]).toBe(0);
    });

    test('y(θ) = 0 (exactly at dead time onset)', () => {
      const y = simulateFOPDT(model, [1.0]);
      expect(y[0]).toBeCloseTo(0, 10);
    });

    test('y(θ + τ) ≈ 0.632 * K', () => {
      // At t = θ + τ = 6, y = K * (1 - exp(-1)) ≈ 0.632 * K
      const y = simulateFOPDT(model, [6.0]);
      expect(y[0]).toBeCloseTo(0.632 * 2.0, 2);
    });

    test('y(∞) ≈ K (large time)', () => {
      const y = simulateFOPDT(model, [1000]);
      expect(y[0]).toBeCloseTo(2.0, 5);
    });
  });

  // -------------------------------------------------------------------------
  // identifyFOPDT
  // -------------------------------------------------------------------------

  describe('identifyFOPDT', () => {
    test('identifies K accurately from step response', () => {
      const model = fopdtModel(3.0, 10.0, 2.0);
      const time = Array.from({ length: 2001 }, (_, i) => i * 0.1); // 0 to 200s
      const response = simulateFOPDT(model, time);
      const identified = identifyFOPDT(time, response, 1.0);
      expect(identified.K).toBeCloseTo(3.0, 1);
    });

    test('identifies τ accurately from step response', () => {
      const model = fopdtModel(1.5, 8.0, 1.0);
      const time = Array.from({ length: 2001 }, (_, i) => i * 0.1);
      const response = simulateFOPDT(model, time);
      const identified = identifyFOPDT(time, response, 1.0);
      expect(identified.tau).toBeCloseTo(8.0, 0);
    });

    test('identifies θ accurately from step response', () => {
      const model = fopdtModel(2.0, 5.0, 3.0);
      const time = Array.from({ length: 2001 }, (_, i) => i * 0.1);
      const response = simulateFOPDT(model, time);
      const identified = identifyFOPDT(time, response, 1.0);
      expect(identified.theta).toBeCloseTo(3.0, 0);
    });

    test('identifies model with large time constant', () => {
      const model = fopdtModel(1.0, 50.0, 5.0);
      const time = Array.from({ length: 10001 }, (_, i) => i * 0.1);
      const response = simulateFOPDT(model, time);
      const identified = identifyFOPDT(time, response, 1.0);
      expect(identified.K).toBeCloseTo(1.0, 1);
      expect(identified.tau).toBeCloseTo(50.0, -1); // within ~10
    });
  });

  // -------------------------------------------------------------------------
  // Round-trip: create → simulate → identify → compare
  // -------------------------------------------------------------------------

  describe('round-trip', () => {
    test('round-trip with typical process parameters', () => {
      const original = fopdtModel(2.5, 10.0, 2.0);
      const time = Array.from({ length: 3001 }, (_, i) => i * 0.05); // fine resolution
      const response = simulateFOPDT(original, time);
      const identified = identifyFOPDT(time, response, 1.0);

      expect(identified.K).toBeCloseTo(original.K, 1); // K ± 1%
      expect(Math.abs(identified.tau - original.tau) / original.tau).toBeLessThan(0.05); // τ ± 5%
      expect(Math.abs(identified.theta - original.theta) / original.theta).toBeLessThan(0.05); // θ ± 5%
    });

    test('round-trip with fast dynamics', () => {
      const original = fopdtModel(0.8, 1.0, 0.5);
      const time = Array.from({ length: 5001 }, (_, i) => i * 0.005);
      const response = simulateFOPDT(original, time);
      const identified = identifyFOPDT(time, response, 1.0);

      expect(identified.K).toBeCloseTo(original.K, 1);
      expect(Math.abs(identified.tau - original.tau) / original.tau).toBeLessThan(0.05);
      expect(Math.abs(identified.theta - original.theta) / original.theta).toBeLessThan(0.05);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    test('zero dead time (θ = 0)', () => {
      const model = fopdtModel(1.0, 5.0, 0.0);
      const time = Array.from({ length: 2001 }, (_, i) => i * 0.05);
      const response = simulateFOPDT(model, time);
      const identified = identifyFOPDT(time, response, 1.0);

      expect(identified.K).toBeCloseTo(1.0, 1);
      expect(identified.theta).toBeCloseTo(0.0, 0);
      expect(identified.tau).toBeCloseTo(5.0, 0);
    });

    test('very small τ', () => {
      const model = fopdtModel(1.0, 0.1, 1.0);
      const time = Array.from({ length: 10001 }, (_, i) => i * 0.001);
      const response = simulateFOPDT(model, time);
      const identified = identifyFOPDT(time, response, 1.0);

      expect(identified.K).toBeCloseTo(1.0, 1);
      expect(identified.tau).toBeCloseTo(0.1, 1);
    });

    test('decreasing response triggers interpolation fallback gracefully', () => {
      // Response goes down but we claim initialValue=0, so target63 is negative
      // and above the actual response. The 28.3% target = 0 + 0.283*(-10) = -2.83
      // The response [0, -1, -2, ...] crosses -2.83, but 63.2% target = -6.32
      // may also be crossed. Use a case where response doesn't reach 63.2%:
      // response = [10, 9.5, 9, 8.5] with initialValue=0 => deltaY=8.5
      // target63 = 0.632*8.5 = 5.372 — response starts at 10 and is always > 5.372
      // So target is never crossed from below.
      // Actually: prev <= 5.372 is false for all values >= 8.5, so no crossing.
      // But wait, response[0]=10 > target and all subsequent are also > target.
      // The condition checks both directions, so prev >= target && curr <= target
      // would need curr <= 5.372 which never happens. So fallback triggers!
      const time = [0, 1, 2, 3];
      const response = [10, 9.5, 9.0, 8.5];
      const identified = identifyFOPDT(time, response, 1.0, 0);
      // K = 8.5 / 1 = 8.5, but tau/theta use fallback times
      expect(identified.K).toBe(8.5);
      expect(typeof identified.tau).toBe('number');
    });

    test('step with non-zero initial value', () => {
      const model = fopdtModel(2.0, 5.0, 1.0);
      const time = Array.from({ length: 2001 }, (_, i) => i * 0.1);
      const baseResponse = simulateFOPDT(model, time);
      // Shift response up by 10
      const offset = 10;
      const response = baseResponse.map((v) => v + offset);
      // Step size is 1.0, initial value is offset
      const identified = identifyFOPDT(time, response, 1.0, offset);

      expect(identified.K).toBeCloseTo(2.0, 1);
      expect(identified.tau).toBeCloseTo(5.0, 0);
      expect(identified.theta).toBeCloseTo(1.0, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  describe('validation', () => {
    test('valid model returns true', () => {
      expect(validateFOPDT(fopdtModel(2.0, 5.0, 1.0))).toBe(true);
      expect(validateFOPDT(fopdtModel(-1.5, 3.0, 0.0))).toBe(true); // negative gain OK
    });

    test('invalid model returns false', () => {
      expect(validateFOPDT(fopdtModel(0, 5.0, 1.0))).toBe(false);   // K = 0
      expect(validateFOPDT(fopdtModel(1.0, -1.0, 1.0))).toBe(false); // negative τ
      expect(validateFOPDT(fopdtModel(1.0, 0, 1.0))).toBe(false);    // τ = 0
      expect(validateFOPDT(fopdtModel(1.0, 5.0, -1.0))).toBe(false); // negative θ
    });
  });
});
