import { describe, expect, it } from 'bun:test';
import {
  ackermannForwardKinematics,
  ackermannInverseKinematics,
  ackermannTurningRadius,
  ackermannWheelAngles,
  ackermannOdometry,
  ackermannClampSteering,
} from './ackermann.ts';
import type { AckermannGeometry } from './drivetrain-types.ts';
import { twist2d, pose2d } from './drivetrain-types.ts';

const geo: AckermannGeometry = { wheelBase: 2.5, trackWidth: 1.5, maxSteeringAngle: Math.PI / 4 };

describe('ackermannForwardKinematics', () => {
  it('straight-line: zero steering angle gives zero omega', () => {
    const twist = ackermannForwardKinematics(geo, { speed: 1, steeringAngle: 0 });
    expect(twist.vx).toBeCloseTo(1, 10);
    expect(twist.omega).toBeCloseTo(0, 10);
    expect(twist.vy).toBe(0);
  });

  it('left turn: positive steering gives positive omega', () => {
    const twist = ackermannForwardKinematics(geo, { speed: 1, steeringAngle: 0.1 });
    expect(twist.omega).toBeGreaterThan(0);
  });

  it('right turn: negative steering gives negative omega', () => {
    const twist = ackermannForwardKinematics(geo, { speed: 1, steeringAngle: -0.1 });
    expect(twist.omega).toBeLessThan(0);
  });

  it('omega = speed * tan(delta) / L', () => {
    const delta = 0.2;
    const speed = 3.0;
    const twist = ackermannForwardKinematics(geo, { speed, steeringAngle: delta });
    expect(twist.omega).toBeCloseTo(speed * Math.tan(delta) / geo.wheelBase, 10);
  });

  it('zero speed gives zero omega', () => {
    const twist = ackermannForwardKinematics(geo, { speed: 0, steeringAngle: 0.3 });
    expect(twist.omega).toBeCloseTo(0, 10);
  });

  it('reverse: negative speed with left steering gives negative omega', () => {
    const twist = ackermannForwardKinematics(geo, { speed: -1, steeringAngle: 0.2 });
    expect(twist.omega).toBeLessThan(0);
  });
});

describe('ackermannInverseKinematics', () => {
  it('round-trips with forward kinematics', () => {
    const commands = [
      { speed: 1, steeringAngle: 0 },
      { speed: 2, steeringAngle: 0.1 },
      { speed: 0.5, steeringAngle: -0.2 },
    ];
    for (const cmd of commands) {
      const twist = ackermannForwardKinematics(geo, cmd);
      const recovered = ackermannInverseKinematics(geo, twist);
      expect(recovered.speed).toBeCloseTo(cmd.speed, 8);
      expect(recovered.steeringAngle).toBeCloseTo(cmd.steeringAngle, 8);
    }
  });

  it('zero speed twist returns zero command', () => {
    const cmd = ackermannInverseKinematics(geo, twist2d(0, 0, 0));
    expect(cmd.speed).toBe(0);
    expect(cmd.steeringAngle).toBe(0);
  });

  it('clamps to max steering angle', () => {
    const twist = twist2d(1, 0, 100); // would require huge steering angle
    const cmd = ackermannInverseKinematics(geo, twist);
    expect(Math.abs(cmd.steeringAngle)).toBeLessThanOrEqual(geo.maxSteeringAngle + 1e-10);
  });
});

describe('ackermannTurningRadius', () => {
  it('straight-line returns Infinity', () => {
    expect(ackermannTurningRadius(geo, 0)).toBe(Infinity);
  });

  it('R = L / tan(delta)', () => {
    const delta = 0.2;
    const R = ackermannTurningRadius(geo, delta);
    expect(R).toBeCloseTo(geo.wheelBase / Math.tan(delta), 8);
  });

  it('larger steering angle gives smaller radius', () => {
    const R1 = ackermannTurningRadius(geo, 0.1);
    const R2 = ackermannTurningRadius(geo, 0.3);
    expect(R2).toBeLessThan(R1);
  });

  it('negative angle gives negative radius', () => {
    const R = ackermannTurningRadius(geo, -0.2);
    expect(R).toBeLessThan(0);
  });
});

describe('ackermannWheelAngles', () => {
  it('straight: both angles zero', () => {
    const angles = ackermannWheelAngles(geo, 0);
    expect(angles.inner).toBe(0);
    expect(angles.outer).toBe(0);
  });

  it('inner angle is larger than outer for left turn', () => {
    const angles = ackermannWheelAngles(geo, 0.2);
    expect(Math.abs(angles.inner)).toBeGreaterThan(Math.abs(angles.outer));
  });

  it('signs match steering direction (positive = left)', () => {
    const left = ackermannWheelAngles(geo, 0.2);
    expect(left.inner).toBeGreaterThan(0);
    expect(left.outer).toBeGreaterThan(0);

    const right = ackermannWheelAngles(geo, -0.2);
    expect(right.inner).toBeLessThan(0);
    expect(right.outer).toBeLessThan(0);
  });

  it('average of inner and outer approximates bicycle angle', () => {
    const delta = 0.15;
    const angles = ackermannWheelAngles(geo, delta);
    const avg = (angles.inner + angles.outer) / 2;
    expect(avg).toBeCloseTo(delta, 1); // rough approximation
  });
});

describe('ackermannOdometry', () => {
  it('straight-line motion at theta=0', () => {
    const pose = pose2d(0, 0, 0);
    const newPose = ackermannOdometry(pose, { speed: 1, steeringAngle: 0 }, geo, 1.0);
    expect(newPose.x).toBeCloseTo(1, 8);
    expect(newPose.y).toBeCloseTo(0, 8);
    expect(newPose.theta).toBeCloseTo(0, 8);
  });

  it('straight-line at heading π/2', () => {
    const pose = pose2d(0, 0, Math.PI / 2);
    const newPose = ackermannOdometry(pose, { speed: 1, steeringAngle: 0 }, geo, 1.0);
    expect(newPose.x).toBeCloseTo(0, 6);
    expect(newPose.y).toBeCloseTo(1, 6);
  });

  it('left turn increases theta', () => {
    const pose = pose2d(0, 0, 0);
    const newPose = ackermannOdometry(pose, { speed: 1, steeringAngle: 0.3 }, geo, 1.0);
    expect(newPose.theta).toBeGreaterThan(0);
  });

  it('full circle returns near starting pose', () => {
    const delta = 0.2;
    const R = geo.wheelBase / Math.tan(delta);
    const circumference = 2 * Math.PI * Math.abs(R);
    const speed = 1.0;
    const totalTime = circumference / speed;
    const dt = 0.01;
    const steps = Math.round(totalTime / dt);

    let pose = pose2d(0, 0, 0);
    for (let i = 0; i < steps; i++) {
      pose = ackermannOdometry(pose, { speed, steeringAngle: delta }, geo, dt);
    }
    // After full circle, should be near start
    expect(pose.x).toBeCloseTo(0, 0);
    expect(pose.y).toBeCloseTo(0, 0);
    expect(Math.abs(pose.theta % (2 * Math.PI))).toBeCloseTo(0, 0);
  });

  it('reverse motion', () => {
    const pose = pose2d(0, 0, 0);
    const newPose = ackermannOdometry(pose, { speed: -1, steeringAngle: 0 }, geo, 1.0);
    expect(newPose.x).toBeCloseTo(-1, 8);
    expect(newPose.y).toBeCloseTo(0, 8);
  });
});

describe('ackermannClampSteering', () => {
  it('returns input within limits', () => {
    expect(ackermannClampSteering(geo, 0.1)).toBe(0.1);
    expect(ackermannClampSteering(geo, -0.1)).toBe(-0.1);
  });

  it('clamps positive overshoot', () => {
    expect(ackermannClampSteering(geo, 2.0)).toBe(geo.maxSteeringAngle);
  });

  it('clamps negative overshoot', () => {
    expect(ackermannClampSteering(geo, -2.0)).toBe(-geo.maxSteeringAngle);
  });

  it('zero passes through', () => {
    expect(ackermannClampSteering(geo, 0)).toBe(0);
  });
});
