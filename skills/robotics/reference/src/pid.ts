/**
 * PID controller with anti-windup, derivative filtering, and output clamping.
 *
 * @node pid
 * @depends-on result-types
 * @contract pid.test.ts
 * @hint anti-windup: Integral clamping (not back-calculation). Clamp integral
 *       accumulator to [integralLimits.min, integralLimits.max].
 * @hint derivative: First-order low-pass filter on derivative term to prevent
 *       derivative kick. Filter: d_filtered = alpha * d_raw + (1-alpha) * d_prev
 * @hint off-policy: Anti-windup method is the key design decision. Clamping chosen
 *       for simplicity and universality. Back-calculation adds a tuning parameter (Tt).
 * @provenance python-control v0.10.2 (API shape), DiscretePIDs.jl (anti-windup behavior)
 */

import type { PIDConfig, PIDState } from './result-types.ts';
import {
  defaultPIDConfig,
  initialPIDState,
} from './result-types.ts';

export interface PIDOutput {
  /** Control signal */
  output: number;
  /** Updated controller state */
  state: PIDState;
  /** Individual terms for debugging */
  terms: { p: number; i: number; d: number };
}

/**
 * Compute one PID step.
 *
 * @param error - Current error (setpoint - measurement)
 * @param state - Previous controller state
 * @param config - Controller configuration
 * @returns Output signal, updated state, and individual P/I/D terms
 */
export function pidStep(
  error: number,
  state: PIDState,
  config: PIDConfig,
): PIDOutput {
  // P term
  const p = config.gains.kp * error;

  // I term with anti-windup (clamping)
  let integral = state.integral + config.gains.ki * error * config.sampleTime;
  // Clamp integral
  integral = Math.max(
    config.integralLimits[0],
    Math.min(config.integralLimits[1], integral),
  );

  // D term with low-pass filter
  const rawDerivative = (error - state.previousError) / config.sampleTime;
  const alpha = config.derivativeFilterCoeff;
  const filteredDerivative =
    alpha * rawDerivative + (1 - alpha) * state.previousDerivative;
  const d = config.gains.kd * filteredDerivative;

  // Total output with clamping
  let output = p + integral + d;
  output = Math.max(
    config.outputLimits[0],
    Math.min(config.outputLimits[1], output),
  );

  return {
    output,
    state: {
      integral,
      previousError: error,
      previousDerivative: filteredDerivative,
    },
    terms: { p, i: integral, d },
  };
}

/**
 * Run PID controller over a sequence of errors (convenience function).
 */
export function pidSequence(
  errors: number[],
  config: PIDConfig,
): { outputs: number[]; finalState: PIDState } {
  let state = initialPIDState();
  const outputs: number[] = [];
  for (const error of errors) {
    const result = pidStep(error, state, config);
    outputs.push(result.output);
    state = result.state;
  }
  return { outputs, finalState: state };
}
