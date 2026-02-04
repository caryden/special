import { describe, expect, it } from 'bun:test';
import {
  mecanumInverseKinematics,
  mecanumForwardKinematics,
  mecanumOdometry,
  mecanumNormalizeSpeeds,
} from './mecanum-drive.ts';
import type { MecanumDriveGeometry, MecanumWheelSpeeds, Twist2D } from './drivetrain-types.ts';
import { twist2d, pose2d } from './drivetrain-types.ts';

const geo: MecanumDriveGeometry = { wheelBase: 0.5, trackWidth: 0.4, wheelRadius: 0.05 };

describe('mecanumInverseKinematics', () => {
  it('pure forward: all wheels spin equally', () => {
    const speeds = mecanumInverseKinematics(geo, twist2d(1, 0, 0));
    expect(speeds.frontLeft).toBeCloseTo(speeds.frontRight, 8);
    expect(speeds.rearLeft).toBeCloseTo(speeds.rearRight, 8);
    expect(speeds.frontLeft).toBeCloseTo(speeds.rearLeft, 8);
    expect(speeds.frontLeft).toBeCloseTo(1 / geo.wheelRadius, 8);
  });

  it('pure strafe left: opposite diagonals cancel', () => {
    const speeds = mecanumInverseKinematics(geo, twist2d(0, 1, 0));
    // FL and RR should be negative (or equal), FR and RL positive
    expect(speeds.frontLeft).toBeCloseTo(-1 / geo.wheelRadius, 8);
    expect(speeds.frontRight).toBeCloseTo(1 / geo.wheelRadius, 8);
    expect(speeds.rearLeft).toBeCloseTo(1 / geo.wheelRadius, 8);
    expect(speeds.rearRight).toBeCloseTo(-1 / geo.wheelRadius, 8);
  });

  it('pure rotation: symmetric pattern', () => {
    const speeds = mecanumInverseKinematics(geo, twist2d(0, 0, 1));
    const k = (geo.wheelBase + geo.trackWidth) / 2;
    expect(speeds.frontLeft).toBeCloseTo(-k / geo.wheelRadius, 8);
    expect(speeds.frontRight).toBeCloseTo(k / geo.wheelRadius, 8);
    expect(speeds.rearLeft).toBeCloseTo(-k / geo.wheelRadius, 8);
    expect(speeds.rearRight).toBeCloseTo(k / geo.wheelRadius, 8);
  });

  it('zero twist: all wheels stop', () => {
    const speeds = mecanumInverseKinematics(geo, twist2d(0, 0, 0));
    expect(speeds.frontLeft).toBe(0);
    expect(speeds.frontRight).toBe(0);
    expect(speeds.rearLeft).toBe(0);
    expect(speeds.rearRight).toBe(0);
  });
});

describe('mecanumForwardKinematics', () => {
  it('round-trips with inverse kinematics', () => {
    const twists: Twist2D[] = [
      twist2d(1, 0, 0),
      twist2d(0, 1, 0),
      twist2d(0, 0, 1),
      twist2d(1, 0.5, 0.3),
      twist2d(-0.5, 0.2, -0.1),
    ];
    for (const twist of twists) {
      const speeds = mecanumInverseKinematics(geo, twist);
      const recovered = mecanumForwardKinematics(geo, speeds);
      expect(recovered.vx).toBeCloseTo(twist.vx, 8);
      expect(recovered.vy).toBeCloseTo(twist.vy, 8);
      expect(recovered.omega).toBeCloseTo(twist.omega, 8);
    }
  });

  it('equal wheel speeds produce pure forward motion', () => {
    const speeds: MecanumWheelSpeeds = { frontLeft: 10, frontRight: 10, rearLeft: 10, rearRight: 10 };
    const twist = mecanumForwardKinematics(geo, speeds);
    expect(twist.vy).toBeCloseTo(0, 8);
    expect(twist.omega).toBeCloseTo(0, 8);
    expect(twist.vx).toBeCloseTo(10 * geo.wheelRadius, 8);
  });

  it('opposite diagonal pattern produces strafe', () => {
    const speeds: MecanumWheelSpeeds = { frontLeft: -10, frontRight: 10, rearLeft: 10, rearRight: -10 };
    const twist = mecanumForwardKinematics(geo, speeds);
    expect(twist.vx).toBeCloseTo(0, 8);
    expect(twist.omega).toBeCloseTo(0, 8);
    expect(twist.vy).toBeGreaterThan(0);
  });
});

describe('mecanumOdometry', () => {
  it('pure forward from origin', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(1, 0, 0);
    const newPose = mecanumOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(1, 8);
    expect(newPose.y).toBeCloseTo(0, 8);
    expect(newPose.theta).toBeCloseTo(0, 8);
  });

  it('pure strafe left from origin', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(0, 1, 0);
    const newPose = mecanumOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(0, 8);
    expect(newPose.y).toBeCloseTo(1, 8);
    expect(newPose.theta).toBeCloseTo(0, 8);
  });

  it('forward motion at 90° heading moves along +Y world', () => {
    const pose = pose2d(0, 0, Math.PI / 2);
    const twist = twist2d(1, 0, 0);
    const newPose = mecanumOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(0, 6);
    expect(newPose.y).toBeCloseTo(1, 6);
  });

  it('pure rotation changes theta only', () => {
    const pose = pose2d(5, 5, 0);
    const twist = twist2d(0, 0, Math.PI / 2);
    const newPose = mecanumOdometry(pose, twist, 1.0);
    expect(newPose.x).toBeCloseTo(5, 6);
    expect(newPose.y).toBeCloseTo(5, 6);
    expect(newPose.theta).toBeCloseTo(Math.PI / 2, 8);
  });

  it('combined translation and rotation', () => {
    const pose = pose2d(0, 0, 0);
    const twist = twist2d(1, 0, Math.PI / 4);
    const newPose = mecanumOdometry(pose, twist, 1.0);
    expect(newPose.theta).toBeCloseTo(Math.PI / 4, 8);
    // Should have moved forward while turning
    expect(newPose.x).toBeGreaterThan(0);
    expect(newPose.y).toBeGreaterThan(0);
  });
});

describe('mecanumNormalizeSpeeds', () => {
  it('returns unchanged if within limits', () => {
    const speeds: MecanumWheelSpeeds = { frontLeft: 5, frontRight: -3, rearLeft: 4, rearRight: -2 };
    const result = mecanumNormalizeSpeeds(speeds, 10);
    expect(result.frontLeft).toBe(5);
    expect(result.frontRight).toBe(-3);
  });

  it('scales down proportionally when exceeding max', () => {
    const speeds: MecanumWheelSpeeds = { frontLeft: 20, frontRight: 10, rearLeft: -10, rearRight: -20 };
    const result = mecanumNormalizeSpeeds(speeds, 10);
    expect(Math.abs(result.frontLeft)).toBeCloseTo(10, 8);
    expect(Math.abs(result.rearRight)).toBeCloseTo(10, 8);
    // Ratio should be preserved
    expect(result.frontRight / result.frontLeft).toBeCloseTo(10 / 20, 8);
  });

  it('preserves signs', () => {
    const speeds: MecanumWheelSpeeds = { frontLeft: -30, frontRight: 10, rearLeft: 20, rearRight: -15 };
    const result = mecanumNormalizeSpeeds(speeds, 10);
    expect(result.frontLeft).toBeLessThan(0);
    expect(result.frontRight).toBeGreaterThan(0);
    expect(result.rearLeft).toBeGreaterThan(0);
    expect(result.rearRight).toBeLessThan(0);
  });

  it('handles zero speeds', () => {
    const speeds: MecanumWheelSpeeds = { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 };
    const result = mecanumNormalizeSpeeds(speeds, 10);
    expect(result.frontLeft).toBe(0);
  });
});
