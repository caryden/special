import { describe, expect, it } from 'bun:test';
import {
  swerveInverseKinematics,
  swerveForwardKinematics,
  swerveOptimizeModule,
  swerveNormalizeSpeeds,
  swerveOdometry,
  type SwerveState,
} from './swerve-drive.ts';
import type { SwerveDriveGeometry, SwerveModuleState, Twist2D } from './drivetrain-types.ts';
import { twist2d, pose2d } from './drivetrain-types.ts';

const geo: SwerveDriveGeometry = { wheelBase: 0.6, trackWidth: 0.5 };

describe('swerveInverseKinematics', () => {
  it('pure forward: all modules at angle 0', () => {
    const state = swerveInverseKinematics(geo, twist2d(1, 0, 0));
    expect(state.frontLeft.angle).toBeCloseTo(0, 8);
    expect(state.frontRight.angle).toBeCloseTo(0, 8);
    expect(state.rearLeft.angle).toBeCloseTo(0, 8);
    expect(state.rearRight.angle).toBeCloseTo(0, 8);
    // All speeds should be equal (and equal to vx=1)
    expect(state.frontLeft.speed).toBeCloseTo(1, 8);
    expect(state.frontRight.speed).toBeCloseTo(1, 8);
  });

  it('pure strafe left: all modules at π/2', () => {
    const state = swerveInverseKinematics(geo, twist2d(0, 1, 0));
    expect(state.frontLeft.angle).toBeCloseTo(Math.PI / 2, 8);
    expect(state.frontRight.angle).toBeCloseTo(Math.PI / 2, 8);
    expect(state.rearLeft.angle).toBeCloseTo(Math.PI / 2, 8);
    expect(state.rearRight.angle).toBeCloseTo(Math.PI / 2, 8);
  });

  it('pure rotation: symmetric tangent angles', () => {
    const state = swerveInverseKinematics(geo, twist2d(0, 0, 1));
    // All modules should have equal speed magnitude
    const speeds = [
      Math.abs(state.frontLeft.speed),
      Math.abs(state.frontRight.speed),
      Math.abs(state.rearLeft.speed),
      Math.abs(state.rearRight.speed),
    ];
    expect(speeds[0]).toBeCloseTo(speeds[1], 6);
    expect(speeds[0]).toBeCloseTo(speeds[2], 6);
  });

  it('zero twist: all speeds zero', () => {
    const state = swerveInverseKinematics(geo, twist2d(0, 0, 0));
    expect(state.frontLeft.speed).toBeCloseTo(0, 10);
    expect(state.frontRight.speed).toBeCloseTo(0, 10);
    expect(state.rearLeft.speed).toBeCloseTo(0, 10);
    expect(state.rearRight.speed).toBeCloseTo(0, 10);
  });
});

describe('swerveForwardKinematics', () => {
  it('round-trips with inverse kinematics', () => {
    const twists: Twist2D[] = [
      twist2d(1, 0, 0),
      twist2d(0, 1, 0),
      twist2d(0, 0, 1),
      twist2d(1, 0.5, 0.3),
      twist2d(-0.5, 0.2, -0.1),
    ];
    for (const twist of twists) {
      const state = swerveInverseKinematics(geo, twist);
      const recovered = swerveForwardKinematics(geo, state);
      expect(recovered.vx).toBeCloseTo(twist.vx, 4);
      expect(recovered.vy).toBeCloseTo(twist.vy, 4);
      expect(recovered.omega).toBeCloseTo(twist.omega, 4);
    }
  });

  it('all modules forward produces forward motion', () => {
    const state: SwerveState = {
      frontLeft: { speed: 1, angle: 0 },
      frontRight: { speed: 1, angle: 0 },
      rearLeft: { speed: 1, angle: 0 },
      rearRight: { speed: 1, angle: 0 },
    };
    const twist = swerveForwardKinematics(geo, state);
    expect(twist.vx).toBeCloseTo(1, 6);
    expect(twist.vy).toBeCloseTo(0, 6);
    expect(twist.omega).toBeCloseTo(0, 6);
  });
});

describe('swerveOptimizeModule', () => {
  it('no change needed when angle is close', () => {
    const desired: SwerveModuleState = { speed: 1, angle: 0.1 };
    const optimized = swerveOptimizeModule(desired, 0);
    expect(optimized.speed).toBeCloseTo(1, 8);
    expect(optimized.angle).toBeCloseTo(0.1, 8);
  });

  it('reverses speed for >90° rotation', () => {
    const desired: SwerveModuleState = { speed: 1, angle: Math.PI };
    const optimized = swerveOptimizeModule(desired, 0);
    expect(optimized.speed).toBeCloseTo(-1, 8);
    // Angle should be near 0 (flipped by π)
    expect(Math.abs(optimized.angle)).toBeLessThan(Math.PI / 2 + 0.1);
  });

  it('handles wrap-around', () => {
    const desired: SwerveModuleState = { speed: 1, angle: -Math.PI + 0.1 };
    const optimized = swerveOptimizeModule(desired, Math.PI - 0.1);
    // Should flip instead of rotating almost 360°
    expect(Math.abs(optimized.angle - (Math.PI - 0.1))).toBeLessThan(Math.PI / 2 + 0.1);
  });

  it('preserves angle when <90° from current', () => {
    const desired: SwerveModuleState = { speed: 2, angle: Math.PI / 4 };
    const optimized = swerveOptimizeModule(desired, 0);
    expect(optimized.speed).toBeCloseTo(2, 8);
  });
});

describe('swerveNormalizeSpeeds', () => {
  it('unchanged when within limits', () => {
    const state: SwerveState = {
      frontLeft: { speed: 3, angle: 0 },
      frontRight: { speed: -2, angle: 0.5 },
      rearLeft: { speed: 4, angle: 1 },
      rearRight: { speed: -1, angle: 1.5 },
    };
    const result = swerveNormalizeSpeeds(state, 5);
    expect(result.frontLeft.speed).toBe(3);
    expect(result.rearLeft.speed).toBe(4);
  });

  it('scales proportionally when exceeding max', () => {
    const state: SwerveState = {
      frontLeft: { speed: 10, angle: 0 },
      frontRight: { speed: 5, angle: 0 },
      rearLeft: { speed: -8, angle: 0 },
      rearRight: { speed: 6, angle: 0 },
    };
    const result = swerveNormalizeSpeeds(state, 5);
    expect(Math.abs(result.frontLeft.speed)).toBeCloseTo(5, 8);
    expect(result.frontRight.speed / result.frontLeft.speed).toBeCloseTo(5 / 10, 8);
  });

  it('preserves angles', () => {
    const state: SwerveState = {
      frontLeft: { speed: 20, angle: 1.1 },
      frontRight: { speed: 15, angle: 2.2 },
      rearLeft: { speed: -10, angle: 0.5 },
      rearRight: { speed: 5, angle: 3.0 },
    };
    const result = swerveNormalizeSpeeds(state, 10);
    expect(result.frontLeft.angle).toBe(1.1);
    expect(result.frontRight.angle).toBe(2.2);
  });
});

describe('swerveOdometry', () => {
  it('forward motion from origin', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(1, 0, 0);
    const newPose = swerveOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(1, 8);
    expect(newPose.y).toBeCloseTo(0, 8);
    expect(newPose.theta).toBeCloseTo(0, 8);
  });

  it('strafe left from origin', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(0, 1, 0);
    const newPose = swerveOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(0, 8);
    expect(newPose.y).toBeCloseTo(1, 8);
  });

  it('pure rotation', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(0, 0, Math.PI / 2);
    const newPose = swerveOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(0, 6);
    expect(newPose.y).toBeCloseTo(0, 6);
    expect(newPose.theta).toBeCloseTo(Math.PI / 2, 8);
  });

  it('diagonal motion at heading=0', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(1, 1, 0);
    const newPose = swerveOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(1, 8);
    expect(newPose.y).toBeCloseTo(1, 8);
  });
});
