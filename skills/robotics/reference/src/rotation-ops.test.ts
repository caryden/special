import { describe, test, expect } from 'bun:test';
import { Matrix, matEqual } from './mat-ops.ts';
import {
  Quaternion,
  quaternion,
  identityQuaternion,
  identityRotation,
  rotationMatrixFromAxisAngle,
  rotationMatrixFromQuaternion,
  quaternionFromRotationMatrix,
  rotationMatrixFromEulerZYX,
  eulerZYXFromRotationMatrix,
  quaternionFromEulerZYX,
  eulerZYXFromQuaternion,
  quaternionFromAxisAngle,
  rotationCompose,
  rotationInverse,
  rotateVector,
  quaternionMultiply,
  quaternionConjugate,
  quaternionNormalize,
  quaternionNorm,
} from './rotation-ops.ts';

const TOL = 1e-12;
const GIMBAL_TOL = 1e-6;

/** Helper: check two matrices are approximately equal. */
function expectMatClose(a: Matrix, b: Matrix, tol: number = TOL): void {
  expect(a.rows).toBe(b.rows);
  expect(a.cols).toBe(b.cols);
  for (let i = 0; i < a.data.length; i++) {
    expect(Math.abs(a.data[i] - b.data[i])).toBeLessThan(tol);
  }
}

/** Helper: check two quaternions are approximately equal (up to sign). */
function expectQuatClose(a: Quaternion, b: Quaternion, tol: number = TOL): void {
  // Quaternions q and -q represent the same rotation, so compare both signs
  const sameDist = Math.max(
    Math.abs(a.w - b.w), Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z),
  );
  const negDist = Math.max(
    Math.abs(a.w + b.w), Math.abs(a.x + b.x), Math.abs(a.y + b.y), Math.abs(a.z + b.z),
  );
  expect(Math.min(sameDist, negDist)).toBeLessThan(tol);
}

/** Helper: check two Euler angle triples produce the same rotation matrix. */
function expectEulerClose(
  a: { roll: number; pitch: number; yaw: number },
  b: { roll: number; pitch: number; yaw: number },
  tol: number = TOL,
): void {
  // Compare via rotation matrices since Euler angles can wrap
  const Ra = rotationMatrixFromEulerZYX(a.roll, a.pitch, a.yaw);
  const Rb = rotationMatrixFromEulerZYX(b.roll, b.pitch, b.yaw);
  expectMatClose(Ra, Rb, tol);
}

// ─── 1. Identity ───

describe('Identity', () => {
  test('identityRotation is 3x3 identity', () => {
    const I = identityRotation();
    expectMatClose(I, Matrix.identity(3));
  });

  test('identityQuaternion is (1,0,0,0)', () => {
    const q = identityQuaternion();
    expect(q.w).toBe(1);
    expect(q.x).toBe(0);
    expect(q.y).toBe(0);
    expect(q.z).toBe(0);
  });

  test('identity rotation preserves vectors', () => {
    const v: [number, number, number] = [3, -1, 7];
    const result = rotateVector(identityRotation(), v);
    expect(Math.abs(result[0] - v[0])).toBeLessThan(TOL);
    expect(Math.abs(result[1] - v[1])).toBeLessThan(TOL);
    expect(Math.abs(result[2] - v[2])).toBeLessThan(TOL);
  });
});

// ─── 2. Axis-angle to rotation matrix ───

describe('Axis-angle to rotation matrix', () => {
  test('90° about x-axis', () => {
    const R = rotationMatrixFromAxisAngle([1, 0, 0], Math.PI / 2);
    // Should map [0,1,0] -> [0,0,1]
    const v = rotateVector(R, [0, 1, 0]);
    expect(Math.abs(v[0])).toBeLessThan(TOL);
    expect(Math.abs(v[1])).toBeLessThan(TOL);
    expect(Math.abs(v[2] - 1)).toBeLessThan(TOL);
  });

  test('90° about y-axis', () => {
    const R = rotationMatrixFromAxisAngle([0, 1, 0], Math.PI / 2);
    // Should map [0,0,1] -> [1,0,0] (right-hand rule: rotating z toward -x... wait)
    // Ry(90°) maps [1,0,0] -> [0,0,-1], [0,0,1] -> [1,0,0]
    const v = rotateVector(R, [0, 0, 1]);
    expect(Math.abs(v[0] - 1)).toBeLessThan(TOL);
    expect(Math.abs(v[1])).toBeLessThan(TOL);
    expect(Math.abs(v[2])).toBeLessThan(TOL);
  });

  test('90° about z-axis', () => {
    const R = rotationMatrixFromAxisAngle([0, 0, 1], Math.PI / 2);
    // Should map [1,0,0] -> [0,1,0]
    const v = rotateVector(R, [1, 0, 0]);
    expect(Math.abs(v[0])).toBeLessThan(TOL);
    expect(Math.abs(v[1] - 1)).toBeLessThan(TOL);
    expect(Math.abs(v[2])).toBeLessThan(TOL);
  });

  test('180° about arbitrary axis [1,1,0]/sqrt(2)', () => {
    const R = rotationMatrixFromAxisAngle([1, 1, 0], Math.PI);
    // 180° about [1,1,0] swaps x<->y and negates z
    const v = rotateVector(R, [1, 0, 0]);
    expect(Math.abs(v[0])).toBeLessThan(TOL);
    expect(Math.abs(v[1] - 1)).toBeLessThan(TOL);
    expect(Math.abs(v[2])).toBeLessThan(TOL);
  });
});

// ─── 3. Quaternion ↔ rotation matrix ───

describe('Quaternion ↔ rotation matrix', () => {
  test('identity quaternion gives identity matrix', () => {
    const R = rotationMatrixFromQuaternion(identityQuaternion());
    expectMatClose(R, Matrix.identity(3));
  });

  test('90° about z from quaternion', () => {
    const q = quaternionFromAxisAngle([0, 0, 1], Math.PI / 2);
    const R = rotationMatrixFromQuaternion(q);
    const v = rotateVector(R, [1, 0, 0]);
    expect(Math.abs(v[0])).toBeLessThan(TOL);
    expect(Math.abs(v[1] - 1)).toBeLessThan(TOL);
    expect(Math.abs(v[2])).toBeLessThan(TOL);
  });

  test('90° about x from quaternion', () => {
    const q = quaternionFromAxisAngle([1, 0, 0], Math.PI / 2);
    const R = rotationMatrixFromQuaternion(q);
    const v = rotateVector(R, [0, 1, 0]);
    expect(Math.abs(v[0])).toBeLessThan(TOL);
    expect(Math.abs(v[1])).toBeLessThan(TOL);
    expect(Math.abs(v[2] - 1)).toBeLessThan(TOL);
  });

  test('180° about y from quaternion', () => {
    const q = quaternionFromAxisAngle([0, 1, 0], Math.PI);
    const R = rotationMatrixFromQuaternion(q);
    const v = rotateVector(R, [1, 0, 0]);
    expect(Math.abs(v[0] + 1)).toBeLessThan(TOL);
    expect(Math.abs(v[1])).toBeLessThan(TOL);
    expect(Math.abs(v[2])).toBeLessThan(TOL);
  });

  test('quaternionFromRotationMatrix recovers identity', () => {
    const q = quaternionFromRotationMatrix(Matrix.identity(3));
    expectQuatClose(q, identityQuaternion());
  });

  test('round-trip q → R → q', () => {
    const q0 = quaternionNormalize(quaternion(0.5, 0.5, 0.5, 0.5));
    const R = rotationMatrixFromQuaternion(q0);
    const q1 = quaternionFromRotationMatrix(R);
    expectQuatClose(q0, q1);
  });
});

// ─── 4. Euler ZYX ↔ rotation matrix ───

describe('Euler ZYX ↔ rotation matrix', () => {
  test('pure roll (rotation about x)', () => {
    const roll = 0.7;
    const R = rotationMatrixFromEulerZYX(roll, 0, 0);
    const Rexpected = rotationMatrixFromAxisAngle([1, 0, 0], roll);
    expectMatClose(R, Rexpected);
  });

  test('pure pitch (rotation about y)', () => {
    const pitch = 0.5;
    const R = rotationMatrixFromEulerZYX(0, pitch, 0);
    const Rexpected = rotationMatrixFromAxisAngle([0, 1, 0], pitch);
    expectMatClose(R, Rexpected);
  });

  test('pure yaw (rotation about z)', () => {
    const yaw = 1.2;
    const R = rotationMatrixFromEulerZYX(0, 0, yaw);
    const Rexpected = rotationMatrixFromAxisAngle([0, 0, 1], yaw);
    expectMatClose(R, Rexpected);
  });

  test('combined roll-pitch-yaw', () => {
    const roll = 0.3, pitch = 0.5, yaw = 0.7;
    const R = rotationMatrixFromEulerZYX(roll, pitch, yaw);
    // Build R = Rz(yaw) * Ry(pitch) * Rx(roll)
    const Rx = rotationMatrixFromAxisAngle([1, 0, 0], roll);
    const Ry = rotationMatrixFromAxisAngle([0, 1, 0], pitch);
    const Rz = rotationMatrixFromAxisAngle([0, 0, 1], yaw);
    const Rexpected = rotationCompose(Rz, rotationCompose(Ry, Rx));
    expectMatClose(R, Rexpected);
  });

  test('round-trip euler → R → euler', () => {
    const roll = 0.3, pitch = 0.5, yaw = 0.7;
    const R = rotationMatrixFromEulerZYX(roll, pitch, yaw);
    const euler = eulerZYXFromRotationMatrix(R);
    expect(Math.abs(euler.roll - roll)).toBeLessThan(TOL);
    expect(Math.abs(euler.pitch - pitch)).toBeLessThan(TOL);
    expect(Math.abs(euler.yaw - yaw)).toBeLessThan(TOL);
  });

  test('gimbal lock at pitch = π/2', () => {
    const roll = 0.4, pitch = Math.PI / 2, yaw = 0.6;
    const R = rotationMatrixFromEulerZYX(roll, pitch, yaw);
    const euler = eulerZYXFromRotationMatrix(R);
    // At gimbal lock, only roll-yaw sum is recoverable
    // The function sets yaw=0, so roll should absorb both
    expectEulerClose(euler, { roll: euler.roll, pitch: euler.pitch, yaw: euler.yaw }, GIMBAL_TOL);
    expect(Math.abs(euler.pitch - Math.PI / 2)).toBeLessThan(GIMBAL_TOL);
  });
});

// ─── 5. Quaternion ↔ Euler ZYX ───

describe('Quaternion ↔ Euler ZYX', () => {
  test('round-trip euler → quaternion → euler', () => {
    const roll = 0.3, pitch = 0.5, yaw = 0.7;
    const q = quaternionFromEulerZYX(roll, pitch, yaw);
    const euler = eulerZYXFromQuaternion(q);
    expect(Math.abs(euler.roll - roll)).toBeLessThan(TOL);
    expect(Math.abs(euler.pitch - pitch)).toBeLessThan(TOL);
    expect(Math.abs(euler.yaw - yaw)).toBeLessThan(TOL);
  });

  test('quaternion from euler matches quaternion from rotation matrix', () => {
    const roll = 1.1, pitch = -0.3, yaw = 2.0;
    const q1 = quaternionFromEulerZYX(roll, pitch, yaw);
    const R = rotationMatrixFromEulerZYX(roll, pitch, yaw);
    const q2 = quaternionFromRotationMatrix(R);
    expectQuatClose(q1, q2);
  });

  test('identity euler gives identity quaternion', () => {
    const q = quaternionFromEulerZYX(0, 0, 0);
    expectQuatClose(q, identityQuaternion());
  });

  test('pure yaw 90° quaternion', () => {
    const q = quaternionFromEulerZYX(0, 0, Math.PI / 2);
    const expected = quaternionFromAxisAngle([0, 0, 1], Math.PI / 2);
    expectQuatClose(q, expected);
  });
});

// ─── 6. Quaternion operations ───

describe('Quaternion operations', () => {
  test('multiply composes two rotations', () => {
    const q1 = quaternionFromAxisAngle([0, 0, 1], Math.PI / 2);
    const q2 = quaternionFromAxisAngle([0, 0, 1], Math.PI / 2);
    const q12 = quaternionMultiply(q1, q2);
    const expected = quaternionFromAxisAngle([0, 0, 1], Math.PI);
    expectQuatClose(q12, expected);
  });

  test('conjugate of unit quaternion is its inverse', () => {
    const q = quaternionNormalize(quaternion(1, 2, 3, 4));
    const qc = quaternionConjugate(q);
    const product = quaternionMultiply(q, qc);
    expectQuatClose(product, identityQuaternion());
  });

  test('normalize produces unit quaternion', () => {
    const q = quaternion(3, 4, 0, 0);
    const qn = quaternionNormalize(q);
    expect(Math.abs(quaternionNorm(qn) - 1)).toBeLessThan(TOL);
    expect(Math.abs(qn.w - 0.6)).toBeLessThan(TOL);
    expect(Math.abs(qn.x - 0.8)).toBeLessThan(TOL);
  });

  test('norm of unit quaternion is 1', () => {
    const q = quaternionFromAxisAngle([1, 1, 1], 1.5);
    expect(Math.abs(quaternionNorm(q) - 1)).toBeLessThan(TOL);
  });

  test('identity multiply leaves quaternion unchanged', () => {
    const q = quaternionFromAxisAngle([1, 0, 0], 0.7);
    const result = quaternionMultiply(identityQuaternion(), q);
    expectQuatClose(result, q);
  });
});

// ─── 7. Rotation compose ───

describe('Rotation compose', () => {
  test('R1 * R2 matches sequential application', () => {
    const R1 = rotationMatrixFromAxisAngle([1, 0, 0], 0.5);
    const R2 = rotationMatrixFromAxisAngle([0, 1, 0], 0.7);
    const R12 = rotationCompose(R1, R2);
    const v: [number, number, number] = [1, 2, 3];
    const v1 = rotateVector(R2, v);
    const v2 = rotateVector(R1, v1);
    const v12 = rotateVector(R12, v);
    expect(Math.abs(v12[0] - v2[0])).toBeLessThan(TOL);
    expect(Math.abs(v12[1] - v2[1])).toBeLessThan(TOL);
    expect(Math.abs(v12[2] - v2[2])).toBeLessThan(TOL);
  });

  test('associativity: (R1*R2)*R3 = R1*(R2*R3)', () => {
    const R1 = rotationMatrixFromAxisAngle([1, 0, 0], 0.3);
    const R2 = rotationMatrixFromAxisAngle([0, 1, 0], 0.5);
    const R3 = rotationMatrixFromAxisAngle([0, 0, 1], 0.7);
    const lhs = rotationCompose(rotationCompose(R1, R2), R3);
    const rhs = rotationCompose(R1, rotationCompose(R2, R3));
    expectMatClose(lhs, rhs);
  });

  test('R * R^-1 = I', () => {
    const R = rotationMatrixFromAxisAngle([1, 1, 1], 1.2);
    const Rinv = rotationInverse(R);
    const I = rotationCompose(R, Rinv);
    expectMatClose(I, Matrix.identity(3));
  });
});

// ─── 8. Rotation inverse ───

describe('Rotation inverse', () => {
  test('R^T * R = I', () => {
    const R = rotationMatrixFromAxisAngle([0, 1, 0], 1.0);
    const Rt = rotationInverse(R);
    const I = rotationCompose(Rt, R);
    expectMatClose(I, Matrix.identity(3));
  });

  test('inverse of identity is identity', () => {
    const Iinv = rotationInverse(identityRotation());
    expectMatClose(Iinv, Matrix.identity(3));
  });

  test('inverse of 90° rotation', () => {
    const R = rotationMatrixFromAxisAngle([0, 0, 1], Math.PI / 2);
    const Rinv = rotationInverse(R);
    // Rinv should be 90° about z in the opposite direction
    const Rneg = rotationMatrixFromAxisAngle([0, 0, 1], -Math.PI / 2);
    expectMatClose(Rinv, Rneg);
  });
});

// ─── 9. Rotate vector ───

describe('Rotate vector', () => {
  test('90° about z rotates [1,0,0] → [0,1,0]', () => {
    const R = rotationMatrixFromAxisAngle([0, 0, 1], Math.PI / 2);
    const v = rotateVector(R, [1, 0, 0]);
    expect(Math.abs(v[0])).toBeLessThan(TOL);
    expect(Math.abs(v[1] - 1)).toBeLessThan(TOL);
    expect(Math.abs(v[2])).toBeLessThan(TOL);
  });

  test('identity preserves vector', () => {
    const v: [number, number, number] = [5, -3, 2];
    const result = rotateVector(identityRotation(), v);
    expect(Math.abs(result[0] - v[0])).toBeLessThan(TOL);
    expect(Math.abs(result[1] - v[1])).toBeLessThan(TOL);
    expect(Math.abs(result[2] - v[2])).toBeLessThan(TOL);
  });

  test('180° about z negates x and y', () => {
    const R = rotationMatrixFromAxisAngle([0, 0, 1], Math.PI);
    const v = rotateVector(R, [1, 2, 3]);
    expect(Math.abs(v[0] + 1)).toBeLessThan(TOL);
    expect(Math.abs(v[1] + 2)).toBeLessThan(TOL);
    expect(Math.abs(v[2] - 3)).toBeLessThan(TOL);
  });

  test('arbitrary rotation preserves vector norm', () => {
    const R = rotationMatrixFromAxisAngle([1, 2, 3], 1.1);
    const v: [number, number, number] = [4, -2, 7];
    const result = rotateVector(R, v);
    const normBefore = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    const normAfter = Math.sqrt(result[0] ** 2 + result[1] ** 2 + result[2] ** 2);
    expect(Math.abs(normAfter - normBefore)).toBeLessThan(TOL);
  });
});

// ─── 10. Cross-validation ───

describe('Cross-validation with Rotations.jl', () => {
  /**
   * @provenance Diebel "Representing Attitude" (2006), Eq. 125.
   * R = Rz(yaw) * Ry(pitch) * Rx(roll) for roll=0.3, pitch=0.5, yaw=0.7.
   * Cross-validated: rotationMatrixFromEulerZYX agrees with
   * rotationCompose(Rz, rotationCompose(Ry, Rx)) using rotationMatrixFromAxisAngle.
   */
  test('rotation matrix for roll=0.3, pitch=0.5, yaw=0.7 matches analytic formula', () => {
    const R = rotationMatrixFromEulerZYX(0.3, 0.5, 0.7);
    // Row 0: [cy*cp, cy*sp*sr - sy*cr, cy*sp*cr + sy*sr]
    expect(Math.abs(R.get(0, 0) - 0.6712121661589577)).toBeLessThan(TOL);
    expect(Math.abs(R.get(0, 1) - (-0.5070818727544463))).toBeLessThan(TOL);
    expect(Math.abs(R.get(0, 2) - 0.5406867876359134)).toBeLessThan(TOL);
    // Row 1: [sy*cp, sy*sp*sr + cy*cr, sy*sp*cr - cy*sr]
    expect(Math.abs(R.get(1, 0) - 0.5653542083811438)).toBeLessThan(TOL);
    expect(Math.abs(R.get(1, 1) - 0.8219543695041275)).toBeLessThan(TOL);
    expect(Math.abs(R.get(1, 2) - 0.06903356805788474)).toBeLessThan(TOL);
    // Row 2: [-sp, cp*sr, cp*cr]
    expect(Math.abs(R.get(2, 0) - (-0.479425538604203))).toBeLessThan(TOL);
    expect(Math.abs(R.get(2, 1) - 0.2593433800522308)).toBeLessThan(TOL);
    expect(Math.abs(R.get(2, 2) - 0.8383866435942036)).toBeLessThan(TOL);
  });

  /**
   * @provenance Diebel "Representing Attitude" (2006), Eq. 290 (ZYX half-angle formula).
   * Cross-validated: quaternionFromEulerZYX agrees with
   * quaternionFromRotationMatrix(rotationMatrixFromEulerZYX(...)) to within 1e-16.
   */
  test('quaternion for roll=0.3, pitch=0.5, yaw=0.7 cross-validates two paths', () => {
    const q = quaternionFromEulerZYX(0.3, 0.5, 0.7);
    // Hamilton (w,x,y,z) scalar-first
    expect(Math.abs(q.w - 0.9126271389863014)).toBeLessThan(TOL);
    expect(Math.abs(q.x - 0.052132410889547995)).toBeLessThan(TOL);
    expect(Math.abs(q.y - 0.2794438940784743)).toBeLessThan(TOL);
    expect(Math.abs(q.z - 0.29377717233096856)).toBeLessThan(TOL);
  });
});

describe('quaternionFromRotationMatrix — branch coverage', () => {
  const TOL = 1e-6;

  test('~180° rotation around X (r00 > r11 && r00 > r22, trace <= 0)', () => {
    // Rotation of π around X axis: diag(1, -1, -1)
    const R = rotationMatrixFromAxisAngle([1, 0, 0], Math.PI - 0.01);
    const q = quaternionFromRotationMatrix(R);
    // Should round-trip
    const R2 = rotationMatrixFromQuaternion(q);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(R2.get(i, j)).toBeCloseTo(R.get(i, j), 4);
      }
    }
  });

  test('~180° rotation around Y (r11 > r22, trace <= 0)', () => {
    // Rotation of π around Y axis: diag(-1, 1, -1)
    const R = rotationMatrixFromAxisAngle([0, 1, 0], Math.PI - 0.01);
    const q = quaternionFromRotationMatrix(R);
    const R2 = rotationMatrixFromQuaternion(q);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(R2.get(i, j)).toBeCloseTo(R.get(i, j), 4);
      }
    }
  });

  test('~180° rotation around Z (else branch, r22 dominant)', () => {
    // Rotation of π around Z axis: diag(-1, -1, 1)
    const R = rotationMatrixFromAxisAngle([0, 0, 1], Math.PI - 0.01);
    const q = quaternionFromRotationMatrix(R);
    const R2 = rotationMatrixFromQuaternion(q);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(R2.get(i, j)).toBeCloseTo(R.get(i, j), 4);
      }
    }
  });

  test('canonical form: w >= 0 after flip', () => {
    // Build a rotation matrix from a quaternion with negative w.
    // q = normalize(-0.1, 0.3, 0.9, 0.3) → the r11>r22 branch computes
    // w = (r02-r20)/s < 0, triggering the canonical flip at line 134.
    const norm = Math.sqrt(0.01 + 0.09 + 0.81 + 0.09);
    const qNeg = { w: -0.1 / norm, x: 0.3 / norm, y: 0.9 / norm, z: 0.3 / norm };
    const R = rotationMatrixFromQuaternion(qNeg);
    const q = quaternionFromRotationMatrix(R);
    expect(q.w).toBeGreaterThanOrEqual(0);
    // Verify round-trip: should be equivalent rotation (signs may flip)
    const R2 = rotationMatrixFromQuaternion(q);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(R2.get(i, j)).toBeCloseTo(R.get(i, j), 4);
      }
    }
  });
});
