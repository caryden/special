/**
 * Forward kinematics: compute end-effector pose and intermediate frame
 * transforms for a serial manipulator defined by DH parameters.
 *
 * @node forward-kinematics
 * @depends-on mat-ops, rotation-ops, transform-ops, dh-parameters
 * @contract forward-kinematics.test.ts
 * @hint chain: Multiplies DH transforms sequentially T_0^n = T_0^1 * ... * T_{n-1}^n
 * @hint frames: Returns all intermediate transforms T_0^i for Jacobian computation
 * @provenance Corke "Robotics, Vision and Control" 3rd ed. 2023, OROCOS KDL v1.5.3
 */

import { Matrix, matMultiply } from './mat-ops.ts';
import { type DHJoint, dhTransform, type DHParams } from './dh-parameters.ts';
import {
  transformGetRotation,
  transformGetTranslation,
} from './transform-ops.ts';

/** Result of forward kinematics computation. */
export interface FKResult {
  /** End-effector transform T_0^n (4×4 homogeneous matrix) */
  endEffector: Matrix;
  /** All intermediate frame transforms T_0^i for i=0..n (n+1 total).
   *  frames[0] is the identity (base frame), frames[n] is the end-effector. */
  frames: Matrix[];
}

/**
 * Compute forward kinematics for a serial chain.
 *
 * Given a chain of n DH joints and n joint values, computes:
 * - The end-effector transform T_0^n
 * - All intermediate frame transforms T_0^i (i = 0..n)
 *
 * @param joints  Array of n DHJoint definitions
 * @param jointValues  Array of n joint values (radians for revolute, meters for prismatic)
 * @returns FKResult with end-effector transform and all intermediate frames
 */
export function forwardKinematics(joints: DHJoint[], jointValues: number[]): FKResult {
  if (joints.length !== jointValues.length) {
    throw new Error(
      `Number of joints (${joints.length}) does not match number of joint values (${jointValues.length})`,
    );
  }

  const n = joints.length;
  const frames: Matrix[] = new Array(n + 1);

  // Frame 0 is the base frame (identity)
  frames[0] = Matrix.identity(4);

  for (let i = 0; i < n; i++) {
    const joint = joints[i];
    const q = jointValues[i];
    const params: DHParams = {
      theta: joint.jointType === 'revolute' ? joint.params.theta + q : joint.params.theta,
      d: joint.jointType === 'prismatic' ? joint.params.d + q : joint.params.d,
      a: joint.params.a,
      alpha: joint.params.alpha,
    };
    frames[i + 1] = matMultiply(frames[i], dhTransform(params));
  }

  return {
    endEffector: frames[n],
    frames,
  };
}

/**
 * Get end-effector position [x, y, z] from forward kinematics.
 *
 * Convenience function that extracts the translation component.
 *
 * @param joints  Array of DHJoint definitions
 * @param jointValues  Array of joint values
 * @returns [x, y, z] position of the end-effector
 */
export function fkPosition(joints: DHJoint[], jointValues: number[]): [number, number, number] {
  const { endEffector } = forwardKinematics(joints, jointValues);
  return transformGetTranslation(endEffector);
}

/**
 * Get end-effector rotation matrix (3×3) from forward kinematics.
 *
 * @param joints  Array of DHJoint definitions
 * @param jointValues  Array of joint values
 * @returns 3×3 rotation matrix of the end-effector frame
 */
export function fkRotation(joints: DHJoint[], jointValues: number[]): Matrix {
  const { endEffector } = forwardKinematics(joints, jointValues);
  return transformGetRotation(endEffector);
}
