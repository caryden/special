/**
 * Rotation representations and conversions for 3D robotics.
 *
 * Supports rotation matrices (3×3), quaternions (Hamilton w,x,y,z scalar-first),
 * Euler angles (ZYX roll-pitch-yaw convention), and axis-angle.
 * All operations are pure — they return new values and never mutate inputs.
 *
 * @node rotation-ops
 * @depends-on mat-ops
 * @contract rotation-ops.test.ts
 * @hint quaternion: Hamilton convention (w,x,y,z), scalar-first.
 *       Matches Drake, Corke, MATLAB, Eigen::Quaterniond.
 *       ROS 2 uses (x,y,z,w) — consumers must reorder on input/output.
 * @hint euler: ZYX convention (yaw-pitch-roll), radians.
 *       R = Rz(yaw) * Ry(pitch) * Rx(roll).
 * @hint provenance: Rotation formulas from Diebel "Representing Attitude" (2006),
 *       Shuster "Survey of Attitude Representations" (1993).
 * @provenance Rotations.jl v1.7.1 (cross-validation target for conversions)
 */

import { Matrix, matMultiply, matTranspose } from './mat-ops.ts';

/** Quaternion in Hamilton convention: [w, x, y, z] where w is scalar part */
export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

/** Create a Quaternion value. */
export function quaternion(w: number, x: number, y: number, z: number): Quaternion {
  return { w, x, y, z };
}

/** Identity quaternion (1, 0, 0, 0). */
export function identityQuaternion(): Quaternion {
  return { w: 1, x: 0, y: 0, z: 0 };
}

/** 3×3 identity rotation matrix. */
export function identityRotation(): Matrix {
  return Matrix.identity(3);
}

/**
 * Rotation matrix from axis-angle via Rodrigues' formula.
 * R = I + sin(θ) * K + (1 - cos(θ)) * K²
 * where K is the skew-symmetric matrix of the unit axis.
 */
export function rotationMatrixFromAxisAngle(axis: [number, number, number], angle: number): Matrix {
  const norm = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
  const ux = axis[0] / norm;
  const uy = axis[1] / norm;
  const uz = axis[2] / norm;

  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  // Rodrigues' rotation formula expanded
  const data = [
    t * ux * ux + c,       t * ux * uy - s * uz,  t * ux * uz + s * uy,
    t * ux * uy + s * uz,  t * uy * uy + c,       t * uy * uz - s * ux,
    t * ux * uz - s * uy,  t * uy * uz + s * ux,  t * uz * uz + c,
  ];

  return new Matrix(3, 3, data);
}

/**
 * Rotation matrix from quaternion (Hamilton convention).
 * R = | 1-2(y²+z²)   2(xy-wz)    2(xz+wy)  |
 *     | 2(xy+wz)    1-2(x²+z²)   2(yz-wx)  |
 *     | 2(xz-wy)    2(yz+wx)   1-2(x²+y²)  |
 */
export function rotationMatrixFromQuaternion(q: Quaternion): Matrix {
  const { w, x, y, z } = q;
  const data = [
    1 - 2 * (y * y + z * z),  2 * (x * y - w * z),      2 * (x * z + w * y),
    2 * (x * y + w * z),      1 - 2 * (x * x + z * z),  2 * (y * z - w * x),
    2 * (x * z - w * y),      2 * (y * z + w * x),      1 - 2 * (x * x + y * y),
  ];
  return new Matrix(3, 3, data);
}

/**
 * Quaternion from rotation matrix using Shepperd's method.
 * Chooses the largest diagonal element to avoid division by near-zero.
 */
export function quaternionFromRotationMatrix(R: Matrix): Quaternion {
  const r00 = R.get(0, 0);
  const r01 = R.get(0, 1);
  const r02 = R.get(0, 2);
  const r10 = R.get(1, 0);
  const r11 = R.get(1, 1);
  const r12 = R.get(1, 2);
  const r20 = R.get(2, 0);
  const r21 = R.get(2, 1);
  const r22 = R.get(2, 2);

  const trace = r00 + r11 + r22;

  let w: number, x: number, y: number, z: number;

  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    w = 0.25 * s;
    x = (r21 - r12) / s;
    y = (r02 - r20) / s;
    z = (r10 - r01) / s;
  } else if (r00 > r11 && r00 > r22) {
    const s = 2 * Math.sqrt(1 + r00 - r11 - r22);
    w = (r21 - r12) / s;
    x = 0.25 * s;
    y = (r01 + r10) / s;
    z = (r02 + r20) / s;
  } else if (r11 > r22) {
    const s = 2 * Math.sqrt(1 + r11 - r00 - r22);
    w = (r02 - r20) / s;
    x = (r01 + r10) / s;
    y = 0.25 * s;
    z = (r12 + r21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + r22 - r00 - r11);
    w = (r10 - r01) / s;
    x = (r02 + r20) / s;
    y = (r12 + r21) / s;
    z = 0.25 * s;
  }

  // Ensure w >= 0 for canonical form
  if (w < 0) {
    return { w: -w, x: -x, y: -y, z: -z };
  }
  return { w, x, y, z };
}

/**
 * Rotation matrix from Euler ZYX angles (yaw-pitch-roll).
 * R = Rz(yaw) * Ry(pitch) * Rx(roll)
 */
export function rotationMatrixFromEulerZYX(roll: number, pitch: number, yaw: number): Matrix {
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);

  const data = [
    cy * cp,                      cy * sp * sr - sy * cr,       cy * sp * cr + sy * sr,
    sy * cp,                      sy * sp * sr + cy * cr,       sy * sp * cr - cy * sr,
    -sp,                          cp * sr,                      cp * cr,
  ];

  return new Matrix(3, 3, data);
}

/**
 * Extract Euler ZYX angles from rotation matrix.
 * pitch = -asin(R[0][2])
 * roll = atan2(R[1][2], R[2][2])
 * yaw = atan2(R[0][1], R[0][0])
 */
export function eulerZYXFromRotationMatrix(R: Matrix): { roll: number; pitch: number; yaw: number } {
  const r20 = R.get(2, 0); // = -sin(pitch)

  // Gimbal lock check: |sin(pitch)| ≈ 1
  if (Math.abs(r20) >= 1 - 1e-10) {
    // Gimbal lock: pitch = ±π/2
    const pitch = r20 < 0 ? Math.PI / 2 : -Math.PI / 2;
    // Yaw is arbitrary; set yaw = 0 and solve for roll
    const yaw = 0;
    const roll = Math.atan2(-R.get(0, 1), R.get(0, 2));
    return { roll, pitch, yaw };
  }

  const pitch = Math.asin(-r20);
  const cp = Math.cos(pitch);
  const roll = Math.atan2(R.get(2, 1) / cp, R.get(2, 2) / cp);
  const yaw = Math.atan2(R.get(1, 0) / cp, R.get(0, 0) / cp);

  return { roll, pitch, yaw };
}

/** Quaternion from Euler ZYX angles. */
export function quaternionFromEulerZYX(roll: number, pitch: number, yaw: number): Quaternion {
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);

  return {
    w: cy * cp * cr + sy * sp * sr,
    x: cy * cp * sr - sy * sp * cr,
    y: cy * sp * cr + sy * cp * sr,
    z: sy * cp * cr - cy * sp * sr,
  };
}

/** Euler ZYX angles from quaternion. */
export function eulerZYXFromQuaternion(q: Quaternion): { roll: number; pitch: number; yaw: number } {
  const R = rotationMatrixFromQuaternion(q);
  return eulerZYXFromRotationMatrix(R);
}

/** Quaternion from axis-angle representation. */
export function quaternionFromAxisAngle(axis: [number, number, number], angle: number): Quaternion {
  const norm = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
  const ux = axis[0] / norm;
  const uy = axis[1] / norm;
  const uz = axis[2] / norm;

  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);

  return {
    w: Math.cos(halfAngle),
    x: ux * s,
    y: uy * s,
    z: uz * s,
  };
}

/** Compose two rotations: R1 * R2 (3×3 matrix multiply). */
export function rotationCompose(R1: Matrix, R2: Matrix): Matrix {
  return matMultiply(R1, R2);
}

/** Rotation inverse: R^T (transpose, since R is orthogonal). */
export function rotationInverse(R: Matrix): Matrix {
  return matTranspose(R);
}

/** Apply rotation matrix to a 3D vector: R * v. */
export function rotateVector(R: Matrix, v: [number, number, number]): [number, number, number] {
  return [
    R.get(0, 0) * v[0] + R.get(0, 1) * v[1] + R.get(0, 2) * v[2],
    R.get(1, 0) * v[0] + R.get(1, 1) * v[1] + R.get(1, 2) * v[2],
    R.get(2, 0) * v[0] + R.get(2, 1) * v[1] + R.get(2, 2) * v[2],
  ];
}

/** Hamilton product of two quaternions. */
export function quaternionMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

/** Quaternion conjugate: (w, -x, -y, -z). */
export function quaternionConjugate(q: Quaternion): Quaternion {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

/** Euclidean norm of a quaternion. */
export function quaternionNorm(q: Quaternion): number {
  return Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
}

/** Normalize a quaternion to unit length. */
export function quaternionNormalize(q: Quaternion): Quaternion {
  const n = quaternionNorm(q);
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}
