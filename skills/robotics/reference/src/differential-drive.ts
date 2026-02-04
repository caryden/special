/**
 * Differential drive kinematics: forward/inverse kinematics and odometry.
 *
 * @node differential-drive
 * @depends-on drivetrain-types
 * @contract differential-drive.test.ts
 * @hint off-policy: Odometry integration method (Euler vs exact arc). We use exact arc
 *       integration for accuracy, with Euler fallback for near-zero angular velocity.
 * @provenance PythonRobotics (cross-validation), Siegwart & Nourbakhsh "Introduction to
 *       Autonomous Mobile Robots" 2nd ed. 2011
 */

import {
  type Twist2D,
  type DifferentialDriveGeometry,
  type DifferentialWheelSpeeds,
  type Pose2D,
  twist2d,
  pose2d,
} from './drivetrain-types.ts';

/**
 * Convert wheel speeds (rad/s) to body-frame twist.
 *
 * v     = (wheelRadius / 2) * (left + right)
 * omega = (wheelRadius / trackWidth) * (right - left)
 */
export function diffDriveForwardKinematics(
  geometry: DifferentialDriveGeometry,
  wheelSpeeds: DifferentialWheelSpeeds,
): Twist2D {
  const { wheelRadius, trackWidth } = geometry;
  const { left, right } = wheelSpeeds;
  const v = (wheelRadius / 2) * (left + right);
  const omega = (wheelRadius / trackWidth) * (right - left);
  return twist2d(v, 0, omega);
}

/**
 * Convert body-frame twist to wheel speeds (rad/s).
 *
 * left  = (vx - omega * trackWidth / 2) / wheelRadius
 * right = (vx + omega * trackWidth / 2) / wheelRadius
 */
export function diffDriveInverseKinematics(
  geometry: DifferentialDriveGeometry,
  twist: Twist2D,
): DifferentialWheelSpeeds {
  const { wheelRadius, trackWidth } = geometry;
  const { vx, omega } = twist;
  const left = (vx - (omega * trackWidth) / 2) / wheelRadius;
  const right = (vx + (omega * trackWidth) / 2) / wheelRadius;
  return { left, right };
}

/**
 * Integrate a body twist over dt to update the pose.
 *
 * Uses exact arc integration when |omega| >= 1e-10, and Euler (straight-line)
 * integration otherwise.
 */
export function diffDriveOdometry(
  pose: Pose2D,
  twist: Twist2D,
  dt: number,
): Pose2D {
  const { x, y, theta } = pose;
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
 * Convenience: compute odometry update from wheel speeds directly.
 */
export function diffDriveOdometryFromWheels(
  pose: Pose2D,
  geometry: DifferentialDriveGeometry,
  wheelSpeeds: DifferentialWheelSpeeds,
  dt: number,
): Pose2D {
  const twist = diffDriveForwardKinematics(geometry, wheelSpeeds);
  return diffDriveOdometry(pose, twist, dt);
}

/**
 * Arc length traveled: |v| * dt.
 */
export function diffDriveArcLength(
  geometry: DifferentialDriveGeometry,
  wheelSpeeds: DifferentialWheelSpeeds,
  dt: number,
): number {
  const twist = diffDriveForwardKinematics(geometry, wheelSpeeds);
  return Math.abs(twist.vx) * dt;
}

/**
 * Instantaneous turning radius.
 *
 * Returns Infinity for straight-line motion (|right - left| < 1e-10).
 * Otherwise R = (trackWidth / 2) * (right + left) / (right - left).
 */
export function diffDriveRadius(
  geometry: DifferentialDriveGeometry,
  wheelSpeeds: DifferentialWheelSpeeds,
): number {
  const { trackWidth } = geometry;
  const { left, right } = wheelSpeeds;
  const diff = right - left;
  if (Math.abs(diff) < 1e-10) {
    return Infinity;
  }
  return (trackWidth / 2) * (right + left) / diff;
}
