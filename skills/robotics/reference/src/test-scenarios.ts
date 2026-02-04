/**
 * Standard test scenarios for robotics algorithm validation.
 *
 * @node test-scenarios
 * @depends-on result-types
 * @contract test-scenarios.test.ts
 * @hint testing: These are test fixtures/factories, not algorithm implementations.
 */

import { type Point2D, point2d } from './result-types.ts';

// ---------------------------------------------------------------------------
// Grid world
// ---------------------------------------------------------------------------

/** A 2D grid with obstacle lookup */
export interface GridWorld {
  width: number;
  height: number;
  obstacles: Set<string>;
  isBlocked: (x: number, y: number) => boolean;
}

/**
 * Create a simple 2D grid with obstacles.
 * Uses a deterministic hash so results are reproducible.
 */
export function simpleGridWorld(
  width: number,
  height: number,
  obstacleFraction: number = 0,
): GridWorld {
  const obstacles = new Set<string>();
  const threshold = obstacleFraction * 100;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const hash = (x * 7 + y * 13 + x * y * 3) % 100;
      if (hash < threshold) {
        obstacles.add(`${x},${y}`);
      }
    }
  }

  const isBlocked = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return true;
    return obstacles.has(`${x},${y}`);
  };

  return { width, height, obstacles, isBlocked };
}

// ---------------------------------------------------------------------------
// Waypoint paths
// ---------------------------------------------------------------------------

/**
 * Straight line from (0,0) to (10,0) with n waypoints.
 * Defaults to 11 waypoints (0,1,...,10).
 */
export function straightLinePath(n: number = 11): Point2D[] {
  const path: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    path.push(point2d(t * 10, 0));
  }
  return path;
}

/**
 * Circular arc path centered at origin.
 * Defaults to 20 points.
 */
export function circularArcPath(
  radius: number,
  startAngle: number,
  endAngle: number,
  n: number = 20,
): Point2D[] {
  const path: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const angle = startAngle + t * (endAngle - startAngle);
    path.push(point2d(radius * Math.cos(angle), radius * Math.sin(angle)));
  }
  return path;
}

/**
 * Figure-eight path centered at origin.
 * Parametric: x = radius * sin(t), y = radius * sin(t) * cos(t).
 * Defaults to 40 points.
 */
export function figureEightPath(radius: number, n: number = 40): Point2D[] {
  const path: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    path.push(point2d(radius * Math.sin(t), radius * Math.sin(t) * Math.cos(t)));
  }
  return path;
}

// ---------------------------------------------------------------------------
// Tracking / state estimation scenarios
// ---------------------------------------------------------------------------

/**
 * Constant position measurements with deterministic noise.
 * Cycles through the provided noise array.
 */
export function constantPositionMeasurements(
  trueValue: number,
  noise: number[],
  count: number,
): number[] {
  const measurements: number[] = [];
  for (let i = 0; i < count; i++) {
    measurements.push(trueValue + noise[i % noise.length]);
  }
  return measurements;
}

/**
 * Linear ramp measurements with deterministic noise.
 * value[i] = slope * i + intercept + noise[i % noise.length]
 */
export function linearRampMeasurements(
  slope: number,
  intercept: number,
  noise: number[],
  count: number,
): number[] {
  const measurements: number[] = [];
  for (let i = 0; i < count; i++) {
    measurements.push(slope * i + intercept + noise[i % noise.length]);
  }
  return measurements;
}

// ---------------------------------------------------------------------------
// PID test scenarios
// ---------------------------------------------------------------------------

/**
 * Step response errors for a unit step setpoint change.
 * Simulates a simple first-order plant: y[k+1] = y[k] + plantGain * u[k]
 * where u[k] = error[k] (proportional-only for simplicity).
 * Returns the error sequence.
 */
export function stepResponseErrors(
  setpoint: number,
  plantGain: number,
  numSteps: number,
): number[] {
  const errors: number[] = [];
  let y = 0;
  for (let k = 0; k < numSteps; k++) {
    const error = setpoint - y;
    errors.push(error);
    // Simple proportional control through the plant
    y = y + plantGain * error;
  }
  return errors;
}
