import { describe, it, expect } from 'bun:test';
import {
  diffDriveForwardKinematics,
  diffDriveInverseKinematics,
  diffDriveOdometry,
  diffDriveOdometryFromWheels,
  diffDriveArcLength,
  diffDriveRadius,
} from './differential-drive.ts';
import {
  differentialGeometry,
  twist2d,
  pose2d,
  zeroPose,
  zeroTwist,
} from './drivetrain-types.ts';

// Standard test geometry: trackWidth=0.5m, wheelRadius=0.1m
const geom = differentialGeometry(0.5, 0.1);

// ---------------------------------------------------------------------------
// Forward kinematics
// ---------------------------------------------------------------------------
describe('diffDriveForwardKinematics', () => {
  it('both wheels same speed → straight ahead', () => {
    const twist = diffDriveForwardKinematics(geom, { left: 10, right: 10 });
    expect(twist.vx).toBeCloseTo(1.0, 10); // 0.1/2 * 20 = 1.0
    expect(twist.vy).toBe(0);
    expect(twist.omega).toBeCloseTo(0, 10);
  });

  it('left wheel only → turns right (positive omega)', () => {
    // omega = (0.1/0.5) * (0 - 5) = -1.0  → actually turns right is negative omega
    // Convention: omega positive = CCW. left only → robot curves right → omega < 0
    const twist = diffDriveForwardKinematics(geom, { left: 5, right: 0 });
    expect(twist.vx).toBeCloseTo(0.25, 10); // 0.1/2 * 5 = 0.25
    expect(twist.omega).toBeCloseTo(-1.0, 10); // 0.1/0.5 * (0 - 5) = -1.0
  });

  it('right wheel only → turns left (negative omega for CW)', () => {
    const twist = diffDriveForwardKinematics(geom, { left: 0, right: 5 });
    expect(twist.vx).toBeCloseTo(0.25, 10);
    expect(twist.omega).toBeCloseTo(1.0, 10); // 0.1/0.5 * (5 - 0) = 1.0
  });

  it('equal opposite wheels → pure rotation', () => {
    const twist = diffDriveForwardKinematics(geom, { left: -5, right: 5 });
    expect(twist.vx).toBeCloseTo(0, 10);
    expect(twist.omega).toBeCloseTo(2.0, 10); // 0.1/0.5 * 10 = 2.0
  });

  it('zero speeds → zero twist', () => {
    const twist = diffDriveForwardKinematics(geom, { left: 0, right: 0 });
    expect(twist.vx).toBe(0);
    expect(twist.vy).toBe(0);
    expect(twist.omega).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Inverse kinematics
// ---------------------------------------------------------------------------
describe('diffDriveInverseKinematics', () => {
  it('pure forward → equal wheel speeds', () => {
    const ws = diffDriveInverseKinematics(geom, twist2d(1.0, 0, 0));
    expect(ws.left).toBeCloseTo(10, 10); // 1.0 / 0.1 = 10
    expect(ws.right).toBeCloseTo(10, 10);
  });

  it('pure rotation → equal opposite wheel speeds', () => {
    const ws = diffDriveInverseKinematics(geom, twist2d(0, 0, 2.0));
    // left = (0 - 2.0*0.25) / 0.1 = -5
    // right = (0 + 2.0*0.25) / 0.1 = 5
    expect(ws.left).toBeCloseTo(-5, 10);
    expect(ws.right).toBeCloseTo(5, 10);
  });

  it('round trip: FK(IK(twist)) recovers original twist', () => {
    const original = twist2d(0.7, 0, 1.3);
    const ws = diffDriveInverseKinematics(geom, original);
    const recovered = diffDriveForwardKinematics(geom, ws);
    expect(recovered.vx).toBeCloseTo(original.vx, 10);
    expect(recovered.vy).toBe(0);
    expect(recovered.omega).toBeCloseTo(original.omega, 10);
  });
});

// ---------------------------------------------------------------------------
// Odometry
// ---------------------------------------------------------------------------
describe('diffDriveOdometry', () => {
  it('straight line: omega=0 drives forward along x', () => {
    const p = diffDriveOdometry(zeroPose(), twist2d(1.0, 0, 0), 1.0);
    expect(p.x).toBeCloseTo(1.0, 10);
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.theta).toBeCloseTo(0, 10);
  });

  it('90° turn: pure rotation', () => {
    const omega = Math.PI / 2;
    const p = diffDriveOdometry(zeroPose(), twist2d(0, 0, omega), 1.0);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.theta).toBeCloseTo(Math.PI / 2, 10);
  });

  it('arc: combined forward + rotation', () => {
    const v = 1.0;
    const omega = Math.PI / 2; // quarter turn in 1s
    const p = diffDriveOdometry(zeroPose(), twist2d(v, 0, omega), 1.0);
    // Radius = v/omega = 2/pi
    // After quarter turn: x = R*sin(pi/2) = 2/pi, y = R*(1-cos(pi/2)) = 2/pi
    const R = v / omega;
    expect(p.x).toBeCloseTo(R * 1.0, 10); // R * sin(pi/2)
    expect(p.y).toBeCloseTo(R * 1.0, 10); // R * (1 - cos(pi/2)) = R
    expect(p.theta).toBeCloseTo(Math.PI / 2, 10);
  });

  it('zero dt → no change', () => {
    const start = pose2d(1, 2, 0.5);
    const p = diffDriveOdometry(start, twist2d(5, 0, 3), 0);
    expect(p.x).toBeCloseTo(1, 10);
    expect(p.y).toBeCloseTo(2, 10);
    expect(p.theta).toBeCloseTo(0.5, 10);
  });

  it('multiple steps accumulate correctly', () => {
    let p = zeroPose();
    const twist = twist2d(1.0, 0, 0);
    for (let i = 0; i < 10; i++) {
      p = diffDriveOdometry(p, twist, 0.1);
    }
    expect(p.x).toBeCloseTo(1.0, 8);
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.theta).toBeCloseTo(0, 10);
  });

  it('full circle returns near start', () => {
    let p = zeroPose();
    const omega = 2 * Math.PI; // full circle in 1 second
    const v = 1.0;
    const steps = 1000;
    const dt = 1.0 / steps;
    const twist = twist2d(v, 0, omega);
    for (let i = 0; i < steps; i++) {
      p = diffDriveOdometry(p, twist, dt);
    }
    expect(p.x).toBeCloseTo(0, 3);
    expect(p.y).toBeCloseTo(0, 3);
    expect(p.theta).toBeCloseTo(2 * Math.PI, 3);
  });

  it('straight line at non-zero heading', () => {
    const start = pose2d(0, 0, Math.PI / 4);
    const p = diffDriveOdometry(start, twist2d(1.0, 0, 0), 1.0);
    expect(p.x).toBeCloseTo(Math.cos(Math.PI / 4), 10);
    expect(p.y).toBeCloseTo(Math.sin(Math.PI / 4), 10);
    expect(p.theta).toBeCloseTo(Math.PI / 4, 10);
  });
});

// ---------------------------------------------------------------------------
// Odometry from wheels
// ---------------------------------------------------------------------------
describe('diffDriveOdometryFromWheels', () => {
  it('equal wheels → straight line', () => {
    const p = diffDriveOdometryFromWheels(zeroPose(), geom, { left: 10, right: 10 }, 1.0);
    expect(p.x).toBeCloseTo(1.0, 10); // v = 1.0 m/s * 1s
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.theta).toBeCloseTo(0, 10);
  });

  it('matches manual FK + odometry', () => {
    const ws = { left: 8, right: 12 };
    const dt = 0.5;
    const twist = diffDriveForwardKinematics(geom, ws);
    const expected = diffDriveOdometry(zeroPose(), twist, dt);
    const actual = diffDriveOdometryFromWheels(zeroPose(), geom, ws, dt);
    expect(actual.x).toBeCloseTo(expected.x, 10);
    expect(actual.y).toBeCloseTo(expected.y, 10);
    expect(actual.theta).toBeCloseTo(expected.theta, 10);
  });
});

// ---------------------------------------------------------------------------
// Cross-validation with PythonRobotics
// ---------------------------------------------------------------------------
describe('cross-validation (PythonRobotics geometry)', () => {
  // r=0.05m, L=0.3m
  const pyGeom = differentialGeometry(0.3, 0.05);

  it('known wheel speeds → known v, omega', () => {
    const twist = diffDriveForwardKinematics(pyGeom, { left: 10, right: 12 });
    // v = 0.05/2 * (10+12) = 0.55
    // omega = 0.05/0.3 * (12-10) = 0.3333...
    expect(twist.vx).toBeCloseTo(0.55, 10);
    expect(twist.omega).toBeCloseTo(1 / 3, 10);
  });

  it('drive forward 1m then turn 90°', () => {
    // Phase 1: drive straight 1m
    // v = 0.55 m/s with left=right=11 → v = 0.05/2*22 = 0.55
    const straightWs = { left: 11, right: 11 };
    const straightTwist = diffDriveForwardKinematics(pyGeom, straightWs);
    const timeForward = 1.0 / straightTwist.vx; // time to go 1m

    let p = zeroPose();
    p = diffDriveOdometry(p, straightTwist, timeForward);
    expect(p.x).toBeCloseTo(1.0, 6);
    expect(p.y).toBeCloseTo(0, 6);

    // Phase 2: rotate 90° in place
    // Pure rotation: left=-N, right=N
    // omega = 0.05/0.3 * 2N = N/3
    // For omega=pi/2 over 1s: N/3 = pi/2 → N = 3*pi/2
    const N = (3 * Math.PI) / 2;
    const rotWs = { left: -N, right: N };
    const rotTwist = diffDriveForwardKinematics(pyGeom, rotWs);
    p = diffDriveOdometry(p, rotTwist, 1.0);

    expect(p.x).toBeCloseTo(1.0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.theta).toBeCloseTo(Math.PI / 2, 6);
  });
});

// ---------------------------------------------------------------------------
// Arc length
// ---------------------------------------------------------------------------
describe('diffDriveArcLength', () => {
  it('straight line arc length = v * dt', () => {
    const d = diffDriveArcLength(geom, { left: 10, right: 10 }, 2.0);
    expect(d).toBeCloseTo(2.0, 10); // v=1.0 * dt=2.0
  });

  it('arc with different wheel speeds', () => {
    const ws = { left: 8, right: 12 };
    const twist = diffDriveForwardKinematics(geom, ws);
    const d = diffDriveArcLength(geom, ws, 1.0);
    expect(d).toBeCloseTo(Math.abs(twist.vx), 10);
  });

  it('zero speed → zero arc length', () => {
    expect(diffDriveArcLength(geom, { left: 0, right: 0 }, 1.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Turning radius
// ---------------------------------------------------------------------------
describe('diffDriveRadius', () => {
  it('straight line → Infinity', () => {
    expect(diffDriveRadius(geom, { left: 10, right: 10 })).toBe(Infinity);
  });

  it('pure rotation → radius = 0', () => {
    // R = 0.5/2 * (5 + (-5)) / ((-5) - 5) = 0.25 * 0 / (-10) = 0
    const r = diffDriveRadius(geom, { left: 5, right: -5 });
    expect(r).toBeCloseTo(0, 10);
  });

  it('known asymmetric → R = L/2 * (l+r)/(r-l)', () => {
    // left=8, right=12: R = 0.25 * 20/4 = 1.25
    const r = diffDriveRadius(geom, { left: 8, right: 12 });
    expect(r).toBeCloseTo(1.25, 10);
  });

  it('left only → R = -L/4 (turns right)', () => {
    // left=10, right=0: R = 0.25 * 10/(-10) = -0.25
    const r = diffDriveRadius(geom, { left: 10, right: 0 });
    expect(r).toBeCloseTo(-0.25, 10);
  });
});
