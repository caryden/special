/**
 * Geometric Jacobian computation for serial manipulators.
 *
 * The geometric Jacobian J maps joint velocities to end-effector spatial velocity:
 *   v = J * dq
 * where v = [v_x, v_y, v_z, omega_x, omega_y, omega_z]^T is the 6D spatial velocity.
 *
 * @node jacobian
 * @depends-on mat-ops, rotation-ops, transform-ops, dh-parameters, forward-kinematics
 * @contract jacobian.test.ts
 * @hint geometric: Uses z-axis and position vectors from intermediate frames.
 *       For revolute joints: J_i = [z_{i-1} × (p_n - p_{i-1}); z_{i-1}]
 *       For prismatic joints: J_i = [z_{i-1}; 0]
 * @provenance Corke "Robotics, Vision and Control" 3rd ed. 2023
 * @provenance Siciliano et al. "Robotics: Modelling, Planning and Control" 2009
 */

import { Matrix } from './mat-ops.ts';
import { type DHJoint } from './dh-parameters.ts';
import { forwardKinematics } from './forward-kinematics.ts';

/**
 * Compute the geometric Jacobian for a serial manipulator.
 *
 * For an n-DOF manipulator, the Jacobian is a 6×n matrix where:
 *   - Rows 0-2: linear velocity components (v_x, v_y, v_z)
 *   - Rows 3-5: angular velocity components (omega_x, omega_y, omega_z)
 *
 * For revolute joint i:
 *   J_linear_i  = z_{i-1} × (p_n - p_{i-1})
 *   J_angular_i = z_{i-1}
 *
 * For prismatic joint i:
 *   J_linear_i  = z_{i-1}
 *   J_angular_i = [0, 0, 0]
 *
 * where z_{i-1} is the z-axis of frame i-1 and p_{i-1} is the origin of frame i-1.
 *
 * @param joints  Array of n DHJoint definitions
 * @param jointValues  Array of n joint values
 * @returns 6×n Jacobian matrix
 */
export function geometricJacobian(joints: DHJoint[], jointValues: number[]): Matrix {
  const n = joints.length;
  const { endEffector, frames } = forwardKinematics(joints, jointValues);

  // End-effector position
  const pn: [number, number, number] = [
    endEffector.get(0, 3),
    endEffector.get(1, 3),
    endEffector.get(2, 3),
  ];

  const data = new Array(6 * n).fill(0);

  for (let i = 0; i < n; i++) {
    const T = frames[i]; // frame i (0-indexed: frame[0]=base, frame[i]=frame before joint i+1)

    // z-axis of frame i (third column of rotation part)
    const z: [number, number, number] = [T.get(0, 2), T.get(1, 2), T.get(2, 2)];

    // origin of frame i
    const p: [number, number, number] = [T.get(0, 3), T.get(1, 3), T.get(2, 3)];

    if (joints[i].jointType === 'revolute') {
      // Linear: z × (p_n - p)
      const dp: [number, number, number] = [pn[0] - p[0], pn[1] - p[1], pn[2] - p[2]];
      const cross = crossProduct(z, dp);
      data[0 * n + i] = cross[0]; // v_x
      data[1 * n + i] = cross[1]; // v_y
      data[2 * n + i] = cross[2]; // v_z
      // Angular: z
      data[3 * n + i] = z[0]; // omega_x
      data[4 * n + i] = z[1]; // omega_y
      data[5 * n + i] = z[2]; // omega_z
    } else {
      // Prismatic
      // Linear: z
      data[0 * n + i] = z[0];
      data[1 * n + i] = z[1];
      data[2 * n + i] = z[2];
      // Angular: 0 (already filled)
    }
  }

  return new Matrix(6, n, data);
}

/**
 * Compute only the linear (translational) part of the Jacobian (3×n).
 *
 * @param joints  Array of n DHJoint definitions
 * @param jointValues  Array of n joint values
 * @returns 3×n linear Jacobian matrix
 */
export function linearJacobian(joints: DHJoint[], jointValues: number[]): Matrix {
  const J = geometricJacobian(joints, jointValues);
  const n = J.cols;
  const data = new Array(3 * n);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < n; c++) {
      data[r * n + c] = J.get(r, c);
    }
  }
  return new Matrix(3, n, data);
}

/**
 * Compute only the angular part of the Jacobian (3×n).
 *
 * @param joints  Array of n DHJoint definitions
 * @param jointValues  Array of n joint values
 * @returns 3×n angular Jacobian matrix
 */
export function angularJacobian(joints: DHJoint[], jointValues: number[]): Matrix {
  const J = geometricJacobian(joints, jointValues);
  const n = J.cols;
  const data = new Array(3 * n);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < n; c++) {
      data[r * n + c] = J.get(r + 3, c);
    }
  }
  return new Matrix(3, n, data);
}

/** Cross product of two 3-vectors. */
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
