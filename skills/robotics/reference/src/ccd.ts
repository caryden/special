/**
 * Cyclic Coordinate Descent (CCD) inverse kinematics.
 *
 * An iterative IK solver that optimizes one joint at a time, cycling through
 * all joints repeatedly until convergence. Each joint rotation minimizes the
 * angle between the joint-to-end-effector vector and the joint-to-target vector.
 *
 * @node ccd
 * @depends-on rotation-ops, transform-ops, forward-kinematics, result-types
 * @contract ccd.test.ts
 * @hint single-joint: Each iteration optimizes one joint independently
 * @hint off-policy: CCD vs Jacobian IK vs FABRIK — CCD is simple and robust
 *       for serial chains but converges slowly for near-singular configurations.
 * @provenance Wang & Chen "A Combined Optimization Method for Solving the
 *       Inverse Kinematics Problem of Mechanical Manipulators" 1991
 */

import { type DHJoint } from './dh-parameters.ts';
import { fkPosition, forwardKinematics } from './forward-kinematics.ts';
import type { IKResult } from './result-types.ts';

/** Configuration for the CCD solver. */
export interface CCDConfig {
  /** Maximum number of full cycles through all joints */
  maxIterations: number;
  /** Position error tolerance (meters) for convergence */
  tolerance: number;
}

/** Default CCD configuration. */
export const DEFAULT_CCD_CONFIG: CCDConfig = {
  maxIterations: 100,
  tolerance: 1e-4,
};

/**
 * Solve position-only IK using Cyclic Coordinate Descent.
 *
 * For each revolute joint (iterating from end-effector to base):
 * 1. Compute vector from joint origin to end-effector (in world frame)
 * 2. Compute vector from joint origin to target (in world frame)
 * 3. Compute the rotation angle that aligns these vectors about the joint axis
 * 4. Apply the rotation to the joint angle
 *
 * Prismatic joints are skipped (CCD only works with revolute joints).
 *
 * @param joints  DH chain definition
 * @param target  Target end-effector position [x, y, z]
 * @param initialAngles  Starting joint angles (radians)
 * @param config  Solver configuration
 * @returns IKResult with joint angles, convergence status, and error
 */
export function ccdSolve(
  joints: DHJoint[],
  target: [number, number, number],
  initialAngles: number[],
  config: CCDConfig = DEFAULT_CCD_CONFIG,
): IKResult {
  const n = joints.length;
  if (initialAngles.length !== n) {
    throw new Error(
      `Initial angles length (${initialAngles.length}) must match joint count (${n})`,
    );
  }

  const { maxIterations, tolerance } = config;
  const q = initialAngles.slice();
  let posError = Infinity;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    // Check convergence
    const eePos = fkPosition(joints, q);
    posError = Math.sqrt(
      (target[0] - eePos[0]) ** 2 +
      (target[1] - eePos[1]) ** 2 +
      (target[2] - eePos[2]) ** 2,
    );

    if (posError < tolerance) {
      return {
        jointAngles: q,
        converged: true,
        positionError: posError,
        iterations: iter,
      };
    }

    // Cycle through joints from end-effector to base
    for (let i = n - 1; i >= 0; i--) {
      if (joints[i].jointType !== 'revolute') continue;

      // Get current frames
      const { endEffector, frames } = forwardKinematics(joints, q);

      // Joint origin (frame i)
      const T = frames[i];
      const jointPos: [number, number, number] = [T.get(0, 3), T.get(1, 3), T.get(2, 3)];

      // Joint z-axis (rotation axis in world frame)
      const zAxis: [number, number, number] = [T.get(0, 2), T.get(1, 2), T.get(2, 2)];

      // Vector from joint to end-effector
      const toEE: [number, number, number] = [
        endEffector.get(0, 3) - jointPos[0],
        endEffector.get(1, 3) - jointPos[1],
        endEffector.get(2, 3) - jointPos[2],
      ];

      // Vector from joint to target
      const toTarget: [number, number, number] = [
        target[0] - jointPos[0],
        target[1] - jointPos[1],
        target[2] - jointPos[2],
      ];

      // Project both vectors onto the plane perpendicular to the joint axis
      const eeProj = projectOntoPlane(toEE, zAxis);
      const tgtProj = projectOntoPlane(toTarget, zAxis);

      const eeLen = vecLength(eeProj);
      const tgtLen = vecLength(tgtProj);

      if (eeLen < 1e-10 || tgtLen < 1e-10) continue;

      // Angle between projections
      const dot = eeProj[0] * tgtProj[0] + eeProj[1] * tgtProj[1] + eeProj[2] * tgtProj[2];
      const cosAngle = Math.max(-1, Math.min(1, dot / (eeLen * tgtLen)));
      let angle = Math.acos(cosAngle);

      // Determine sign via cross product dotted with z-axis
      const cross = crossProduct(eeProj, tgtProj);
      const sign = cross[0] * zAxis[0] + cross[1] * zAxis[1] + cross[2] * zAxis[2];
      if (sign < 0) angle = -angle;

      q[i] += angle;
    }
  }

  // Final error
  const eePos = fkPosition(joints, q);
  posError = Math.sqrt(
    (target[0] - eePos[0]) ** 2 +
    (target[1] - eePos[1]) ** 2 +
    (target[2] - eePos[2]) ** 2,
  );

  return {
    jointAngles: q,
    converged: posError < tolerance,
    positionError: posError,
    iterations: iter,
  };
}

/** Project vector v onto the plane perpendicular to unit-ish normal n. */
function projectOntoPlane(
  v: [number, number, number],
  n: [number, number, number],
): [number, number, number] {
  const dot = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
  return [
    v[0] - dot * n[0],
    v[1] - dot * n[1],
    v[2] - dot * n[2],
  ];
}

/** Cross product. */
function crossProduct(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Vector length. */
function vecLength(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
