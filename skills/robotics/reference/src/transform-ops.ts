/**
 * SE(3) rigid body transformations: 4×4 homogeneous transform matrices.
 *
 * @node transform-ops
 * @depends-on mat-ops, rotation-ops
 * @contract transform-ops.test.ts
 * @hint representation: 4×4 homogeneous matrix [R t; 0 1] with R∈SO(3) and t∈R^3.
 * @hint off-policy: Homogeneous matrix vs dual quaternion representation.
 *       We use homogeneous matrices for compatibility with DH parameters.
 * @provenance Corke "Robotics, Vision and Control" 3rd ed. 2023
 */

import { Matrix, matMultiply } from './mat-ops.ts';
import {
  rotationMatrixFromEulerZYX,
  eulerZYXFromRotationMatrix,
  rotateVector,
} from './rotation-ops.ts';

/**
 * Create a 4×4 homogeneous transform from a 3×3 rotation matrix and translation.
 * T = [R t; 0 1]
 */
export function transformFromRotationAndTranslation(
  R: Matrix,
  translation: [number, number, number],
): Matrix {
  const [tx, ty, tz] = translation;
  const data = [
    R.get(0, 0), R.get(0, 1), R.get(0, 2), tx,
    R.get(1, 0), R.get(1, 1), R.get(1, 2), ty,
    R.get(2, 0), R.get(2, 1), R.get(2, 2), tz,
    0,           0,           0,           1,
  ];
  return new Matrix(4, 4, data);
}

/** Return the 4×4 identity transform. */
export function identityTransform(): Matrix {
  return Matrix.identity(4);
}

/** Extract the 3×3 rotation matrix from a 4×4 homogeneous transform. */
export function transformGetRotation(T: Matrix): Matrix {
  const data = [
    T.get(0, 0), T.get(0, 1), T.get(0, 2),
    T.get(1, 0), T.get(1, 1), T.get(1, 2),
    T.get(2, 0), T.get(2, 1), T.get(2, 2),
  ];
  return new Matrix(3, 3, data);
}

/** Extract [x, y, z] translation from a 4×4 homogeneous transform. */
export function transformGetTranslation(T: Matrix): [number, number, number] {
  return [T.get(0, 3), T.get(1, 3), T.get(2, 3)];
}

/** Compose two transforms: T1 * T2 (4×4 matrix multiply). */
export function transformCompose(T1: Matrix, T2: Matrix): Matrix {
  return matMultiply(T1, T2);
}

/**
 * Invert a homogeneous transform.
 * T^{-1} = [R^T  -R^T*t; 0  1]
 */
export function transformInverse(T: Matrix): Matrix {
  const R = transformGetRotation(T);
  const t = transformGetTranslation(T);

  // R^T
  const rt00 = R.get(0, 0), rt01 = R.get(1, 0), rt02 = R.get(2, 0);
  const rt10 = R.get(0, 1), rt11 = R.get(1, 1), rt12 = R.get(2, 1);
  const rt20 = R.get(0, 2), rt21 = R.get(1, 2), rt22 = R.get(2, 2);

  // -R^T * t
  const ntx = -(rt00 * t[0] + rt01 * t[1] + rt02 * t[2]);
  const nty = -(rt10 * t[0] + rt11 * t[1] + rt12 * t[2]);
  const ntz = -(rt20 * t[0] + rt21 * t[1] + rt22 * t[2]);

  const data = [
    rt00, rt01, rt02, ntx,
    rt10, rt11, rt12, nty,
    rt20, rt21, rt22, ntz,
    0,    0,    0,    1,
  ];
  return new Matrix(4, 4, data);
}

/** Apply transform to a 3D point: p' = R*p + t. Returns [x, y, z]. */
export function transformPoint(T: Matrix, point: [number, number, number]): [number, number, number] {
  const R = transformGetRotation(T);
  const t = transformGetTranslation(T);
  const rotated = rotateVector(R, point);
  return [
    rotated[0] + t[0],
    rotated[1] + t[1],
    rotated[2] + t[2],
  ];
}

/** Convenience: create transform from Euler ZYX angles and translation. */
export function transformFromEulerXYZ(
  roll: number,
  pitch: number,
  yaw: number,
  x: number,
  y: number,
  z: number,
): Matrix {
  const R = rotationMatrixFromEulerZYX(roll, pitch, yaw);
  return transformFromRotationAndTranslation(R, [x, y, z]);
}

/**
 * Extract roll, pitch, yaw and x, y, z from a transform.
 * Returns { roll, pitch, yaw, x, y, z }.
 */
export function transformToEulerXYZ(T: Matrix): {
  roll: number;
  pitch: number;
  yaw: number;
  x: number;
  y: number;
  z: number;
} {
  const R = transformGetRotation(T);
  const t = transformGetTranslation(T);
  const { roll, pitch, yaw } = eulerZYXFromRotationMatrix(R);
  return { roll, pitch, yaw, x: t[0], y: t[1], z: t[2] };
}
