/**
 * Ackermann steering geometry: bicycle model kinematic equations.
 *
 * Models a front-steered vehicle using the bicycle (single-track) model.
 * The bicycle model approximates a four-wheeled vehicle as a two-wheeled
 * vehicle with the front and rear axles collapsed to centerline points.
 *
 * @node ackermann
 * @depends-on drivetrain-types
 * @contract ackermann.test.ts
 * @hint model: Bicycle (single-track) model — simplified Ackermann
 * @hint convention: Positive steering angle = left turn, positive omega = CCW
 * @hint off-policy: Bicycle model vs full four-wheel Ackermann. Bicycle model
 *       is used for simplicity and is standard in path tracking controllers.
 * @provenance Rajamani "Vehicle Dynamics and Control" 2nd ed. 2012,
 *       PythonRobotics (cross-validation)
 */

import type {
  AckermannGeometry,
  AckermannCommand,
  Twist2D,
  Pose2D,
} from './drivetrain-types.ts';
import { twist2d, pose2d } from './drivetrain-types.ts';

/**
 * Convert steering command to body-frame twist (bicycle model).
 *
 *   vx = speed * cos(steeringAngle)  (approximated as speed for small angles)
 *   omega = speed * tan(steeringAngle) / wheelBase
 *
 * We use the exact kinematic model (not small-angle approximation):
 *   vx = speed (rear-axle reference point)
 *   omega = speed * tan(delta) / L
 */
export function ackermannForwardKinematics(
  geometry: AckermannGeometry,
  command: AckermannCommand,
): Twist2D {
  const { wheelBase } = geometry;
  const { speed, steeringAngle } = command;

  const omega = speed * Math.tan(steeringAngle) / wheelBase;
  return twist2d(speed, 0, omega);
}

/**
 * Convert desired body twist to steering command.
 *
 *   steeringAngle = atan(omega * wheelBase / speed)
 *
 * Returns zero steering for near-zero speed.
 */
export function ackermannInverseKinematics(
  geometry: AckermannGeometry,
  twist: Twist2D,
): AckermannCommand {
  const { wheelBase, maxSteeringAngle } = geometry;
  const { vx, omega } = twist;

  if (Math.abs(vx) < 1e-10) {
    return { speed: 0, steeringAngle: 0 };
  }

  let steeringAngle = Math.atan(omega * wheelBase / vx);

  // Clamp to max steering angle
  steeringAngle = Math.max(-maxSteeringAngle, Math.min(maxSteeringAngle, steeringAngle));

  return { speed: vx, steeringAngle };
}

/**
 * Compute the instantaneous turning radius.
 *
 *   R = wheelBase / tan(steeringAngle)
 *
 * Returns Infinity for zero steering angle (straight-line motion).
 */
export function ackermannTurningRadius(
  geometry: AckermannGeometry,
  steeringAngle: number,
): number {
  if (Math.abs(steeringAngle) < 1e-10) return Infinity;
  return geometry.wheelBase / Math.tan(steeringAngle);
}

/**
 * Compute individual front wheel steering angles (full Ackermann geometry).
 *
 * For a turn with steering angle delta (bicycle model), the inner and outer
 * wheel angles are:
 *   inner = atan(L / (R - W/2))
 *   outer = atan(L / (R + W/2))
 *
 * where R = L / tan(delta), L = wheelBase, W = trackWidth.
 *
 * Returns { inner, outer } where inner > outer for a left turn.
 */
export function ackermannWheelAngles(
  geometry: AckermannGeometry,
  steeringAngle: number,
): { inner: number; outer: number } {
  const { wheelBase, trackWidth } = geometry;

  if (Math.abs(steeringAngle) < 1e-10) {
    return { inner: 0, outer: 0 };
  }

  const R = wheelBase / Math.tan(Math.abs(steeringAngle));
  const inner = Math.atan(wheelBase / (R - trackWidth / 2));
  const outer = Math.atan(wheelBase / (R + trackWidth / 2));

  // Preserve sign (positive = left)
  const sign = Math.sign(steeringAngle);
  return { inner: sign * inner, outer: sign * outer };
}

/**
 * Integrate Ackermann kinematics over dt to update pose.
 *
 * Uses exact arc integration when turning, Euler for straight-line.
 * Reference point is the rear axle center.
 */
export function ackermannOdometry(
  pose: Pose2D,
  command: AckermannCommand,
  geometry: AckermannGeometry,
  dt: number,
): Pose2D {
  const { x, y, theta } = pose;
  const twist = ackermannForwardKinematics(geometry, command);
  const { vx, omega } = twist;

  if (Math.abs(omega) < 1e-10) {
    // Straight-line (Euler)
    return pose2d(
      x + vx * Math.cos(theta) * dt,
      y + vx * Math.sin(theta) * dt,
      theta,
    );
  }

  // Exact arc integration
  const newTheta = theta + omega * dt;
  return pose2d(
    x + (vx / omega) * (Math.sin(newTheta) - Math.sin(theta)),
    y - (vx / omega) * (Math.cos(newTheta) - Math.cos(theta)),
    newTheta,
  );
}

/**
 * Clamp steering angle to geometry limits.
 */
export function ackermannClampSteering(
  geometry: AckermannGeometry,
  steeringAngle: number,
): number {
  return Math.max(
    -geometry.maxSteeringAngle,
    Math.min(geometry.maxSteeringAngle, steeringAngle),
  );
}
