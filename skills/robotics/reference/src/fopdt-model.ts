/**
 * First-Order Plus Dead-Time (FOPDT) model identification from step response data.
 *
 * The FOPDT model G(s) = K * exp(-θs) / (τs + 1) is the standard plant model
 * used by all classical PID tuning methods. This node identifies K, τ, θ from
 * open-loop step response data.
 *
 * @node fopdt-model
 * @depends-on result-types
 * @contract fopdt-model.test.ts
 * @hint model: G(s) = K * exp(-θs) / (τs + 1)
 * @hint identification: Two-point method (63.2% and 28.3% of final value)
 * @provenance Åström & Hägglund "Advanced PID Control" 2006, Chapter 3
 */

import { type FOPDTModel } from './result-types.ts';

/**
 * Create an FOPDT model from explicit parameters.
 */
export function fopdtModel(K: number, tau: number, theta: number): FOPDTModel {
  return { K, tau, theta };
}

/**
 * Validate FOPDT model parameters.
 * K can be any non-zero number (positive or negative gain).
 * τ must be positive (time constant).
 * θ must be non-negative (dead time).
 */
export function validateFOPDT(model: FOPDTModel): boolean {
  return model.K !== 0 && model.tau > 0 && model.theta >= 0;
}

/**
 * Simulate FOPDT step response (for testing and validation).
 * Returns response values at given time points for a unit step at t=0.
 *
 * y(t) = 0                          for t < θ
 * y(t) = K * (1 - exp(-(t-θ)/τ))   for t >= θ
 */
export function simulateFOPDT(model: FOPDTModel, time: number[]): number[] {
  const { K, tau, theta } = model;
  return time.map((t) => {
    if (t < theta) return 0;
    return K * (1 - Math.exp(-(t - theta) / tau));
  });
}

/**
 * Identify FOPDT model parameters from step response data.
 * Uses the two-point method: find times when response reaches 28.3% and 63.2%
 * of final value. Then:
 *   τ = 1.5 * (t63 - t28)
 *   θ = t63 - τ
 *   K = (finalValue - initialValue) / stepSize
 *
 * @param time - Time values (seconds), monotonically increasing
 * @param response - Response values corresponding to each time
 * @param stepSize - Magnitude of the input step
 * @param initialValue - Steady-state value before step (default: response[0])
 */
export function identifyFOPDT(
  time: number[],
  response: number[],
  stepSize: number,
  initialValue?: number,
): FOPDTModel {
  const y0 = initialValue !== undefined ? initialValue : response[0];
  const yFinal = response[response.length - 1];
  const deltaY = yFinal - y0;

  const K = deltaY / stepSize;

  // Target levels for the two-point method
  const target28 = y0 + 0.283 * deltaY;
  const target63 = y0 + 0.632 * deltaY;

  const t28 = interpolateTime(time, response, target28);
  const t63 = interpolateTime(time, response, target63);

  const tau = 1.5 * (t63 - t28);
  const theta = Math.max(0, t63 - tau);

  return { K, tau, theta };
}

/**
 * Linearly interpolate to find the time when the response crosses a target value.
 */
function interpolateTime(
  time: number[],
  response: number[],
  target: number,
): number {
  for (let i = 1; i < response.length; i++) {
    const prev = response[i - 1];
    const curr = response[i];
    if ((prev <= target && curr >= target) || (prev >= target && curr <= target)) {
      // Linear interpolation
      const frac = (target - prev) / (curr - prev);
      return time[i - 1] + frac * (time[i] - time[i - 1]);
    }
  }
  // Fallback: return last time if target not crossed
  return time[time.length - 1];
}
