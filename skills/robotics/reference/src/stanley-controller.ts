/**
 * Stanley path tracking controller.
 *
 * The Stanley method uses front-axle position and crosstrack error to compute
 * a steering angle. It combines heading error correction with crosstrack error
 * correction scaled by speed.
 *
 *   delta = heading_error + atan(k * crosstrack_error / speed)
 *
 * @node stanley-controller
 * @depends-on result-types, drivetrain-types
 * @contract stanley-controller.test.ts
 * @hint reference-point: Front axle (not rear axle like pure pursuit)
 * @hint off-policy: Stanley vs Pure Pursuit — Stanley is better at high speeds
 *       and converges to zero crosstrack error at steady state.
 * @provenance Hoffmann et al. "Autonomous Automobile Trajectory Tracking for
 *       Off-Road Driving" 2007 (Stanford DARPA Grand Challenge)
 * @provenance PythonRobotics (cross-validation)
 */

import type { ControlOutput, Point2D } from './result-types.ts';
import type { Pose2D } from './drivetrain-types.ts';

/** Stanley controller configuration */
export interface StanleyConfig {
  /** Crosstrack error gain */
  k: number;
  /** Softening constant to prevent division by zero at low speeds */
  kSoft: number;
  /** Maximum steering angle (radians) */
  maxSteering: number;
}

/** Default Stanley configuration */
export const DEFAULT_STANLEY_CONFIG: StanleyConfig = {
  k: 1.0,
  kSoft: 1e-5,
  maxSteering: Math.PI / 4,
};

/** Result of finding the nearest path segment */
export interface NearestSegmentResult {
  /** Index of the nearest segment start point */
  index: number;
  /** Signed crosstrack error (positive = left of path) */
  crosstrackError: number;
  /** Path heading at the nearest point (radians) */
  pathHeading: number;
  /** Nearest point on the path */
  nearestPoint: Point2D;
}

/**
 * Find the nearest path segment to a given position.
 *
 * Returns the segment index, crosstrack error (signed), and path heading.
 * Positive crosstrack error means the point is to the left of the path
 * (path direction defines "forward").
 */
export function stanleyFindNearest(
  position: Point2D,
  path: Point2D[],
): NearestSegmentResult {
  let bestDist = Infinity;
  let bestIndex = 0;
  let bestT = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dy = path[i + 1].y - path[i].y;
    const lenSq = dx * dx + dy * dy;

    let t: number;
    if (lenSq < 1e-14) {
      t = 0;
    } else {
      t = ((position.x - path[i].x) * dx + (position.y - path[i].y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const nearX = path[i].x + t * dx;
    const nearY = path[i].y + t * dy;
    const dist = Math.sqrt((position.x - nearX) ** 2 + (position.y - nearY) ** 2);

    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
      bestT = t;
    }
  }

  const seg = path[bestIndex];
  const segNext = path[bestIndex + 1];
  const dx = segNext.x - seg.x;
  const dy = segNext.y - seg.y;
  const pathHeading = Math.atan2(dy, dx);

  const nearestPoint: Point2D = {
    x: seg.x + bestT * dx,
    y: seg.y + bestT * dy,
  };

  // Signed crosstrack error: positive = left of path
  // Cross product (path_dir × to_point): dx*toPoint.y - dy*toPoint.x > 0 means left
  const toPoint = { x: position.x - nearestPoint.x, y: position.y - nearestPoint.y };
  const crosstrackError = (dx * toPoint.y - dy * toPoint.x) / Math.sqrt(dx * dx + dy * dy + 1e-14);

  return {
    index: bestIndex,
    crosstrackError,
    pathHeading,
    nearestPoint,
  };
}

/**
 * Compute the front axle position from robot pose and wheelbase.
 */
export function stanleyFrontAxle(
  pose: Pose2D,
  wheelBase: number,
): Point2D {
  return {
    x: pose.x + wheelBase * Math.cos(pose.theta),
    y: pose.y + wheelBase * Math.sin(pose.theta),
  };
}

/**
 * Normalize angle to [-π, π].
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Compute Stanley steering angle.
 *
 *   delta = heading_error + atan(k * e / (v + k_soft))
 *
 * where:
 *   heading_error = path_heading - vehicle_heading
 *   e = signed crosstrack error
 *   v = speed
 *
 * @param headingError  Heading error (radians)
 * @param crosstrackError  Signed crosstrack error (meters)
 * @param speed  Vehicle speed (m/s)
 * @param config  Stanley controller configuration
 * @returns Clamped steering angle (radians)
 */
export function stanleySteeringAngle(
  headingError: number,
  crosstrackError: number,
  speed: number,
  config: StanleyConfig = DEFAULT_STANLEY_CONFIG,
): number {
  const { k, kSoft, maxSteering } = config;
  // Negative sign: positive crosstrack (left of path) → steer right (negative angle)
  const crosstrackTerm = Math.atan2(-k * crosstrackError, Math.abs(speed) + kSoft);
  const delta = normalizeAngle(headingError) + crosstrackTerm;
  return Math.max(-maxSteering, Math.min(maxSteering, delta));
}

/**
 * Full Stanley controller step.
 *
 * Computes the steering angle given the robot pose, path, speed, and wheelbase.
 *
 * @param pose  Robot pose (rear axle)
 * @param path  Reference path as array of points
 * @param speed  Current speed (m/s)
 * @param wheelBase  Distance between rear and front axles (meters)
 * @param config  Stanley controller configuration
 * @returns ControlOutput with linear = speed and angular = steering_angle
 */
export function stanleyControl(
  pose: Pose2D,
  path: Point2D[],
  speed: number,
  wheelBase: number,
  config: StanleyConfig = DEFAULT_STANLEY_CONFIG,
): ControlOutput {
  const frontAxle = stanleyFrontAxle(pose, wheelBase);
  const nearest = stanleyFindNearest(frontAxle, path);
  const headingError = normalizeAngle(nearest.pathHeading - pose.theta);
  const steeringAngle = stanleySteeringAngle(headingError, nearest.crosstrackError, speed, config);

  return {
    linear: speed,
    angular: steeringAngle,
  };
}
