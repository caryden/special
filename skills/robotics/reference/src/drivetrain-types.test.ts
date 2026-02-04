/**
 * Tests for drivetrain configuration types and factory functions.
 *
 * @contract drivetrain-types.test.ts
 */

import { describe, test, expect } from "bun:test";
import {
  twist2d,
  zeroTwist,
  differentialGeometry,
  pose2d,
  zeroPose,
  type Twist2D,
  type DifferentialDriveGeometry,
  type DifferentialWheelSpeeds,
  type MecanumDriveGeometry,
  type MecanumWheelSpeeds,
  type SwerveModuleState,
  type SwerveDriveGeometry,
  type AckermannGeometry,
  type AckermannCommand,
  type Pose2D,
} from "./drivetrain-types";

describe("twist2d", () => {
  test("creates a Twist2D with given values", () => {
    const t = twist2d(1.5, 0.3, -0.2);
    expect(t.vx).toBe(1.5);
    expect(t.vy).toBe(0.3);
    expect(t.omega).toBe(-0.2);
  });

  test("zeroTwist returns all zeros", () => {
    const t = zeroTwist();
    expect(t.vx).toBe(0);
    expect(t.vy).toBe(0);
    expect(t.omega).toBe(0);
  });
});

describe("differentialGeometry", () => {
  test("creates geometry with track width and wheel radius", () => {
    const g = differentialGeometry(0.5, 0.05);
    expect(g.trackWidth).toBe(0.5);
    expect(g.wheelRadius).toBe(0.05);
  });
});

describe("MecanumDriveGeometry", () => {
  test("fields are accessible on a literal", () => {
    const g: MecanumDriveGeometry = {
      wheelBase: 0.4,
      trackWidth: 0.35,
      wheelRadius: 0.05,
    };
    expect(g.wheelBase).toBe(0.4);
    expect(g.trackWidth).toBe(0.35);
    expect(g.wheelRadius).toBe(0.05);
  });
});

describe("MecanumWheelSpeeds", () => {
  test("four wheel speeds are independent", () => {
    const s: MecanumWheelSpeeds = {
      frontLeft: 1.0,
      frontRight: -1.0,
      rearLeft: -1.0,
      rearRight: 1.0,
    };
    expect(s.frontLeft).toBe(1.0);
    expect(s.frontRight).toBe(-1.0);
    expect(s.rearLeft).toBe(-1.0);
    expect(s.rearRight).toBe(1.0);
  });
});

describe("SwerveModuleState", () => {
  test("stores speed and angle", () => {
    const m: SwerveModuleState = { speed: 2.0, angle: Math.PI / 4 };
    expect(m.speed).toBe(2.0);
    expect(m.angle).toBeCloseTo(Math.PI / 4);
  });
});

describe("SwerveDriveGeometry", () => {
  test("stores wheelBase and trackWidth", () => {
    const g: SwerveDriveGeometry = { wheelBase: 0.6, trackWidth: 0.5 };
    expect(g.wheelBase).toBe(0.6);
    expect(g.trackWidth).toBe(0.5);
  });
});

describe("AckermannGeometry", () => {
  test("stores geometry with max steering angle", () => {
    const g: AckermannGeometry = {
      wheelBase: 2.5,
      trackWidth: 1.5,
      maxSteeringAngle: Math.PI / 6,
    };
    expect(g.wheelBase).toBe(2.5);
    expect(g.trackWidth).toBe(1.5);
    expect(g.maxSteeringAngle).toBeCloseTo(Math.PI / 6);
  });
});

describe("AckermannCommand", () => {
  test("stores speed and steering angle", () => {
    const cmd: AckermannCommand = { speed: 5.0, steeringAngle: 0.15 };
    expect(cmd.speed).toBe(5.0);
    expect(cmd.steeringAngle).toBe(0.15);
  });
});

describe("pose2d", () => {
  test("creates a Pose2D with given values", () => {
    const p = pose2d(1.0, 2.0, Math.PI / 2);
    expect(p.x).toBe(1.0);
    expect(p.y).toBe(2.0);
    expect(p.theta).toBeCloseTo(Math.PI / 2);
  });

  test("zeroPose returns origin", () => {
    const p = zeroPose();
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
    expect(p.theta).toBe(0);
  });
});

describe("type completeness", () => {
  test("DifferentialWheelSpeeds has left and right", () => {
    const ws: DifferentialWheelSpeeds = { left: 10.0, right: 12.0 };
    expect(ws.left).toBe(10.0);
    expect(ws.right).toBe(12.0);
  });

  test("all drivetrain types are structurally distinct", () => {
    // Verify that each type has its expected unique shape
    const twist: Twist2D = { vx: 0, vy: 0, omega: 0 };
    const diffGeo: DifferentialDriveGeometry = { trackWidth: 0.5, wheelRadius: 0.05 };
    const pose: Pose2D = { x: 0, y: 0, theta: 0 };

    // Each type has a distinct set of keys
    expect(Object.keys(twist).sort()).toEqual(["omega", "vx", "vy"]);
    expect(Object.keys(diffGeo).sort()).toEqual(["trackWidth", "wheelRadius"]);
    expect(Object.keys(pose).sort()).toEqual(["theta", "x", "y"]);
  });
});
