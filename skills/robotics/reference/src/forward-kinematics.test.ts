import { describe, expect, it } from 'bun:test';
import {
  forwardKinematics,
  fkPosition,
  fkRotation,
} from './forward-kinematics.ts';
import {
  dhChainTransform,
  dhCreateJoint,
  twoLinkPlanar,
  scara,
} from './dh-parameters.ts';
import {
  testChain2Link,
  testChain3Link,
  testChainPuma560,
  testChainStanford,
} from './test-chains.ts';
import { Matrix } from './mat-ops.ts';

const TOL = 1e-10;

/** Helper: check approximate equality of two 4×4 matrices. */
function expectMatClose(a: Matrix, b: Matrix, precision: number = 8): void {
  expect(a.rows).toBe(b.rows);
  expect(a.cols).toBe(b.cols);
  for (let r = 0; r < a.rows; r++) {
    for (let c = 0; c < a.cols; c++) {
      expect(a.get(r, c)).toBeCloseTo(b.get(r, c), precision);
    }
  }
}

describe('forwardKinematics — basic properties', () => {
  it('end-effector matches dhChainTransform for 2-link planar', () => {
    const joints = testChain2Link(1, 0.5);
    const q = [Math.PI / 4, -Math.PI / 6];
    const { endEffector } = forwardKinematics(joints, q);
    const expected = dhChainTransform(joints, q);
    expectMatClose(endEffector, expected);
  });

  it('end-effector matches dhChainTransform for PUMA 560', () => {
    const joints = testChainPuma560();
    const q = [0.1, -0.2, 0.3, -0.4, 0.5, -0.6];
    const { endEffector } = forwardKinematics(joints, q);
    const expected = dhChainTransform(joints, q);
    expectMatClose(endEffector, expected);
  });

  it('returns n+1 frames for n joints', () => {
    const joints = testChainPuma560();
    const q = [0, 0, 0, 0, 0, 0];
    const { frames } = forwardKinematics(joints, q);
    expect(frames.length).toBe(7); // 6 joints + 1 base
  });

  it('frame[0] is identity (base frame)', () => {
    const joints = testChain2Link();
    const { frames } = forwardKinematics(joints, [0.5, -0.3]);
    expectMatClose(frames[0], Matrix.identity(4));
  });

  it('frame[n] equals endEffector', () => {
    const joints = testChain3Link();
    const q = [0.1, 0.2, 0.3];
    const { endEffector, frames } = forwardKinematics(joints, q);
    expectMatClose(frames[3], endEffector);
  });

  it('throws when joint count mismatches value count', () => {
    const joints = testChain2Link();
    expect(() => forwardKinematics(joints, [0])).toThrow('does not match');
    expect(() => forwardKinematics(joints, [0, 0, 0])).toThrow('does not match');
  });
});

describe('forwardKinematics — intermediate frames', () => {
  it('intermediate frames are sequential products of DH transforms', () => {
    const joints = testChain2Link(1, 0.5);
    const q = [Math.PI / 3, -Math.PI / 4];
    const { frames } = forwardKinematics(joints, q);

    // frames[1] = T_0^1 (just first joint)
    const T01 = dhChainTransform([joints[0]], [q[0]]);
    expectMatClose(frames[1], T01);

    // frames[2] = T_0^2 (both joints)
    const T02 = dhChainTransform(joints, q);
    expectMatClose(frames[2], T02);
  });

  it('each intermediate frame is a valid transform (bottom row = [0 0 0 1])', () => {
    const joints = testChainPuma560();
    const q = [0.3, -0.5, 0.7, -0.1, 0.4, -0.2];
    const { frames } = forwardKinematics(joints, q);
    for (const T of frames) {
      expect(T.rows).toBe(4);
      expect(T.cols).toBe(4);
      expect(T.get(3, 0)).toBeCloseTo(0, 10);
      expect(T.get(3, 1)).toBeCloseTo(0, 10);
      expect(T.get(3, 2)).toBeCloseTo(0, 10);
      expect(T.get(3, 3)).toBeCloseTo(1, 10);
    }
  });

  it('each intermediate rotation is proper (det = +1)', () => {
    const joints = testChain3Link();
    const q = [Math.PI / 6, Math.PI / 3, -Math.PI / 4];
    const { frames } = forwardKinematics(joints, q);
    for (const T of frames) {
      const det =
        T.get(0, 0) * (T.get(1, 1) * T.get(2, 2) - T.get(1, 2) * T.get(2, 1)) -
        T.get(0, 1) * (T.get(1, 0) * T.get(2, 2) - T.get(1, 2) * T.get(2, 0)) +
        T.get(0, 2) * (T.get(1, 0) * T.get(2, 1) - T.get(1, 1) * T.get(2, 0));
      expect(det).toBeCloseTo(1, 8);
    }
  });
});

describe('forwardKinematics — 2-link planar cross-validation', () => {
  it('q=[0,0]: position at (l1+l2, 0, 0)', () => {
    const l1 = 1, l2 = 0.5;
    const joints = testChain2Link(l1, l2);
    const [x, y, z] = fkPosition(joints, [0, 0]);
    expect(x).toBeCloseTo(l1 + l2, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  it('q=[π/2, 0]: position at (0, l1+l2, 0)', () => {
    const l1 = 1, l2 = 0.5;
    const joints = testChain2Link(l1, l2);
    const [x, y, z] = fkPosition(joints, [Math.PI / 2, 0]);
    expect(x).toBeCloseTo(0, 8);
    expect(y).toBeCloseTo(l1 + l2, 8);
    expect(z).toBeCloseTo(0, 10);
  });

  it('q=[π/4, -π/4]: matches analytic formula', () => {
    const l1 = 1, l2 = 1;
    const q1 = Math.PI / 4, q2 = -Math.PI / 4;
    const [x, y] = fkPosition(testChain2Link(l1, l2), [q1, q2]);
    expect(x).toBeCloseTo(l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2), 8);
    expect(y).toBeCloseTo(l1 * Math.sin(q1) + l2 * Math.sin(q1 + q2), 8);
  });

  it('fully folded q=[0, π]: position at (l1-l2, 0, 0)', () => {
    const l1 = 2, l2 = 1;
    const [x, y] = fkPosition(testChain2Link(l1, l2), [0, Math.PI]);
    expect(x).toBeCloseTo(l1 - l2, 8);
    expect(y).toBeCloseTo(0, 8);
  });
});

describe('forwardKinematics — 3-link spatial cross-validation', () => {
  it('q=[0,0,0]: end-effector at (l2+l3, 0, d1)', () => {
    const d1 = 0.5, l2 = 1, l3 = 0.5;
    const joints = testChain3Link(d1, l2, l3);
    const [x, y, z] = fkPosition(joints, [0, 0, 0]);
    expect(x).toBeCloseTo(l2 + l3, 8);
    expect(y).toBeCloseTo(0, 8);
    expect(z).toBeCloseTo(d1, 8);
  });

  it('q=[π/2, 0, 0]: base rotation swings arm to +Y', () => {
    const d1 = 0.5, l2 = 1, l3 = 0.5;
    const joints = testChain3Link(d1, l2, l3);
    const [x, y, z] = fkPosition(joints, [Math.PI / 2, 0, 0]);
    expect(x).toBeCloseTo(0, 8);
    expect(y).toBeCloseTo(l2 + l3, 8);
    expect(z).toBeCloseTo(d1, 8);
  });
});

describe('forwardKinematics — SCARA', () => {
  it('q=[0,0,0,0]: end-effector at (l1+l2, 0, 0)', () => {
    const joints = scara(1.0, 0.5);
    const [x, y, z] = fkPosition(joints, [0, 0, 0, 0]);
    expect(x).toBeCloseTo(1.5, 8);
    expect(y).toBeCloseTo(0, 8);
    expect(z).toBeCloseTo(0, 8);
  });

  it('prismatic extension changes z position', () => {
    const joints = scara(1.0, 0.5);
    const [, , z] = fkPosition(joints, [0, 0, 0.3, 0]);
    // alpha=π on joint 2 flips Z for the prismatic joint
    expect(z).toBeCloseTo(-0.3, 8);
  });
});

describe('forwardKinematics — PUMA 560', () => {
  it('home position: valid transform', () => {
    const joints = testChainPuma560();
    const { endEffector, frames } = forwardKinematics(joints, [0, 0, 0, 0, 0, 0]);
    expect(frames.length).toBe(7);
    expect(endEffector.get(3, 3)).toBeCloseTo(1, 10);
  });

  it('rotation part is orthogonal at various configs', () => {
    const joints = testChainPuma560();
    const configs = [
      [0, 0, 0, 0, 0, 0],
      [Math.PI / 4, -Math.PI / 6, Math.PI / 3, 0, Math.PI / 4, 0],
      [1.0, -0.5, 0.3, -1.2, 0.8, -0.4],
    ];
    for (const q of configs) {
      const R = fkRotation(joints, q);
      expect(R.rows).toBe(3);
      expect(R.cols).toBe(3);
      // R * R^T ≈ I
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          let dot = 0;
          for (let k = 0; k < 3; k++) {
            dot += R.get(i, k) * R.get(j, k);
          }
          expect(dot).toBeCloseTo(i === j ? 1 : 0, 8);
        }
      }
    }
  });
});

describe('forwardKinematics — Stanford arm (prismatic joint)', () => {
  it('prismatic extension changes position', () => {
    const joints = testChainStanford();
    const pos0 = fkPosition(joints, [0, 0, 0, 0, 0, 0]);
    const pos1 = fkPosition(joints, [0, 0, 1.0, 0, 0, 0]);
    const dist = Math.sqrt(
      (pos1[0] - pos0[0]) ** 2 +
      (pos1[1] - pos0[1]) ** 2 +
      (pos1[2] - pos0[2]) ** 2,
    );
    expect(dist).toBeCloseTo(1.0, 8);
  });

  it('base rotation is decoupled from prismatic extension', () => {
    const joints = testChainStanford();
    // Rotate base 90°, extend prismatic 0.5
    const { frames } = forwardKinematics(joints, [Math.PI / 2, 0, 0.5, 0, 0, 0]);
    // Frame[1] should have rotated about Z by π/2
    expect(frames[1].get(0, 0)).toBeCloseTo(0, 8);
    expect(frames[1].get(1, 0)).toBeCloseTo(1, 8);
  });
});

describe('fkPosition', () => {
  it('returns [x, y, z] tuple', () => {
    const joints = testChain2Link(1, 1);
    const pos = fkPosition(joints, [0, 0]);
    expect(pos.length).toBe(3);
    expect(pos[0]).toBeCloseTo(2, 10);
    expect(pos[1]).toBeCloseTo(0, 10);
    expect(pos[2]).toBeCloseTo(0, 10);
  });
});

describe('fkRotation', () => {
  it('returns 3×3 matrix', () => {
    const joints = testChain2Link(1, 1);
    const R = fkRotation(joints, [0, 0]);
    expect(R.rows).toBe(3);
    expect(R.cols).toBe(3);
  });

  it('identity rotation at q=[0,0] for planar arm (no twist)', () => {
    const joints = testChain2Link(1, 1);
    const R = fkRotation(joints, [0, 0]);
    // For planar arm with no alpha, q=0 gives identity rotation
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(R.get(i, j)).toBeCloseTo(i === j ? 1 : 0, 10);
      }
    }
  });

  it('rotation changes with joint angles', () => {
    const joints = testChain2Link(1, 1);
    const R = fkRotation(joints, [Math.PI / 2, 0]);
    // Rz(π/2): first column [0, 1, 0]
    expect(R.get(0, 0)).toBeCloseTo(0, 8);
    expect(R.get(1, 0)).toBeCloseTo(1, 8);
  });
});
