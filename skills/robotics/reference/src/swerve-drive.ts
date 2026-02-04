/**
 * Swerve (coaxial) drive kinematics: independent wheel angle + speed control.
 *
 * Each module has independent steering and drive. Standard 4-module layout:
 *   Front-Left, Front-Right, Rear-Left, Rear-Right
 *
 * Module positions relative to center of rotation:
 *   FL: (+L/2, +W/2), FR: (+L/2, -W/2)
 *   RL: (-L/2, +W/2), RR: (-L/2, -W/2)
 *
 * where L = wheelBase, W = trackWidth
 *
 * @node swerve-drive
 * @depends-on drivetrain-types
 * @contract swerve-drive.test.ts
 * @hint convention: Positive vx = forward, positive vy = left, positive omega = CCW
 * @hint optimize: Module angle continuity optimization prevents unnecessary 180° flips
 * @provenance Chief Delphi / FRC (standard swerve kinematics), Siegwart & Nourbakhsh 2011
 */

import type {
  Twist2D,
  SwerveDriveGeometry,
  SwerveModuleState,
  Pose2D,
} from './drivetrain-types.ts';
import { twist2d, pose2d } from './drivetrain-types.ts';

/** Complete swerve drive state: all four module states */
export interface SwerveState {
  frontLeft: SwerveModuleState;
  frontRight: SwerveModuleState;
  rearLeft: SwerveModuleState;
  rearRight: SwerveModuleState;
}

/**
 * Inverse kinematics: body twist to individual module states.
 *
 * For each module at position (mx, my) relative to robot center:
 *   vx_module = vx - omega * my
 *   vy_module = vy + omega * mx
 *   speed = sqrt(vx_module^2 + vy_module^2)
 *   angle = atan2(vy_module, vx_module)
 */
export function swerveInverseKinematics(
  geometry: SwerveDriveGeometry,
  twist: Twist2D,
): SwerveState {
  const { wheelBase, trackWidth } = geometry;
  const { vx, vy, omega } = twist;
  const L2 = wheelBase / 2;
  const W2 = trackWidth / 2;

  // Module positions: [mx, my]
  const modules: Array<{ mx: number; my: number }> = [
    { mx: L2, my: W2 },   // front-left
    { mx: L2, my: -W2 },  // front-right
    { mx: -L2, my: W2 },  // rear-left
    { mx: -L2, my: -W2 }, // rear-right
  ];

  const states = modules.map(({ mx, my }) => {
    const vxm = vx - omega * my;
    const vym = vy + omega * mx;
    const speed = Math.sqrt(vxm * vxm + vym * vym);
    const angle = speed < 1e-10 ? 0 : Math.atan2(vym, vxm);
    return { speed, angle };
  });

  return {
    frontLeft: states[0],
    frontRight: states[1],
    rearLeft: states[2],
    rearRight: states[3],
  };
}

/**
 * Forward kinematics: module states to body twist.
 *
 * Computes the least-squares best-fit twist from all four module velocities.
 * Uses a simple average of the four module contributions.
 */
export function swerveForwardKinematics(
  geometry: SwerveDriveGeometry,
  state: SwerveState,
): Twist2D {
  const { wheelBase, trackWidth } = geometry;
  const L2 = wheelBase / 2;
  const W2 = trackWidth / 2;

  const modules: Array<{ mx: number; my: number; state: SwerveModuleState }> = [
    { mx: L2, my: W2, state: state.frontLeft },
    { mx: L2, my: -W2, state: state.frontRight },
    { mx: -L2, my: W2, state: state.rearLeft },
    { mx: -L2, my: -W2, state: state.rearRight },
  ];

  let sumVx = 0, sumVy = 0, sumOmega = 0;

  for (const { mx, my, state: mod } of modules) {
    const vxm = mod.speed * Math.cos(mod.angle);
    const vym = mod.speed * Math.sin(mod.angle);
    sumVx += vxm;
    sumVy += vym;
    // omega contribution: from vxm = vx - omega*my and vym = vy + omega*mx
    // For each module: omega ≈ vym/mx (when mx ≠ 0) or -vxm/my (when my ≠ 0)
    // Better: use pseudo-inverse approach, but for 4 symmetric modules, average works
    const r2 = mx * mx + my * my;
    if (r2 > 1e-10) {
      sumOmega += (vym * mx - vxm * my) / r2;
    }
  }

  return twist2d(sumVx / 4, sumVy / 4, sumOmega / 4);
}

/**
 * Optimize module angle to minimize rotation from current angle.
 *
 * If reversing the wheel direction results in less steering rotation,
 * flip the speed sign and adjust the angle by π.
 *
 * @param desired  Desired module state from inverse kinematics
 * @param currentAngle  Current module steering angle (radians)
 * @returns Optimized module state
 */
export function swerveOptimizeModule(
  desired: SwerveModuleState,
  currentAngle: number,
): SwerveModuleState {
  let { speed, angle } = desired;

  // Normalize angle difference to [-π, π]
  let diff = angle - currentAngle;
  diff = ((diff % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

  if (Math.abs(diff) > Math.PI / 2) {
    // Reverse wheel and flip angle
    speed = -speed;
    angle = currentAngle + diff + (diff > 0 ? -Math.PI : Math.PI);
  } else {
    angle = currentAngle + diff;
  }

  return { speed, angle };
}

/**
 * Normalize module speeds so the maximum speed does not exceed maxSpeed.
 */
export function swerveNormalizeSpeeds(
  state: SwerveState,
  maxSpeed: number,
): SwerveState {
  const maxAbs = Math.max(
    Math.abs(state.frontLeft.speed),
    Math.abs(state.frontRight.speed),
    Math.abs(state.rearLeft.speed),
    Math.abs(state.rearRight.speed),
  );

  if (maxAbs <= maxSpeed) return state;

  const scale = maxSpeed / maxAbs;
  return {
    frontLeft: { speed: state.frontLeft.speed * scale, angle: state.frontLeft.angle },
    frontRight: { speed: state.frontRight.speed * scale, angle: state.frontRight.angle },
    rearLeft: { speed: state.rearLeft.speed * scale, angle: state.rearLeft.angle },
    rearRight: { speed: state.rearRight.speed * scale, angle: state.rearRight.angle },
  };
}

/**
 * Integrate swerve twist over dt to update pose.
 */
export function swerveOdometry(
  pose: Pose2D,
  twist: Twist2D,
  dt: number,
): Pose2D {
  const { x, y, theta } = pose;
  const { vx, vy, omega } = twist;

  if (Math.abs(omega) < 1e-10) {
    return pose2d(
      x + (vx * Math.cos(theta) - vy * Math.sin(theta)) * dt,
      y + (vx * Math.sin(theta) + vy * Math.cos(theta)) * dt,
      theta,
    );
  }

  const newTheta = theta + omega * dt;
  const sinDiff = Math.sin(newTheta) - Math.sin(theta);
  const cosDiff = Math.cos(newTheta) - Math.cos(theta);

  return pose2d(
    x + (vx * sinDiff + vy * cosDiff) / omega,
    y + (-vx * cosDiff + vy * sinDiff) / omega,
    newTheta,
  );
}
