/**
 * Common result and configuration types for robotics algorithms.
 *
 * @node result-types
 * @contract result-types.test.ts
 * @hint types: Use plain interfaces/objects, not classes. Keep it simple.
 * @hint translation: Map to structs/records/dataclasses in target languages.
 */

// ---------------------------------------------------------------------------
// Control types
// ---------------------------------------------------------------------------

/** PID controller output */
export interface ControlOutput {
  /** Linear velocity (m/s) */
  linear: number;
  /** Angular velocity (rad/s) */
  angular: number;
}

/** PID gains in parallel form */
export interface PIDGains {
  /** Proportional gain */
  kp: number;
  /** Integral gain */
  ki: number;
  /** Derivative gain */
  kd: number;
}

/** PID gains in standard (ISA) form */
export interface PIDGainsStandard {
  /** Proportional gain */
  kp: number;
  /** Integral time constant (seconds) */
  ti: number;
  /** Derivative time constant (seconds) */
  td: number;
}

/** PID controller configuration */
export interface PIDConfig {
  /** Gains */
  gains: PIDGains;
  /** Output limits [min, max] */
  outputLimits: [number, number];
  /** Integral anti-windup limits [min, max] */
  integralLimits: [number, number];
  /** Derivative low-pass filter coefficient (0-1, lower = more filtering) */
  derivativeFilterCoeff: number;
  /** Sample time (seconds) */
  sampleTime: number;
}

/** PID controller state (mutable between steps) */
export interface PIDState {
  /** Accumulated integral term */
  integral: number;
  /** Previous error (for derivative) */
  previousError: number;
  /** Previous filtered derivative */
  previousDerivative: number;
}

// ---------------------------------------------------------------------------
// Planning types
// ---------------------------------------------------------------------------

/** 2D point for planning */
export interface Point2D {
  x: number;
  y: number;
}

/** Path planning result */
export interface PlanResult {
  /** Ordered waypoints */
  path: Point2D[];
  /** Total path cost/length */
  cost: number;
  /** Whether a valid path was found */
  success: boolean;
  /** Number of nodes explored */
  nodesExplored: number;
}

// ---------------------------------------------------------------------------
// IK types
// ---------------------------------------------------------------------------

/** Inverse kinematics result */
export interface IKResult {
  /** Joint angles (radians) */
  jointAngles: number[];
  /** Whether the solver converged */
  converged: boolean;
  /** Final position error (meters) */
  positionError: number;
  /** Number of iterations */
  iterations: number;
}

// ---------------------------------------------------------------------------
// Tuning types
// ---------------------------------------------------------------------------

/** First-Order Plus Dead-Time model parameters */
export interface FOPDTModel {
  /** Process gain (dimensionless) */
  K: number;
  /** Time constant (seconds) */
  tau: number;
  /** Dead time / delay (seconds) */
  theta: number;
}

/** Tuning method identifier */
export type TuningMethod =
  | 'ziegler-nichols'
  | 'cohen-coon'
  | 'tyreus-luyben'
  | 'simc'
  | 'lambda'
  | 'imc';

/** Controller type for tuning */
export type ControllerType = 'P' | 'PI' | 'PID';

/** Ultimate gain parameters (from relay test) */
export interface UltimateGainParams {
  /** Ultimate gain */
  Ku: number;
  /** Ultimate period (seconds) */
  Tu: number;
}

// ---------------------------------------------------------------------------
// Factory / helper functions
// ---------------------------------------------------------------------------

/** Create default PID config */
export function defaultPIDConfig(overrides?: Partial<PIDConfig>): PIDConfig {
  const base: PIDConfig = {
    gains: { kp: 1, ki: 0, kd: 0 },
    outputLimits: [-Infinity, Infinity],
    integralLimits: [-Infinity, Infinity],
    derivativeFilterCoeff: 1,
    sampleTime: 0.01,
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    gains: overrides.gains ? { ...base.gains, ...overrides.gains } : base.gains,
  };
}

/** Create initial PID state */
export function initialPIDState(): PIDState {
  return {
    integral: 0,
    previousError: 0,
    previousDerivative: 0,
  };
}

/** Convert parallel PID gains to standard (ISA) form */
export function gainsToStandard(gains: PIDGains): PIDGainsStandard {
  return {
    kp: gains.kp,
    ti: gains.ki === 0 ? Infinity : gains.kp / gains.ki,
    td: gains.kp === 0 ? 0 : gains.kd / gains.kp,
  };
}

/** Convert standard (ISA) PID gains to parallel form */
export function gainsToParallel(gains: PIDGainsStandard): PIDGains {
  return {
    kp: gains.kp,
    ki: gains.ti === Infinity ? 0 : gains.kp / gains.ti,
    kd: gains.kp * gains.td,
  };
}

/** Create a Point2D */
export function point2d(x: number, y: number): Point2D {
  return { x, y };
}
