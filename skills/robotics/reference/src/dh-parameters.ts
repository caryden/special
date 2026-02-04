/**
 * Standard Denavit-Hartenberg (DH) parameters and transformation matrices.
 *
 * Uses standard (not modified/Craig) DH convention:
 *   T = Rz(theta) * Tz(d) * Tx(a) * Rx(alpha)
 *
 * @node dh-parameters
 * @depends-on mat-ops
 * @contract dh-parameters.test.ts
 * @hint convention: Standard DH (Denavit & Hartenberg 1955), NOT modified DH (Craig).
 *       The difference is the order of operations and which frame the parameters are defined in.
 * @hint off-policy: Standard vs modified DH is the key design decision. We use standard
 *       because it's more common in textbooks and matches Robotics Toolbox for Python.
 * @provenance Denavit & Hartenberg 1955, Corke "Robotics, Vision and Control" 3rd ed. 2023
 */

import { Matrix, matMultiply } from './mat-ops.ts';

/** Single DH parameter set for one joint */
export interface DHParams {
  /** Joint angle theta (radians) — variable for revolute joints */
  theta: number;
  /** Link offset d (meters) — variable for prismatic joints */
  d: number;
  /** Link length a (meters) */
  a: number;
  /** Link twist alpha (radians) */
  alpha: number;
}

/** Joint type */
export type JointType = 'revolute' | 'prismatic';

/** Complete joint description */
export interface DHJoint {
  params: DHParams;
  jointType: JointType;
}

/** Kinematic chain */
export interface DHChain {
  joints: DHJoint[];
  numJoints: number;
}

/**
 * Compute the 4×4 homogeneous transformation matrix from DH parameters.
 *
 * Standard DH convention:
 *   T = Rz(theta) * Tz(d) * Tx(a) * Rx(alpha)
 *
 * Expanded:
 *   [ cos(θ)  -sin(θ)cos(α)   sin(θ)sin(α)  a·cos(θ) ]
 *   [ sin(θ)   cos(θ)cos(α)  -cos(θ)sin(α)  a·sin(θ) ]
 *   [   0        sin(α)         cos(α)          d      ]
 *   [   0          0              0             1      ]
 */
export function dhTransform(params: DHParams): Matrix {
  const { theta, d, a, alpha } = params;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return new Matrix(4, 4, [
    ct, -st * ca,  st * sa, a * ct,
    st,  ct * ca, -ct * sa, a * st,
    0,   sa,       ca,      d,
    0,   0,        0,       1,
  ]);
}

/**
 * Compute the end-effector transform for a chain of joints.
 *
 * For each joint, the joint value is substituted into theta (revolute)
 * or d (prismatic). All transforms are multiplied in order:
 *   T_0^n = T_0^1 * T_1^2 * ... * T_{n-1}^n
 */
export function dhChainTransform(joints: DHJoint[], jointValues: number[]): Matrix {
  if (joints.length !== jointValues.length) {
    throw new Error(
      `Number of joints (${joints.length}) does not match number of joint values (${jointValues.length})`,
    );
  }

  let result = Matrix.identity(4);

  for (let i = 0; i < joints.length; i++) {
    const joint = joints[i];
    const q = jointValues[i];
    const params: DHParams = {
      theta: joint.jointType === 'revolute' ? joint.params.theta + q : joint.params.theta,
      d: joint.jointType === 'prismatic' ? joint.params.d + q : joint.params.d,
      a: joint.params.a,
      alpha: joint.params.alpha,
    };
    result = matMultiply(result, dhTransform(params));
  }

  return result;
}

/**
 * Factory function to create a DHJoint. Defaults to 'revolute'.
 */
export function dhCreateJoint(params: DHParams, jointType: JointType = 'revolute'): DHJoint {
  return { params, jointType };
}

/**
 * Create a kinematic chain from an array of DHJoint.
 */
export function dhCreateChain(joints: DHJoint[]): DHChain {
  return { joints, numJoints: joints.length };
}

/**
 * Standard 2-link planar arm.
 *
 * Joint 1: theta=0, d=0, a=l1, alpha=0 (revolute)
 * Joint 2: theta=0, d=0, a=l2, alpha=0 (revolute)
 */
export function twoLinkPlanar(l1: number, l2: number): DHJoint[] {
  return [
    dhCreateJoint({ theta: 0, d: 0, a: l1, alpha: 0 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0, a: l2, alpha: 0 }, 'revolute'),
  ];
}

/**
 * Standard SCARA robot.
 *
 * Joint 1: theta=0, d=0, a=l1, alpha=0 (revolute)
 * Joint 2: theta=0, d=0, a=l2, alpha=π (revolute)
 * Joint 3: theta=0, d=0, a=0, alpha=0 (prismatic)
 * Joint 4: theta=0, d=0, a=0, alpha=0 (revolute)
 */
export function scara(l1: number, l2: number): DHJoint[] {
  return [
    dhCreateJoint({ theta: 0, d: 0, a: l1, alpha: 0 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0, a: l2, alpha: Math.PI }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0, a: 0, alpha: 0 }, 'prismatic'),
    dhCreateJoint({ theta: 0, d: 0, a: 0, alpha: 0 }, 'revolute'),
  ];
}
