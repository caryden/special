/**
 * Jacobian-based inverse kinematics using damped least squares (DLS).
 *
 * The damped least-squares (Levenberg-Marquardt) IK computes:
 *   dq = J^T * (J * J^T + lambda^2 * I)^{-1} * e
 *
 * This avoids singularity issues in the plain pseudo-inverse.
 *
 * @node jacobian-ik
 * @depends-on mat-ops, rotation-ops, transform-ops, forward-kinematics, jacobian, result-types
 * @contract jacobian-ik.test.ts
 * @hint damping: lambda controls trade-off between accuracy and stability near singularities
 * @hint position-only: By default solves position-only IK (3D). Can solve full 6D if desired.
 * @provenance Corke "Robotics, Vision and Control" 3rd ed. 2023, OROCOS KDL v1.5.3
 */

import {
  Matrix,
  matMultiply,
  matTranspose,
  matAdd,
  matScale,
  matIdentity,
  matInverse,
} from './mat-ops.ts';
import { type DHJoint } from './dh-parameters.ts';
import { fkPosition } from './forward-kinematics.ts';
import { linearJacobian } from './jacobian.ts';
import type { IKResult } from './result-types.ts';

/** Configuration for the Jacobian IK solver. */
export interface JacobianIKConfig {
  /** Maximum number of iterations */
  maxIterations: number;
  /** Position error tolerance (meters) for convergence */
  tolerance: number;
  /** Damping factor (lambda). Higher = more stable near singularities but slower. */
  damping: number;
  /** Step size scaling factor (0-1]. Lower = more conservative steps. */
  stepSize: number;
}

/** Default Jacobian IK configuration. */
export const DEFAULT_JACOBIAN_IK_CONFIG: JacobianIKConfig = {
  maxIterations: 100,
  tolerance: 1e-4,
  damping: 0.01,
  stepSize: 1.0,
};

/**
 * Solve position-only IK using damped least squares.
 *
 * Given a target position [x, y, z] and initial joint angles, iteratively
 * adjusts joint angles to minimize position error.
 *
 * @param joints  DH chain definition
 * @param target  Target end-effector position [x, y, z]
 * @param initialAngles  Starting joint angles (radians)
 * @param config  Solver configuration
 * @returns IKResult with joint angles, convergence status, and error
 */
export function jacobianIK(
  joints: DHJoint[],
  target: [number, number, number],
  initialAngles: number[],
  config: JacobianIKConfig = DEFAULT_JACOBIAN_IK_CONFIG,
): IKResult {
  const n = joints.length;
  if (initialAngles.length !== n) {
    throw new Error(
      `Initial angles length (${initialAngles.length}) must match joint count (${n})`,
    );
  }

  const { maxIterations, tolerance, damping, stepSize } = config;
  let q = initialAngles.slice();
  let posError = Infinity;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    // Current end-effector position
    const pos = fkPosition(joints, q);

    // Position error vector
    const ex = target[0] - pos[0];
    const ey = target[1] - pos[1];
    const ez = target[2] - pos[2];
    posError = Math.sqrt(ex * ex + ey * ey + ez * ez);

    if (posError < tolerance) {
      return {
        jointAngles: q,
        converged: true,
        positionError: posError,
        iterations: iter,
      };
    }

    // Error as column vector (3×1)
    const e = new Matrix(3, 1, [ex, ey, ez]);

    // Linear Jacobian (3×n)
    const J = linearJacobian(joints, q);
    const Jt = matTranspose(J);

    // Damped least squares: dq = J^T * (J * J^T + lambda^2 * I)^{-1} * e
    const JJt = matMultiply(J, Jt); // 3×3
    const damped = matAdd(JJt, matScale(matIdentity(3), damping * damping));
    const dampedInv = matInverse(damped);
    const dq = matMultiply(Jt, matMultiply(dampedInv, e)); // n×1

    // Update joint angles
    for (let i = 0; i < n; i++) {
      q[i] += stepSize * dq.get(i, 0);
    }
  }

  return {
    jointAngles: q,
    converged: false,
    positionError: posError,
    iterations: iter,
  };
}

/**
 * Solve IK with joint limits.
 *
 * Same as jacobianIK but clamps joint angles to [lower, upper] limits after each step.
 *
 * @param joints  DH chain definition
 * @param target  Target position [x, y, z]
 * @param initialAngles  Starting joint angles
 * @param jointLimits  Array of [lower, upper] limits per joint (radians)
 * @param config  Solver configuration
 * @returns IKResult
 */
export function jacobianIKWithLimits(
  joints: DHJoint[],
  target: [number, number, number],
  initialAngles: number[],
  jointLimits: [number, number][],
  config: JacobianIKConfig = DEFAULT_JACOBIAN_IK_CONFIG,
): IKResult {
  const n = joints.length;
  if (jointLimits.length !== n) {
    throw new Error(
      `Joint limits length (${jointLimits.length}) must match joint count (${n})`,
    );
  }

  const { maxIterations, tolerance, damping, stepSize } = config;
  let q = initialAngles.slice();
  // Clamp initial angles
  for (let i = 0; i < n; i++) {
    q[i] = Math.max(jointLimits[i][0], Math.min(jointLimits[i][1], q[i]));
  }

  let posError = Infinity;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    const pos = fkPosition(joints, q);
    const ex = target[0] - pos[0];
    const ey = target[1] - pos[1];
    const ez = target[2] - pos[2];
    posError = Math.sqrt(ex * ex + ey * ey + ez * ez);

    if (posError < tolerance) {
      return {
        jointAngles: q,
        converged: true,
        positionError: posError,
        iterations: iter,
      };
    }

    const e = new Matrix(3, 1, [ex, ey, ez]);
    const J = linearJacobian(joints, q);
    const Jt = matTranspose(J);
    const JJt = matMultiply(J, Jt);
    const damped = matAdd(JJt, matScale(matIdentity(3), damping * damping));
    const dampedInv = matInverse(damped);
    const dq = matMultiply(Jt, matMultiply(dampedInv, e));

    for (let i = 0; i < n; i++) {
      q[i] += stepSize * dq.get(i, 0);
      q[i] = Math.max(jointLimits[i][0], Math.min(jointLimits[i][1], q[i]));
    }
  }

  return {
    jointAngles: q,
    converged: false,
    positionError: posError,
    iterations: iter,
  };
}
