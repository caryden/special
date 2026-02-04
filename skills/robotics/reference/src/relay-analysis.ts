/**
 * Extract ultimate gain (Ku) and ultimate period (Tu) from relay feedback test data.
 *
 * The relay method (Åström & Hägglund 1984) forces a system into sustained
 * oscillation using a relay (on/off) controller. From the oscillation:
 *   Ku = 4d / (π * a)    where d = relay amplitude, a = oscillation amplitude
 *   Tu = oscillation period (from zero crossings or peak-to-peak)
 *
 * The extracted Ku and Tu feed into Ziegler-Nichols ultimate gain and
 * Tyreus-Luyben tuning rules.
 *
 * @node relay-analysis
 * @depends-on result-types
 * @contract relay-analysis.test.ts
 * @hint method: Ku = 4d / (π * a), Tu = oscillation period
 * @provenance Åström & Hägglund "Automatic Tuning of PID Controllers" 1984
 */

import { type UltimateGainParams } from './result-types.ts';

/**
 * Find zero crossings in a signal (for period detection).
 * Returns indices where the signal crosses zero (after offset subtraction).
 */
export function findZeroCrossings(signal: number[], offset?: number): number[] {
  const off = offset !== undefined ? offset : 0;
  const adjusted = signal.map((v) => v - off);
  const crossings: number[] = [];
  for (let i = 1; i < adjusted.length; i++) {
    if (adjusted[i - 1] * adjusted[i] < 0) {
      crossings.push(i);
    } else if (adjusted[i - 1] !== 0 && adjusted[i] === 0) {
      crossings.push(i);
    }
  }
  return crossings;
}

/**
 * Estimate oscillation amplitude from peak-to-peak analysis.
 * Returns half of (max - min) of the signal after offset removal.
 */
export function estimateAmplitude(signal: number[], offset?: number): number {
  const off = offset !== undefined ? offset : 0;
  const adjusted = signal.map((v) => v - off);
  const maxVal = Math.max(...adjusted);
  const minVal = Math.min(...adjusted);
  return (maxVal - minVal) / 2;
}

/**
 * Estimate oscillation period from zero crossings.
 * Returns average full period (2 × average half-period between crossings).
 */
export function estimatePeriod(
  time: number[],
  crossingIndices: number[],
): number {
  if (crossingIndices.length < 2) {
    return 0;
  }
  let totalHalfPeriod = 0;
  let count = 0;
  for (let i = 1; i < crossingIndices.length; i++) {
    totalHalfPeriod += time[crossingIndices[i]] - time[crossingIndices[i - 1]];
    count++;
  }
  const avgHalfPeriod = totalHalfPeriod / count;
  return 2 * avgHalfPeriod;
}

/**
 * Generate synthetic relay oscillation data (for testing).
 * Produces a sine-like oscillation at the specified frequency and amplitude.
 *
 * From Ku = 4d / (π * a), we get a = 4d / (π * Ku).
 * The oscillation frequency is 2π / Tu.
 */
export function generateRelayOscillation(
  Ku: number,
  Tu: number,
  relayAmplitude: number,
  duration: number,
  sampleRate: number,
): { time: number[]; output: number[] } {
  const numSamples = Math.floor(duration * sampleRate) + 1;
  const a = (4 * relayAmplitude) / (Math.PI * Ku); // oscillation amplitude
  const omega = (2 * Math.PI) / Tu;

  const time: number[] = [];
  const output: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    time.push(t);
    output.push(a * Math.sin(omega * t));
  }
  return { time, output };
}

/**
 * Extract ultimate gain and period from relay test data.
 *
 * @param time - Time values (seconds)
 * @param output - Plant output signal (the oscillating response)
 * @param relayAmplitude - Amplitude of the relay (d in Ku = 4d/πa)
 * @param steadyStateOffset - Optional offset to subtract (default: mean of output)
 * @returns { Ku, Tu } ultimate gain and period
 */
export function analyzeRelay(
  time: number[],
  output: number[],
  relayAmplitude: number,
  steadyStateOffset?: number,
): UltimateGainParams {
  const offset =
    steadyStateOffset !== undefined
      ? steadyStateOffset
      : output.reduce((sum, v) => sum + v, 0) / output.length;

  const a = estimateAmplitude(output, offset);
  const crossings = findZeroCrossings(output, offset);
  const Tu = estimatePeriod(time, crossings);
  const Ku = (4 * relayAmplitude) / (Math.PI * a);

  return { Ku, Tu };
}
