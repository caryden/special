import { describe, expect, test } from 'bun:test';
import {
  findZeroCrossings,
  estimateAmplitude,
  estimatePeriod,
  generateRelayOscillation,
  analyzeRelay,
} from './relay-analysis';

describe('relay-analysis', () => {
  // -------------------------------------------------------------------------
  // generateRelayOscillation
  // @provenance Ku = 4d / (π * a), Åström & Hägglund 1984
  // -------------------------------------------------------------------------

  describe('generateRelayOscillation', () => {
    test('generated signal has correct amplitude', () => {
      const Ku = 5.0;
      const Tu = 2.0;
      const d = 1.0;
      const { output } = generateRelayOscillation(Ku, Tu, d, 10, 100);
      // Expected amplitude a = 4d / (π * Ku) = 4 / (π * 5) ≈ 0.2546
      const expectedA = (4 * d) / (Math.PI * Ku);
      const maxVal = Math.max(...output);
      expect(maxVal).toBeCloseTo(expectedA, 3);
    });

    test('generated signal has correct period', () => {
      const Ku = 3.0;
      const Tu = 4.0;
      const d = 2.0;
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 20, 200);
      // Find zero crossings to measure period
      const crossings = findZeroCrossings(output);
      const period = estimatePeriod(time, crossings);
      expect(period).toBeCloseTo(Tu, 1);
    });
  });

  // -------------------------------------------------------------------------
  // findZeroCrossings
  // -------------------------------------------------------------------------

  describe('findZeroCrossings', () => {
    test('detects crossings in a sine wave', () => {
      // sin(2πt) with 100 samples over 1 period
      const n = 100;
      const signal = Array.from({ length: n }, (_, i) =>
        Math.sin((2 * Math.PI * i) / n),
      );
      const crossings = findZeroCrossings(signal);
      // A single period of sine crosses zero approximately twice
      // (once going up around index 0, once going down around n/2)
      expect(crossings.length).toBeGreaterThanOrEqual(1);
      expect(crossings.length).toBeLessThanOrEqual(3);
    });

    test('detects crossings in a square-ish wave', () => {
      // +1, +1, -1, -1, +1, +1, -1, -1
      const signal = [1, 1, -1, -1, 1, 1, -1, -1];
      const crossings = findZeroCrossings(signal);
      // Crossings at indices 2, 4, 6
      expect(crossings).toEqual([2, 4, 6]);
    });

    test('detects exact zero landing as crossing', () => {
      // Signal: 1, 0, -1 — value lands exactly on zero at index 1
      const signal = [1, 0, -1];
      const crossings = findZeroCrossings(signal);
      // Index 1: prev=1 !== 0 and curr=0, so crossing at 1
      // Index 2: prev=0 * (-1) = 0 (not < 0), and prev === 0 so else-if skipped
      expect(crossings).toContain(1);
    });

    test('detects crossings with offset', () => {
      // Signal oscillates around 5.0
      const signal = [5.5, 6.0, 4.5, 4.0, 5.5, 6.0, 4.5, 4.0];
      const crossings = findZeroCrossings(signal, 5.0);
      // After offset removal: [0.5, 1.0, -0.5, -1.0, 0.5, 1.0, -0.5, -1.0]
      // Crossings at indices 2, 4, 6
      expect(crossings).toEqual([2, 4, 6]);
    });
  });

  // -------------------------------------------------------------------------
  // estimateAmplitude
  // -------------------------------------------------------------------------

  describe('estimateAmplitude', () => {
    test('estimates amplitude of a known sine wave', () => {
      const amplitude = 3.0;
      const n = 1000;
      const signal = Array.from({ length: n }, (_, i) =>
        amplitude * Math.sin((2 * Math.PI * i) / n),
      );
      const est = estimateAmplitude(signal);
      expect(est).toBeCloseTo(amplitude, 1);
    });

    test('estimates amplitude with offset', () => {
      const amplitude = 2.0;
      const offset = 10.0;
      const n = 1000;
      const signal = Array.from({ length: n }, (_, i) =>
        offset + amplitude * Math.sin((2 * Math.PI * i) / n),
      );
      const est = estimateAmplitude(signal, offset);
      expect(est).toBeCloseTo(amplitude, 1);
    });
  });

  // -------------------------------------------------------------------------
  // estimatePeriod
  // -------------------------------------------------------------------------

  describe('estimatePeriod', () => {
    test('estimates period of a known sine wave', () => {
      const Tu = 2.0; // period
      const sampleRate = 200;
      const duration = 10;
      const n = duration * sampleRate + 1;
      const time = Array.from({ length: n }, (_, i) => i / sampleRate);
      const signal = Array.from({ length: n }, (_, i) =>
        Math.sin((2 * Math.PI * time[i]) / Tu),
      );
      const crossings = findZeroCrossings(signal);
      const period = estimatePeriod(time, crossings);
      expect(period).toBeCloseTo(Tu, 1);
    });

    test('returns 0 with fewer than 2 crossings', () => {
      const time = [0, 1, 2, 3, 4];
      const crossings = [2]; // only one crossing
      expect(estimatePeriod(time, crossings)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // analyzeRelay round-trip
  // @provenance Ku = 4d / (π * a), Åström & Hägglund 1984
  // -------------------------------------------------------------------------

  describe('analyzeRelay round-trip', () => {
    test('recovers Ku and Tu from clean sine oscillation', () => {
      const Ku = 5.0;
      const Tu = 2.0;
      const d = 1.0;
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 20, 500);
      const result = analyzeRelay(time, output, d, 0);

      expect(Math.abs(result.Ku - Ku) / Ku).toBeLessThan(0.05); // Ku ± 5%
      expect(Math.abs(result.Tu - Tu) / Tu).toBeLessThan(0.02); // Tu ± 2%
    });

    test('recovers parameters with different Ku/Tu', () => {
      const Ku = 10.0;
      const Tu = 0.5;
      const d = 3.0;
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 10, 1000);
      const result = analyzeRelay(time, output, d, 0);

      expect(Math.abs(result.Ku - Ku) / Ku).toBeLessThan(0.05);
      expect(Math.abs(result.Tu - Tu) / Tu).toBeLessThan(0.02);
    });

    test('recovers parameters with auto-detected offset', () => {
      const Ku = 4.0;
      const Tu = 3.0;
      const d = 2.0;
      // Generate oscillation centered at zero — mean of a sine is ~0
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 30, 200);
      // Don't pass offset, let analyzeRelay compute mean
      const result = analyzeRelay(time, output, d);

      expect(Math.abs(result.Ku - Ku) / Ku).toBeLessThan(0.05);
      expect(Math.abs(result.Tu - Tu) / Tu).toBeLessThan(0.05);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    test('very slow oscillation (large Tu)', () => {
      const Ku = 2.0;
      const Tu = 20.0;
      const d = 1.0;
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 100, 50);
      const result = analyzeRelay(time, output, d, 0);

      expect(Math.abs(result.Ku - Ku) / Ku).toBeLessThan(0.05);
      expect(Math.abs(result.Tu - Tu) / Tu).toBeLessThan(0.02);
    });

    test('high-frequency oscillation (small Tu)', () => {
      const Ku = 8.0;
      const Tu = 0.1;
      const d = 1.0;
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 5, 5000);
      const result = analyzeRelay(time, output, d, 0);

      expect(Math.abs(result.Ku - Ku) / Ku).toBeLessThan(0.05);
      expect(Math.abs(result.Tu - Tu) / Tu).toBeLessThan(0.02);
    });

    test('noisy signal still gives reasonable Ku estimate', () => {
      const Ku = 5.0;
      const Tu = 2.0;
      const d = 1.0;
      const { time, output } = generateRelayOscillation(Ku, Tu, d, 20, 500);
      const a = (4 * d) / (Math.PI * Ku);

      // Add small deterministic noise (2% of amplitude)
      const noisy = output.map((v, i) => {
        const hash = ((i * 2654435761) >>> 0) / 0xffffffff;
        const noise = (hash - 0.5) * 2;
        return v + noise * a * 0.02;
      });

      // Amplitude estimation is robust to small noise,
      // so Ku should still be accurate
      const estA = estimateAmplitude(noisy, 0);
      const estKu = (4 * d) / (Math.PI * estA);
      expect(Math.abs(estKu - Ku) / Ku).toBeLessThan(0.10);

      // Period from noisy zero crossings is less reliable,
      // but the amplitude-based Ku is the primary output
      // For robust Tu estimation in practice, one would use
      // peak-to-peak timing rather than zero crossings
    });
  });
});

