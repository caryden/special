/**
 * Pure pursuit path tracking controller.
 *
 * @node pure-pursuit
 * @depends-on result-types, drivetrain-types
 * @contract pure-pursuit.test.ts
 * @hint geometry: Pure pursuit computes a circular arc from the robot to a
 *       lookahead point on the path. The curvature κ = 2*sin(α)/L_d where
 *       α is the angle to the lookahead point and L_d is the lookahead distance.
 * @hint off-policy: Lookahead distance (fixed vs speed-proportional) and
 *       goal point selection (closest vs furthest intersection) are design decisions.
 * @provenance Coulter "Implementation of the Pure Pursuit Path Tracking Algorithm" 1992,
 *       PythonRobotics (cross-validation)
 */

import type { ControlOutput, Point2D } from './result-types.ts';
import { point2d } from './result-types.ts';
import type { Pose2D } from './drivetrain-types.ts';

/** Result of finding a lookahead point on the path */
export interface LookaheadResult {
  /** The goal point on the path */
  point: Point2D;
  /** The path segment index where the point was found */
  index: number;
}

/**
 * Find the closest point on a line segment to a given point.
 * Returns the closest point and the parameter t (0..1) along the segment.
 */
function closestPointOnSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D,
): { point: Point2D; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { point: point2d(a.x, a.y), t: 0 };
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    point: point2d(a.x + t * dx, a.y + t * dy),
    t,
  };
}

/**
 * Find intersections of a line segment with a circle.
 * Returns parameter values t where 0 <= t <= 1 means on the segment.
 */
function segmentCircleIntersections(
  a: Point2D,
  b: Point2D,
  center: Point2D,
  radius: number,
): number[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - center.x;
  const fy = a.y - center.y;

  const A = dx * dx + dy * dy;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - radius * radius;

  let discriminant = B * B - 4 * A * C;

  if (A === 0 || discriminant < 0) {
    return [];
  }

  const results: number[] = [];
  discriminant = Math.sqrt(discriminant);

  const t1 = (-B - discriminant) / (2 * A);
  const t2 = (-B + discriminant) / (2 * A);

  if (t1 >= 0 && t1 <= 1) results.push(t1);
  if (t2 >= 0 && t2 <= 1) results.push(t2);

  return results;
}

/**
 * Find the goal point on the path at the lookahead distance from the robot.
 *
 * Searches path segments for the furthest intersection with a circle of the
 * given radius centered at the robot. If no intersection exists, returns the
 * closest point on the path.
 */
export function findLookaheadPoint(
  pose: Pose2D,
  path: Point2D[],
  lookaheadDistance: number,
): LookaheadResult {
  const robotPos = point2d(pose.x, pose.y);

  // Search for intersections, preferring the furthest along the path
  let bestPoint: Point2D | null = null;
  let bestIndex = -1;
  let bestT = -1;

  for (let i = 0; i < path.length - 1; i++) {
    const tValues = segmentCircleIntersections(
      path[i],
      path[i + 1],
      robotPos,
      lookaheadDistance,
    );

    for (const t of tValues) {
      // Pick furthest along path: highest index, then highest t within same index
      if (i > bestIndex || (i === bestIndex && t > bestT)) {
        const dx = path[i + 1].x - path[i].x;
        const dy = path[i + 1].y - path[i].y;
        bestPoint = point2d(path[i].x + t * dx, path[i].y + t * dy);
        bestIndex = i;
        bestT = t;
      }
    }
  }

  if (bestPoint !== null) {
    return { point: bestPoint, index: bestIndex };
  }

  // No intersection found — return nearest point on path
  let nearestPoint = path[0];
  let nearestDistSq = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const { point: cp } = closestPointOnSegment(robotPos, path[i], path[i + 1]);
    const dx = cp.x - robotPos.x;
    const dy = cp.y - robotPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestPoint = cp;
      nearestIndex = i;
    }
  }

  return { point: nearestPoint, index: nearestIndex };
}

/**
 * Compute the curvature to reach the goal point using the pure pursuit formula.
 *
 * Transforms the goal to the robot's local frame, then computes:
 *   α = atan2(goal_y_local, goal_x_local)
 *   κ = 2 * sin(α) / L_d
 *
 * Positive curvature means turn left (counter-clockwise).
 */
export function purePursuitCurvature(pose: Pose2D, goalPoint: Point2D): number {
  // Transform goal to robot frame
  const dx = goalPoint.x - pose.x;
  const dy = goalPoint.y - pose.y;

  const localX = dx * Math.cos(pose.theta) + dy * Math.sin(pose.theta);
  const localY = -dx * Math.sin(pose.theta) + dy * Math.cos(pose.theta);

  const Ld = Math.sqrt(localX * localX + localY * localY);

  if (Ld === 0) {
    return 0;
  }

  const alpha = Math.atan2(localY, localX);
  return (2 * Math.sin(alpha)) / Ld;
}

/**
 * Full pure pursuit controller step.
 *
 * Finds the lookahead point, computes curvature, and returns a ControlOutput
 * with linear = speed and angular = speed * curvature.
 */
export function purePursuitControl(
  pose: Pose2D,
  path: Point2D[],
  speed: number,
  lookaheadDistance: number,
): ControlOutput {
  const lookahead = findLookaheadPoint(pose, path, lookaheadDistance);
  const curvature = purePursuitCurvature(pose, lookahead.point);

  return {
    linear: speed,
    angular: speed * curvature,
  };
}

/**
 * Compute speed-proportional lookahead distance.
 *
 * L_d = clamp(gainLookahead * speed, minLookahead, maxLookahead)
 */
export function adaptiveLookahead(
  speed: number,
  minLookahead: number,
  maxLookahead: number,
  gainLookahead: number = 1.0,
): number {
  const raw = gainLookahead * Math.abs(speed);
  return Math.max(minLookahead, Math.min(maxLookahead, raw));
}
