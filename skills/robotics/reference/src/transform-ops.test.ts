import { describe, test, expect } from 'bun:test';
import { Matrix } from './mat-ops.ts';
import { rotationMatrixFromEulerZYX, rotationMatrixFromAxisAngle, identityRotation } from './rotation-ops.ts';
import {
  transformFromRotationAndTranslation,
  identityTransform,
  transformGetRotation,
  transformGetTranslation,
  transformCompose,
  transformInverse,
  transformPoint,
  transformFromEulerXYZ,
  transformToEulerXYZ,
} from './transform-ops.ts';

const TOL = 1e-10;

function expectClose(actual: number, expected: number, tol = TOL) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

function expectPointClose(actual: [number, number, number], expected: [number, number, number], tol = TOL) {
  expectClose(actual[0], expected[0], tol);
  expectClose(actual[1], expected[1], tol);
  expectClose(actual[2], expected[2], tol);
}

function expectMatrixClose(A: Matrix, B: Matrix, tol = TOL) {
  expect(A.rows).toBe(B.rows);
  expect(A.cols).toBe(B.cols);
  for (let r = 0; r < A.rows; r++) {
    for (let c = 0; c < A.cols; c++) {
      expectClose(A.get(r, c), B.get(r, c), tol);
    }
  }
}

describe('transform-ops', () => {
  // 1. Identity transform doesn't change points
  test('identity transform does not change a point', () => {
    const T = identityTransform();
    const p: [number, number, number] = [3, -2, 7];
    expectPointClose(transformPoint(T, p), p);
  });

  // 2. Pure translation shifts point
  test('pure translation shifts point', () => {
    const T = transformFromRotationAndTranslation(identityRotation(), [1, 2, 3]);
    expectPointClose(transformPoint(T, [0, 0, 0]), [1, 2, 3]);
    expectPointClose(transformPoint(T, [4, 5, 6]), [5, 7, 9]);
  });

  // 3. Pure rotation rotates point
  test('pure rotation rotates point (90 deg about Z)', () => {
    const R = rotationMatrixFromEulerZYX(0, 0, Math.PI / 2);
    const T = transformFromRotationAndTranslation(R, [0, 0, 0]);
    const result = transformPoint(T, [1, 0, 0]);
    expectPointClose(result, [0, 1, 0]);
  });

  // 4. Combined rotation + translation
  test('combined rotation and translation', () => {
    // 90 deg about Z then translate (10, 0, 0)
    const R = rotationMatrixFromEulerZYX(0, 0, Math.PI / 2);
    const T = transformFromRotationAndTranslation(R, [10, 0, 0]);
    // Point (1,0,0) -> rotate to (0,1,0) -> translate to (10,1,0)
    expectPointClose(transformPoint(T, [1, 0, 0]), [10, 1, 0]);
  });

  // 5. Compose: T1*T2 applied to point = T1(T2(point))
  test('compose matches sequential application', () => {
    const T1 = transformFromEulerXYZ(0.1, 0.2, 0.3, 1, 2, 3);
    const T2 = transformFromEulerXYZ(-0.2, 0.4, -0.1, -1, 0, 5);
    const p: [number, number, number] = [2, -3, 4];

    const composed = transformCompose(T1, T2);
    const sequential = transformPoint(T1, transformPoint(T2, p));
    expectPointClose(transformPoint(composed, p), sequential);
  });

  // 6. Inverse: T * T^-1 = identity
  test('T * T_inv = identity', () => {
    const T = transformFromEulerXYZ(0.3, -0.5, 1.2, 4, -3, 7);
    const Tinv = transformInverse(T);
    const result = transformCompose(T, Tinv);
    expectMatrixClose(result, identityTransform());
  });

  // 7. Identity inverse is identity
  test('identity inverse is identity', () => {
    expectMatrixClose(transformInverse(identityTransform()), identityTransform());
  });

  // 8. Extract rotation from transform
  test('extract rotation from transform', () => {
    const R = rotationMatrixFromEulerZYX(0.5, 0.3, 0.7);
    const T = transformFromRotationAndTranslation(R, [10, 20, 30]);
    expectMatrixClose(transformGetRotation(T), R);
  });

  // 9. Extract translation from transform
  test('extract translation from transform', () => {
    const R = rotationMatrixFromEulerZYX(0.5, 0.3, 0.7);
    const T = transformFromRotationAndTranslation(R, [10, 20, 30]);
    expectPointClose(transformGetTranslation(T), [10, 20, 30]);
  });

  // 10. Round-trip: euler+translation -> transform -> euler+translation
  test('round-trip euler+translation -> transform -> euler+translation', () => {
    const roll = 0.3, pitch = -0.4, yaw = 1.1;
    const x = 5, y = -2, z = 8;
    const T = transformFromEulerXYZ(roll, pitch, yaw, x, y, z);
    const out = transformToEulerXYZ(T);
    expectClose(out.roll, roll);
    expectClose(out.pitch, pitch);
    expectClose(out.yaw, yaw);
    expectClose(out.x, x);
    expectClose(out.y, y);
    expectClose(out.z, z);
  });

  // 11. Gimbal lock case (pitch ~ pi/2): pitch is correctly identified
  test('gimbal lock pitch = pi/2 extracts correct pitch and translation', () => {
    // At gimbal lock, roll and yaw are coupled; only their sum/difference is recoverable.
    // We verify that pitch is correct and translation is preserved.
    const T = transformFromEulerXYZ(0.6, Math.PI / 2, 0.4, 1, 2, 3);
    const out = transformToEulerXYZ(T);
    expectClose(out.pitch, Math.PI / 2);
    expectClose(out.x, 1);
    expectClose(out.y, 2);
    expectClose(out.z, 3);
    // At gimbal lock, yaw is set to 0 and roll absorbs the combined angle.
    // roll - yaw should equal original roll - yaw = 0.6 - 0.4 = 0.2
    // The convention sets yaw=0, so roll = roll_orig - yaw_orig = 0.2
    // (per the gimbal lock convention in rotation-ops: yaw=0, roll=atan2(-R01,R02))
    expectClose(out.yaw, 0);
  });

  // 12. Transform from rotation and zero translation
  test('transform from rotation and zero translation', () => {
    const R = rotationMatrixFromAxisAngle([0, 0, 1], Math.PI / 4);
    const T = transformFromRotationAndTranslation(R, [0, 0, 0]);
    expectPointClose(transformGetTranslation(T), [0, 0, 0]);
    expectMatrixClose(transformGetRotation(T), R);
  });

  // 13. Compose associativity: (T1*T2)*T3 = T1*(T2*T3)
  test('compose is associative', () => {
    const T1 = transformFromEulerXYZ(0.1, 0.2, 0.3, 1, 0, 0);
    const T2 = transformFromEulerXYZ(-0.3, 0.1, 0.5, 0, 2, 0);
    const T3 = transformFromEulerXYZ(0.4, -0.2, -0.1, 0, 0, 3);
    const left = transformCompose(transformCompose(T1, T2), T3);
    const right = transformCompose(T1, transformCompose(T2, T3));
    expectMatrixClose(left, right);
  });

  // 14. Pure rotation preserves distances between points
  test('pure rotation preserves distances', () => {
    const R = rotationMatrixFromEulerZYX(0.7, -0.3, 1.5);
    const T = transformFromRotationAndTranslation(R, [0, 0, 0]);
    const a: [number, number, number] = [1, 2, 3];
    const b: [number, number, number] = [4, -1, 2];

    const dist = (p: [number, number, number], q: [number, number, number]) =>
      Math.sqrt((p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2);

    const before = dist(a, b);
    const after = dist(transformPoint(T, a), transformPoint(T, b));
    expectClose(after, before);
  });

  // 15. Cross-validation: known transform values
  test('known 90-deg Z rotation transform', () => {
    const T = transformFromEulerXYZ(0, 0, Math.PI / 2, 5, 10, 15);
    // (1,0,0) -> rotate -> (0,1,0) -> translate -> (5,11,15)
    expectPointClose(transformPoint(T, [1, 0, 0]), [5, 11, 15]);
    // (0,1,0) -> rotate -> (-1,0,0) -> translate -> (4,10,15)
    expectPointClose(transformPoint(T, [0, 1, 0]), [4, 10, 15]);
  });

  // 16. Inverse of pure translation
  test('inverse of pure translation negates translation', () => {
    const T = transformFromRotationAndTranslation(identityRotation(), [5, -3, 8]);
    const Tinv = transformInverse(T);
    expectPointClose(transformGetTranslation(Tinv), [-5, 3, -8]);
  });

  // 17. Inverse of pure rotation is transpose
  test('inverse of pure rotation', () => {
    const R = rotationMatrixFromEulerZYX(0.5, 0.3, 0.7);
    const T = transformFromRotationAndTranslation(R, [0, 0, 0]);
    const Tinv = transformInverse(T);
    const Rinv = transformGetRotation(Tinv);
    // R^T * R = I
    const product = transformCompose(T, Tinv);
    expectMatrixClose(product, identityTransform());
    // Also check extracted rotation
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expectClose(Rinv.get(r, c), R.get(c, r));
      }
    }
  });

  // 18. T_inv * T = identity (reverse order)
  test('T_inv * T = identity', () => {
    const T = transformFromEulerXYZ(-0.7, 0.2, 1.5, -3, 8, 2);
    const Tinv = transformInverse(T);
    expectMatrixClose(transformCompose(Tinv, T), identityTransform());
  });

  // 19. identityTransform is proper 4x4 identity
  test('identityTransform has correct structure', () => {
    const I = identityTransform();
    expect(I.rows).toBe(4);
    expect(I.cols).toBe(4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expectClose(I.get(r, c), r === c ? 1 : 0);
      }
    }
  });

  // 20. Transform bottom row is [0 0 0 1]
  test('constructed transform has bottom row [0 0 0 1]', () => {
    const T = transformFromEulerXYZ(0.3, -0.5, 1.2, 4, -3, 7);
    expectClose(T.get(3, 0), 0);
    expectClose(T.get(3, 1), 0);
    expectClose(T.get(3, 2), 0);
    expectClose(T.get(3, 3), 1);
  });

  // 21. Inverse bottom row is [0 0 0 1]
  test('inverse transform has bottom row [0 0 0 1]', () => {
    const Tinv = transformInverse(transformFromEulerXYZ(0.3, -0.5, 1.2, 4, -3, 7));
    expectClose(Tinv.get(3, 0), 0);
    expectClose(Tinv.get(3, 1), 0);
    expectClose(Tinv.get(3, 2), 0);
    expectClose(Tinv.get(3, 3), 1);
  });

  // 22. transformFromEulerXYZ with all zeros gives identity
  test('transformFromEulerXYZ all zeros gives identity', () => {
    expectMatrixClose(transformFromEulerXYZ(0, 0, 0, 0, 0, 0), identityTransform());
  });

  // 23. Compose with identity is no-op
  test('compose with identity is no-op', () => {
    const T = transformFromEulerXYZ(0.5, -0.3, 0.8, 2, 4, 6);
    expectMatrixClose(transformCompose(T, identityTransform()), T);
    expectMatrixClose(transformCompose(identityTransform(), T), T);
  });

  // 24. Multiple composes then inverse recovers origin point
  test('chain of transforms then inverse chain recovers point', () => {
    const T1 = transformFromEulerXYZ(0.1, 0.2, 0.3, 1, 2, 3);
    const T2 = transformFromEulerXYZ(-0.2, 0.4, -0.1, -1, 0, 5);
    const T3 = transformFromEulerXYZ(0.5, -0.3, 0.7, 3, -1, 2);
    const p: [number, number, number] = [7, -4, 2];

    const T = transformCompose(transformCompose(T1, T2), T3);
    const Tinv = transformInverse(T);
    const pTransformed = transformPoint(T, p);
    expectPointClose(transformPoint(Tinv, pTransformed), p);
  });

  // 25. Cross-validation: 180-deg rotation about X
  test('180 deg rotation about X flips y and z', () => {
    const R = rotationMatrixFromAxisAngle([1, 0, 0], Math.PI);
    const T = transformFromRotationAndTranslation(R, [0, 0, 0]);
    const result = transformPoint(T, [0, 1, 1]);
    expectPointClose(result, [0, -1, -1]);
  });
});
