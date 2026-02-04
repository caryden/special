import { describe, expect, test } from 'bun:test';
import {
  findLookaheadPoint,
  purePursuitCurvature,
  purePursuitControl,
  adaptiveLookahead,
} from './pure-pursuit.ts';
import { point2d } from './result-types.ts';
import { pose2d } from './drivetrain-types.ts';
import type { Point2D } from './result-types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function straightPath(length: number, step: number = 1): Point2D[] {
  const pts: Point2D[] = [];
  for (let x = 0; x <= length; x += step) {
    pts.push(point2d(x, 0));
  }
  return pts;
}

// ---------------------------------------------------------------------------
// findLookaheadPoint
// ---------------------------------------------------------------------------

describe('findLookaheadPoint', () => {
  test('straight path ahead — lookahead point is straight ahead', () => {
    const pose = pose2d(0, 0, 0);
    const path = straightPath(10);
    const result = findLookaheadPoint(pose, path, 3);

    expect(result.point.x).toBeCloseTo(3, 5);
    expect(result.point.y).toBeCloseTo(0, 5);
  });

  test('path behind robot — finds nearest point', () => {
    // Robot is at (10, 0) facing +x, path is from (0,0) to (5,0)
    // Lookahead circle of radius 2 centered at (10,0) does not intersect the path
    const pose = pose2d(10, 0, 0);
    const path = [point2d(0, 0), point2d(5, 0)];
    const result = findLookaheadPoint(pose, path, 2);

    // Nearest point should be (5, 0)
    expect(result.point.x).toBeCloseTo(5, 5);
    expect(result.point.y).toBeCloseTo(0, 5);
    expect(result.index).toBe(0);
  });

  test('path to the side — correct intersection', () => {
    // Robot at origin, path goes from (0, -5) to (0, 5) along the y-axis
    const pose = pose2d(0, 0, 0);
    const path = [point2d(0, -5), point2d(0, 5)];
    const result = findLookaheadPoint(pose, path, 2);

    // Should find intersection on y-axis at distance 2, furthest along path = (0, 2)
    expect(result.point.x).toBeCloseTo(0, 5);
    expect(result.point.y).toBeCloseTo(2, 5);
    expect(dist(result.point, point2d(0, 0))).toBeCloseTo(2, 5);
  });

  test('no intersection — returns nearest point on path', () => {
    // Robot far from path
    const pose = pose2d(100, 100, 0);
    const path = [point2d(0, 0), point2d(5, 0)];
    const result = findLookaheadPoint(pose, path, 2);

    // Nearest point should be (5, 0) — closest point on segment to (100, 100)
    expect(result.point.x).toBeCloseTo(5, 5);
    expect(result.point.y).toBeCloseTo(0, 5);
  });

  test('picks furthest intersection along path', () => {
    // Path makes a U-shape that crosses the lookahead circle twice
    const pose = pose2d(0, 0, 0);
    const path = [
      point2d(-5, 0),
      point2d(5, 0),    // segment 0 crosses circle
      point2d(5, 5),    // segment 1 goes up
      point2d(-5, 5),   // segment 2 goes left
    ];
    const result = findLookaheadPoint(pose, path, 3);

    // Should pick the intersection on segment 0 at (3, 0) since it's the furthest
    // valid intersection along the path
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(dist(result.point, point2d(0, 0))).toBeCloseTo(3, 1);
  });
});

// ---------------------------------------------------------------------------
// purePursuitCurvature
// ---------------------------------------------------------------------------

describe('purePursuitCurvature', () => {
  test('goal straight ahead — curvature ≈ 0', () => {
    const pose = pose2d(0, 0, 0);
    const goal = point2d(5, 0);
    const k = purePursuitCurvature(pose, goal);
    expect(k).toBeCloseTo(0, 5);
  });

  test('goal to the left — positive curvature', () => {
    const pose = pose2d(0, 0, 0);
    const goal = point2d(2, 2);
    const k = purePursuitCurvature(pose, goal);
    expect(k).toBeGreaterThan(0);
  });

  test('goal to the right — negative curvature', () => {
    const pose = pose2d(0, 0, 0);
    const goal = point2d(2, -2);
    const k = purePursuitCurvature(pose, goal);
    expect(k).toBeLessThan(0);
  });

  test('goal directly to the left — curvature = 2/L_d', () => {
    // Robot at origin facing +x, goal directly to the left at (0, 2)
    // localX = 0, localY = 2, alpha = pi/2, sin(alpha) = 1
    // L_d = 2, κ = 2 * 1 / 2 = 1
    const pose = pose2d(0, 0, 0);
    const goal = point2d(0, 2);
    const k = purePursuitCurvature(pose, goal);
    // κ = 2 * sin(pi/2) / 2 = 2/2 = 1
    // But wait — local frame: localY = -dx*sin(theta) + dy*cos(theta)
    // dx=0, dy=2, theta=0: localY = 0 + 2 = 2, localX = 0 + 0 = 0
    // alpha = atan2(2, 0) = pi/2, sin(pi/2)=1, Ld=2
    // κ = 2*1/2 = 1
    // But the sign convention: negative localY = right turn? Let me check.
    // localX = dx*cos + dy*sin = 0, localY = -dx*sin + dy*cos = 2
    // So goal is to the left in robot frame, curvature should be positive.
    // Actually let me re-check: the transform is correct for a standard frame.
    // With the convention -dx*sin + dy*cos: for theta=0, goal at (0,2):
    // localY = -0*0 + 2*1 = 2. atan2(2,0) = pi/2. sin(pi/2) = 1.
    // κ = 2/2 = 1. That matches 2/L_d.
    expect(k).toBeCloseTo(1, 5);
  });

  test('goal at same position — curvature = 0', () => {
    const pose = pose2d(3, 4, 1.0);
    const goal = point2d(3, 4);
    const k = purePursuitCurvature(pose, goal);
    expect(k).toBe(0);
  });

  test('rotated robot frame', () => {
    // Robot at (0,0) facing +y (theta = pi/2), goal at (0, 5) — straight ahead
    const pose = pose2d(0, 0, Math.PI / 2);
    const goal = point2d(0, 5);
    const k = purePursuitCurvature(pose, goal);
    expect(k).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// purePursuitControl
// ---------------------------------------------------------------------------

describe('purePursuitControl', () => {
  test('straight path — angular ≈ 0', () => {
    const pose = pose2d(0, 0, 0);
    const path = straightPath(10);
    const cmd = purePursuitControl(pose, path, 2.0, 3.0);

    expect(cmd.linear).toBe(2.0);
    expect(cmd.angular).toBeCloseTo(0, 3);
  });

  test('curved path — non-zero angular', () => {
    const pose = pose2d(0, 0, 0);
    // Path curves upward
    const path = [point2d(0, 0), point2d(2, 0), point2d(4, 2), point2d(6, 4)];
    const cmd = purePursuitControl(pose, path, 1.5, 3.0);

    expect(cmd.linear).toBe(1.5);
    expect(cmd.angular).not.toBeCloseTo(0, 1);
  });

  test('speed is preserved in output', () => {
    const pose = pose2d(0, 0, 0);
    const path = straightPath(10);
    const cmd = purePursuitControl(pose, path, 3.7, 2.0);
    expect(cmd.linear).toBe(3.7);
  });
});

// ---------------------------------------------------------------------------
// adaptiveLookahead
// ---------------------------------------------------------------------------

describe('adaptiveLookahead', () => {
  test('low speed — returns minLookahead', () => {
    const ld = adaptiveLookahead(0.1, 1.0, 5.0);
    expect(ld).toBe(1.0);
  });

  test('high speed — returns maxLookahead', () => {
    const ld = adaptiveLookahead(10, 1.0, 5.0);
    expect(ld).toBe(5.0);
  });

  test('medium speed — proportional', () => {
    const ld = adaptiveLookahead(3.0, 1.0, 5.0);
    expect(ld).toBe(3.0);
  });

  test('custom gain', () => {
    // gain=2.0, speed=1.5 => raw=3.0, clamped to [1.0, 5.0] => 3.0
    const ld = adaptiveLookahead(1.5, 1.0, 5.0, 2.0);
    expect(ld).toBe(3.0);
  });

  test('negative speed uses absolute value', () => {
    const ld = adaptiveLookahead(-3.0, 1.0, 5.0);
    expect(ld).toBe(3.0);
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('integration', () => {
  test('track a straight line from offset position — converges to path', () => {
    // Robot starts offset from a straight path along x-axis
    let pose = pose2d(0, 1, 0); // 1m to the left of path
    const path = straightPath(50);
    const dt = 0.1;
    const speed = 1.0;
    const lookahead = 2.0;

    // Simulate for a while
    for (let step = 0; step < 200; step++) {
      const cmd = purePursuitControl(pose, path, speed, lookahead);
      // Simple kinematic update
      pose = pose2d(
        pose.x + cmd.linear * Math.cos(pose.theta) * dt,
        pose.y + cmd.linear * Math.sin(pose.theta) * dt,
        pose.theta + cmd.angular * dt,
      );
    }

    // Should have converged close to y=0
    expect(Math.abs(pose.y)).toBeLessThan(0.1);
  });

  test('track a circle — maintains approximate path', () => {
    // Create a circular path
    const radius = 5;
    const path: Point2D[] = [];
    for (let i = 0; i <= 60; i++) {
      const angle = (i / 60) * 2 * Math.PI;
      path.push(point2d(radius * Math.cos(angle), radius * Math.sin(angle)));
    }

    // Start on the circle
    let pose = pose2d(radius, 0, Math.PI / 2);
    const dt = 0.05;
    const speed = 1.0;
    const lookahead = 2.0;

    // Simulate
    for (let step = 0; step < 300; step++) {
      const cmd = purePursuitControl(pose, path, speed, lookahead);
      pose = pose2d(
        pose.x + cmd.linear * Math.cos(pose.theta) * dt,
        pose.y + cmd.linear * Math.sin(pose.theta) * dt,
        pose.theta + cmd.angular * dt,
      );
    }

    // Should remain approximately on the circle
    const distFromCenter = Math.sqrt(pose.x ** 2 + pose.y ** 2);
    expect(Math.abs(distFromCenter - radius)).toBeLessThan(1.0);
  });
});

// ---------------------------------------------------------------------------
// Cross-validation
// ---------------------------------------------------------------------------

describe('cross-validation', () => {
  test('known geometry: pose at origin facing +x, goal at (2, 1)', () => {
    // α = atan2(1, 2) ≈ 0.4636 rad
    // L_d = sqrt(5) ≈ 2.236
    // κ = 2*sin(0.4636)/2.236 ≈ 2*0.4472/2.236 ≈ 0.4
    const pose = pose2d(0, 0, 0);
    const goal = point2d(2, 1);

    // In robot frame (theta=0): localX = 2, localY = 1
    // But our transform: localY = -dx*sin(0) + dy*cos(0) = dy = 1
    // So alpha = atan2(1, 2) ≈ 0.4636
    const alpha = Math.atan2(1, 2);
    const Ld = Math.sqrt(5);
    const expectedK = (2 * Math.sin(alpha)) / Ld;

    const k = purePursuitCurvature(pose, goal);

    expect(k).toBeCloseTo(expectedK, 5);
    expect(k).toBeCloseTo(0.4, 1);
  });

  test('symmetry: left and right goals produce opposite curvatures', () => {
    const pose = pose2d(0, 0, 0);
    const goalLeft = point2d(3, 2);
    const goalRight = point2d(3, -2);

    const kLeft = purePursuitCurvature(pose, goalLeft);
    const kRight = purePursuitCurvature(pose, goalRight);

    expect(kLeft).toBeCloseTo(-kRight, 5);
    expect(kLeft).toBeGreaterThan(0);
    expect(kRight).toBeLessThan(0);
  });
});

describe('findLookaheadPoint — edge cases', () => {
  test('handles zero-length segment in path', () => {
    // Robot very close to a zero-length segment so it becomes the nearest
    const path: Point2D[] = [
      point2d(0, 0),
      point2d(0, 0), // zero-length segment
      point2d(5, 0),
    ];
    // Robot at origin with very small lookahead — no circle intersection,
    // falls through to closest-point search which hits the zero-length segment
    const pose = pose2d(0, 0.01, 0);
    const result = findLookaheadPoint(pose, path, 0.001);
    // Should return a valid point (the degenerate point or nearest on other segment)
    expect(result.point).toBeDefined();
  });
});
