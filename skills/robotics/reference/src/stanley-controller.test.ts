import { describe, expect, it } from 'bun:test';
import {
  stanleyControl,
  stanleySteeringAngle,
  stanleyFindNearest,
  stanleyFrontAxle,
  normalizeAngle,
  DEFAULT_STANLEY_CONFIG,
} from './stanley-controller.ts';
import type { Point2D } from './result-types.ts';
import { point2d } from './result-types.ts';
import { pose2d } from './drivetrain-types.ts';

describe('normalizeAngle', () => {
  it('passes through angles in [-π, π]', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0, 10);
    expect(normalizeAngle(1)).toBeCloseTo(1, 10);
    expect(normalizeAngle(-1)).toBeCloseTo(-1, 10);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 8);
  });

  it('normalizes angles > π', () => {
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 8);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 8);
  });

  it('normalizes angles < -π', () => {
    expect(normalizeAngle(-2 * Math.PI)).toBeCloseTo(0, 8);
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI, 8);
  });
});

describe('stanleyFrontAxle', () => {
  it('computes front axle position at theta=0', () => {
    const front = stanleyFrontAxle(pose2d(0, 0, 0), 2.0);
    expect(front.x).toBeCloseTo(2, 10);
    expect(front.y).toBeCloseTo(0, 10);
  });

  it('computes front axle at theta=π/2', () => {
    const front = stanleyFrontAxle(pose2d(1, 1, Math.PI / 2), 2.0);
    expect(front.x).toBeCloseTo(1, 8);
    expect(front.y).toBeCloseTo(3, 8);
  });

  it('front axle distance equals wheelbase', () => {
    const pose = pose2d(3, 4, 0.5);
    const L = 2.5;
    const front = stanleyFrontAxle(pose, L);
    const dist = Math.sqrt((front.x - pose.x) ** 2 + (front.y - pose.y) ** 2);
    expect(dist).toBeCloseTo(L, 8);
  });
});

describe('stanleyFindNearest', () => {
  const path: Point2D[] = [
    point2d(0, 0),
    point2d(5, 0),
    point2d(10, 0),
  ];

  it('finds nearest segment for point on path', () => {
    const result = stanleyFindNearest(point2d(2, 0), path);
    expect(result.index).toBe(0);
    expect(result.crosstrackError).toBeCloseTo(0, 6);
  });

  it('positive crosstrack error for point to the left', () => {
    const result = stanleyFindNearest(point2d(2, 1), path);
    expect(result.crosstrackError).toBeGreaterThan(0);
  });

  it('negative crosstrack error for point to the right', () => {
    const result = stanleyFindNearest(point2d(2, -1), path);
    expect(result.crosstrackError).toBeLessThan(0);
  });

  it('path heading is 0 for horizontal path', () => {
    const result = stanleyFindNearest(point2d(2, 0), path);
    expect(result.pathHeading).toBeCloseTo(0, 8);
  });

  it('finds correct segment for point near second segment', () => {
    const result = stanleyFindNearest(point2d(7, 0.5), path);
    expect(result.index).toBe(1);
  });

  it('nearest point is on the path', () => {
    const result = stanleyFindNearest(point2d(3, 2), path);
    expect(result.nearestPoint.y).toBeCloseTo(0, 8);
    expect(result.nearestPoint.x).toBeCloseTo(3, 8);
  });

  it('handles degenerate zero-length segment', () => {
    const degeneratePath: Point2D[] = [
      point2d(3, 3),
      point2d(3, 3),  // zero-length segment
      point2d(6, 3),
    ];
    const result = stanleyFindNearest(point2d(4, 3), degeneratePath);
    expect(result.nearestPoint.x).toBeCloseTo(4, 8);
    expect(result.nearestPoint.y).toBeCloseTo(3, 8);
  });
});

describe('stanleySteeringAngle', () => {
  it('zero error produces zero steering', () => {
    const delta = stanleySteeringAngle(0, 0, 1);
    expect(delta).toBeCloseTo(0, 8);
  });

  it('heading error only: steering equals heading error', () => {
    const headingError = 0.1;
    const delta = stanleySteeringAngle(headingError, 0, 1);
    expect(delta).toBeCloseTo(headingError, 8);
  });

  it('crosstrack error only: steering corrects toward path', () => {
    // Positive crosstrack (left of path) should steer right (negative)
    // delta = 0 + atan(-k * e / v) → negative for positive e
    const delta = stanleySteeringAngle(0, 1, 1);
    expect(delta).toBeLessThan(0);
  });

  it('clamps to max steering angle', () => {
    const config = { ...DEFAULT_STANLEY_CONFIG, maxSteering: 0.5 };
    const delta = stanleySteeringAngle(1.0, 5.0, 0.1, config);
    expect(Math.abs(delta)).toBeLessThanOrEqual(0.5 + 1e-10);
  });

  it('higher speed reduces crosstrack correction', () => {
    const slow = stanleySteeringAngle(0, 1, 1);
    const fast = stanleySteeringAngle(0, 1, 10);
    expect(Math.abs(fast)).toBeLessThan(Math.abs(slow));
  });

  it('higher k increases crosstrack correction', () => {
    const lowK = stanleySteeringAngle(0, 1, 1, { ...DEFAULT_STANLEY_CONFIG, k: 0.5 });
    const highK = stanleySteeringAngle(0, 1, 1, { ...DEFAULT_STANLEY_CONFIG, k: 5.0 });
    expect(Math.abs(highK)).toBeGreaterThan(Math.abs(lowK));
  });
});

describe('stanleyControl', () => {
  const straightPath: Point2D[] = [
    point2d(0, 0),
    point2d(10, 0),
    point2d(20, 0),
  ];
  const wheelBase = 2.5;

  it('on-path, aligned: steering near zero', () => {
    const pose = pose2d(0, 0, 0);
    const output = stanleyControl(pose, straightPath, 1, wheelBase);
    expect(output.linear).toBe(1);
    expect(Math.abs(output.angular)).toBeLessThan(0.01);
  });

  it('off-path left: steers to correct', () => {
    const pose = pose2d(5, 2, 0); // left of path
    const output = stanleyControl(pose, straightPath, 1, wheelBase);
    // Should steer toward path (some non-zero correction)
    expect(output.angular).not.toBe(0);
  });

  it('heading error: produces non-zero steering correction', () => {
    const pose = pose2d(5, 0, 0.3); // on path at rear axle but heading wrong
    const output = stanleyControl(pose, straightPath, 1, wheelBase);
    // Front axle is off path due to heading; steering compensates both heading and crosstrack
    expect(output.angular).not.toBe(0);
  });

  it('pure heading error (front axle on path): steers to correct', () => {
    // Place robot so that front axle is on path but heading is wrong
    const headingError = -0.3;
    const delta = stanleySteeringAngle(headingError, 0, 1);
    expect(delta).toBeCloseTo(headingError, 8);
  });

  it('returns configured speed', () => {
    const pose = pose2d(0, 0, 0);
    const output = stanleyControl(pose, straightPath, 3.5, wheelBase);
    expect(output.linear).toBe(3.5);
  });
});

describe('stanleyControl — convergence', () => {
  it('converges to path over multiple steps', () => {
    const path: Point2D[] = [point2d(0, 0), point2d(100, 0)];
    const wheelBase = 2.5;
    const dt = 0.1;
    const speed = 2.0;

    let pose = pose2d(0, 3, 0.2); // start offset and misaligned
    const config = { ...DEFAULT_STANLEY_CONFIG, k: 2.0 };

    for (let i = 0; i < 200; i++) {
      const output = stanleyControl(pose, path, speed, wheelBase, config);
      // Simple kinematic update (bicycle model)
      const omega = speed * Math.tan(output.angular) / wheelBase;
      pose = pose2d(
        pose.x + speed * Math.cos(pose.theta) * dt,
        pose.y + speed * Math.sin(pose.theta) * dt,
        pose.theta + omega * dt,
      );
    }

    // After 200 steps, should be close to path
    expect(Math.abs(pose.y)).toBeLessThan(0.5);
    expect(Math.abs(pose.theta)).toBeLessThan(0.1);
  });
});
