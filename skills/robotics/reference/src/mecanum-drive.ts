/**
 * Mecanum wheel kinematics: 4-wheel omnidirectional drive.
 *
 * Mecanum wheels have rollers at 45° to the wheel axis, enabling holonomic motion
 * (independent control of vx, vy, omega).
 *
 * Wheel numbering:
 *   Front-Left (FL), Front-Right (FR), Rear-Left (RL), Rear-Right (RR)
 *
 * Standard roller orientation:
 *   FL and RR: rollers at +45° (left diagonal, "X" pattern)
 *   FR and RL: rollers at -45° (right diagonal)
 *
 * @node mecanum-drive
 * @depends-on drivetrain-types
 * @contract mecanum-drive.test.ts
 * @hint convention: Positive vx = forward, positive vy = left, positive omega = CCW
 * @hint off-policy: X-pattern vs O-pattern roller orientation. We use X-pattern
 *       (most common in FRC, REV, and educational robots).
 * @provenance Siegwart & Nourbakhsh "Introduction to Autonomous Mobile Robots" 2nd ed. 2011
 */

import type {
  Twist2D,
  MecanumDriveGeometry,
  MecanumWheelSpeeds,
  Pose2D,
} from './drivetrain-types.ts';
import { twist2d, pose2d } from './drivetrain-types.ts';

/**
 * Inverse kinematics: body twist to wheel speeds (rad/s).
 *
 * Standard mecanum kinematics (X-pattern):
 *   FL = (vx - vy - (L+W)*omega) / r
 *   FR = (vx + vy + (L+W)*omega) / r
 *   RL = (vx + vy - (L+W)*omega) / r
 *   RR = (vx - vy + (L+W)*omega) / r
 *
 * where L = wheelBase/2, W = trackWidth/2, r = wheelRadius
 */
export function mecanumInverseKinematics(
  geometry: MecanumDriveGeometry,
  twist: Twist2D,
): MecanumWheelSpeeds {
  const { wheelBase, trackWidth, wheelRadius } = geometry;
  const { vx, vy, omega } = twist;
  const k = (wheelBase + trackWidth) / 2;

  return {
    frontLeft: (vx - vy - k * omega) / wheelRadius,
    frontRight: (vx + vy + k * omega) / wheelRadius,
    rearLeft: (vx + vy - k * omega) / wheelRadius,
    rearRight: (vx - vy + k * omega) / wheelRadius,
  };
}

/**
 * Forward kinematics: wheel speeds (rad/s) to body twist.
 *
 *   vx    = (r/4) * (FL + FR + RL + RR)
 *   vy    = (r/4) * (-FL + FR + RL - RR)
 *   omega = (r/4) * (-FL + FR - RL + RR) / (L+W)/2
 *
 * Simplified: omega = r * (-FL + FR - RL + RR) / (4 * k)
 */
export function mecanumForwardKinematics(
  geometry: MecanumDriveGeometry,
  wheelSpeeds: MecanumWheelSpeeds,
): Twist2D {
  const { wheelBase, trackWidth, wheelRadius } = geometry;
  const { frontLeft, frontRight, rearLeft, rearRight } = wheelSpeeds;
  const k = (wheelBase + trackWidth) / 2;
  const r4 = wheelRadius / 4;

  const vx = r4 * (frontLeft + frontRight + rearLeft + rearRight);
  const vy = r4 * (-frontLeft + frontRight + rearLeft - rearRight);
  const omega = r4 * (-frontLeft + frontRight - rearLeft + rearRight) / k;

  return twist2d(vx, vy, omega);
}

/**
 * Integrate mecanum twist over dt to update pose.
 *
 * Uses exact integration for omega != 0, Euler for straight-line.
 */
export function mecanumOdometry(
  pose: Pose2D,
  twist: Twist2D,
  dt: number,
): Pose2D {
  const { x, y, theta } = pose;
  const { vx, vy, omega } = twist;

  if (Math.abs(omega) < 1e-10) {
    // Euler integration
    return pose2d(
      x + (vx * Math.cos(theta) - vy * Math.sin(theta)) * dt,
      y + (vx * Math.sin(theta) + vy * Math.cos(theta)) * dt,
      theta,
    );
  }

  // Exact integration with rotation
  const newTheta = theta + omega * dt;
  const sinDiff = Math.sin(newTheta) - Math.sin(theta);
  const cosDiff = Math.cos(newTheta) - Math.cos(theta);

  return pose2d(
    x + (vx * sinDiff + vy * cosDiff) / omega,
    y + (-vx * cosDiff + vy * sinDiff) / omega,
    newTheta,
  );
}

/**
 * Normalize wheel speeds so the maximum absolute speed does not exceed maxSpeed.
 *
 * If all speeds are within [-maxSpeed, maxSpeed], returns them unchanged.
 * Otherwise scales all speeds proportionally.
 */
export function mecanumNormalizeSpeeds(
  speeds: MecanumWheelSpeeds,
  maxSpeed: number,
): MecanumWheelSpeeds {
  const maxAbs = Math.max(
    Math.abs(speeds.frontLeft),
    Math.abs(speeds.frontRight),
    Math.abs(speeds.rearLeft),
    Math.abs(speeds.rearRight),
  );

  if (maxAbs <= maxSpeed) return speeds;

  const scale = maxSpeed / maxAbs;
  return {
    frontLeft: speeds.frontLeft * scale,
    frontRight: speeds.frontRight * scale,
    rearLeft: speeds.rearLeft * scale,
    rearRight: speeds.rearRight * scale,
  };
}
