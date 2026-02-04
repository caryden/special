import { describe, expect, it } from 'bun:test';
import {
  dhTransform,
  dhChainTransform,
  dhCreateJoint,
  dhCreateChain,
  twoLinkPlanar,
  scara,
  type DHParams,
} from './dh-parameters.ts';
import { Matrix, matMultiply, matEqual } from './mat-ops.ts';

const TOL = 1e-10;

/** Helper: check that two matrices are approximately equal. */
function expectMatClose(a: Matrix, b: Matrix, tol: number = TOL): void {
  expect(a.rows).toBe(b.rows);
  expect(a.cols).toBe(b.cols);
  for (let r = 0; r < a.rows; r++) {
    for (let c = 0; c < a.cols; c++) {
      expect(a.get(r, c)).toBeCloseTo(b.get(r, c), 8);
    }
  }
}

describe('dhTransform', () => {
  it('returns 4×4 identity when all parameters are zero', () => {
    const T = dhTransform({ theta: 0, d: 0, a: 0, alpha: 0 });
    expectMatClose(T, Matrix.identity(4));
  });

  it('pure rotation about Z by π/2', () => {
    const T = dhTransform({ theta: Math.PI / 2, d: 0, a: 0, alpha: 0 });
    // Rz(π/2): cos=0, sin=1, alpha=0 so ca=1, sa=0
    const expected = Matrix.fromArray([
      [0, -1, 0, 0],
      [1,  0, 0, 0],
      [0,  0, 1, 0],
      [0,  0, 0, 1],
    ]);
    expectMatClose(T, expected);
  });

  it('pure translation along Z (d=1)', () => {
    const T = dhTransform({ theta: 0, d: 1, a: 0, alpha: 0 });
    const expected = Matrix.fromArray([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 0, 1],
    ]);
    expectMatClose(T, expected);
  });

  it('link length a=1 translates along X', () => {
    const T = dhTransform({ theta: 0, d: 0, a: 1, alpha: 0 });
    const expected = Matrix.fromArray([
      [1, 0, 0, 1],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
    expectMatClose(T, expected);
  });

  it('link twist alpha=π/2 rotates about X', () => {
    const T = dhTransform({ theta: 0, d: 0, a: 0, alpha: Math.PI / 2 });
    // Rx(π/2): ca=0, sa=1
    const expected = Matrix.fromArray([
      [1, 0,  0, 0],
      [0, 0, -1, 0],
      [0, 1,  0, 0],
      [0, 0,  0, 1],
    ]);
    expectMatClose(T, expected);
  });

  it('combined: theta=π/4, d=0.5, a=1.0, alpha=π/6', () => {
    const theta = Math.PI / 4;
    const d = 0.5;
    const a = 1.0;
    const alpha = Math.PI / 6;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const ca = Math.cos(alpha);
    const sa = Math.sin(alpha);

    const T = dhTransform({ theta, d, a, alpha });

    // Verify each element of the standard DH matrix
    expect(T.get(0, 0)).toBeCloseTo(ct, 10);
    expect(T.get(0, 1)).toBeCloseTo(-st * ca, 10);
    expect(T.get(0, 2)).toBeCloseTo(st * sa, 10);
    expect(T.get(0, 3)).toBeCloseTo(a * ct, 10);

    expect(T.get(1, 0)).toBeCloseTo(st, 10);
    expect(T.get(1, 1)).toBeCloseTo(ct * ca, 10);
    expect(T.get(1, 2)).toBeCloseTo(-ct * sa, 10);
    expect(T.get(1, 3)).toBeCloseTo(a * st, 10);

    expect(T.get(2, 0)).toBeCloseTo(0, 10);
    expect(T.get(2, 1)).toBeCloseTo(sa, 10);
    expect(T.get(2, 2)).toBeCloseTo(ca, 10);
    expect(T.get(2, 3)).toBeCloseTo(d, 10);

    expect(T.get(3, 0)).toBeCloseTo(0, 10);
    expect(T.get(3, 1)).toBeCloseTo(0, 10);
    expect(T.get(3, 2)).toBeCloseTo(0, 10);
    expect(T.get(3, 3)).toBeCloseTo(1, 10);
  });

  it('theta=π produces rotation by 180°', () => {
    const T = dhTransform({ theta: Math.PI, d: 0, a: 0, alpha: 0 });
    expect(T.get(0, 0)).toBeCloseTo(-1, 10);
    expect(T.get(1, 1)).toBeCloseTo(-1, 10);
    expect(T.get(0, 1)).toBeCloseTo(0, 10);
    expect(T.get(1, 0)).toBeCloseTo(0, 10);
  });
});

describe('dhChainTransform — two-link planar cross-validation', () => {
  const l1 = 1.0;
  const l2 = 0.5;

  it('q=[0,0]: end effector at (l1+l2, 0, 0)', () => {
    const joints = twoLinkPlanar(l1, l2);
    const T = dhChainTransform(joints, [0, 0]);
    expect(T.get(0, 3)).toBeCloseTo(l1 + l2, 10);
    expect(T.get(1, 3)).toBeCloseTo(0, 10);
    expect(T.get(2, 3)).toBeCloseTo(0, 10);
  });

  it('q=[π/2, 0]: end effector at (0, l1+l2, 0)', () => {
    const joints = twoLinkPlanar(l1, l2);
    const T = dhChainTransform(joints, [Math.PI / 2, 0]);
    expect(T.get(0, 3)).toBeCloseTo(0, 8);
    expect(T.get(1, 3)).toBeCloseTo(l1 + l2, 8);
    expect(T.get(2, 3)).toBeCloseTo(0, 10);
  });

  it('q=[π/4, -π/4]: verify position via trig', () => {
    const joints = twoLinkPlanar(l1, l2);
    const q1 = Math.PI / 4;
    const q2 = -Math.PI / 4;
    const T = dhChainTransform(joints, [q1, q2]);

    // For 2-link planar: x = l1*cos(q1) + l2*cos(q1+q2), y = l1*sin(q1) + l2*sin(q1+q2)
    const expectedX = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2);
    const expectedY = l1 * Math.sin(q1) + l2 * Math.sin(q1 + q2);
    expect(T.get(0, 3)).toBeCloseTo(expectedX, 8);
    expect(T.get(1, 3)).toBeCloseTo(expectedY, 8);
    expect(T.get(2, 3)).toBeCloseTo(0, 10);
  });

  it('q=[π, 0]: end effector at (-l1-l2, 0, 0)', () => {
    const joints = twoLinkPlanar(l1, l2);
    const T = dhChainTransform(joints, [Math.PI, 0]);
    expect(T.get(0, 3)).toBeCloseTo(-(l1 + l2), 8);
    expect(T.get(1, 3)).toBeCloseTo(0, 8);
  });
});

describe('dhChainTransform — chain mechanics', () => {
  it('single joint chain matches single dhTransform', () => {
    const params: DHParams = { theta: 0, d: 0, a: 1, alpha: Math.PI / 4 };
    const joint = dhCreateJoint(params, 'revolute');
    const q = Math.PI / 3;

    const chainT = dhChainTransform([joint], [q]);
    const directT = dhTransform({ ...params, theta: params.theta + q });

    expectMatClose(chainT, directT);
  });

  it('two-joint chain equals product of individual transforms', () => {
    const j1 = dhCreateJoint({ theta: 0, d: 0, a: 1, alpha: 0 }, 'revolute');
    const j2 = dhCreateJoint({ theta: 0, d: 0, a: 0.5, alpha: Math.PI / 2 }, 'revolute');
    const q1 = Math.PI / 6;
    const q2 = Math.PI / 3;

    const chainT = dhChainTransform([j1, j2], [q1, q2]);
    const T1 = dhTransform({ theta: q1, d: 0, a: 1, alpha: 0 });
    const T2 = dhTransform({ theta: q2, d: 0, a: 0.5, alpha: Math.PI / 2 });
    const productT = matMultiply(T1, T2);

    expectMatClose(chainT, productT);
  });

  it('prismatic joint varies d instead of theta', () => {
    const joint = dhCreateJoint({ theta: 0, d: 0, a: 0, alpha: 0 }, 'prismatic');
    const dVal = 2.5;
    const T = dhChainTransform([joint], [dVal]);

    // Should translate along Z by dVal
    expect(T.get(0, 3)).toBeCloseTo(0, 10);
    expect(T.get(1, 3)).toBeCloseTo(0, 10);
    expect(T.get(2, 3)).toBeCloseTo(dVal, 10);
  });

  it('throws when joint count mismatches value count', () => {
    const joints = twoLinkPlanar(1, 1);
    expect(() => dhChainTransform(joints, [0])).toThrow('does not match');
  });
});

describe('dhCreateJoint', () => {
  it('defaults to revolute joint type', () => {
    const joint = dhCreateJoint({ theta: 0, d: 0, a: 1, alpha: 0 });
    expect(joint.jointType).toBe('revolute');
  });

  it('accepts explicit prismatic type', () => {
    const joint = dhCreateJoint({ theta: 0, d: 0, a: 0, alpha: 0 }, 'prismatic');
    expect(joint.jointType).toBe('prismatic');
  });

  it('stores params correctly', () => {
    const params: DHParams = { theta: 0.1, d: 0.2, a: 0.3, alpha: 0.4 };
    const joint = dhCreateJoint(params);
    expect(joint.params.theta).toBe(0.1);
    expect(joint.params.d).toBe(0.2);
    expect(joint.params.a).toBe(0.3);
    expect(joint.params.alpha).toBe(0.4);
  });
});

describe('dhCreateChain', () => {
  it('returns correct numJoints', () => {
    const joints = twoLinkPlanar(1, 1);
    const chain = dhCreateChain(joints);
    expect(chain.numJoints).toBe(2);
  });

  it('stores joints array', () => {
    const joints = twoLinkPlanar(1, 1);
    const chain = dhCreateChain(joints);
    expect(chain.joints).toBe(joints);
    expect(chain.joints.length).toBe(2);
  });
});

describe('twoLinkPlanar', () => {
  it('returns two revolute joints with correct link lengths', () => {
    const joints = twoLinkPlanar(2.0, 1.5);
    expect(joints.length).toBe(2);
    expect(joints[0].jointType).toBe('revolute');
    expect(joints[1].jointType).toBe('revolute');
    expect(joints[0].params.a).toBe(2.0);
    expect(joints[1].params.a).toBe(1.5);
    expect(joints[0].params.alpha).toBe(0);
    expect(joints[1].params.alpha).toBe(0);
    expect(joints[0].params.d).toBe(0);
    expect(joints[1].params.d).toBe(0);
  });
});

describe('scara', () => {
  it('returns four joints with correct types', () => {
    const joints = scara(1.0, 0.5);
    expect(joints.length).toBe(4);
    expect(joints[0].jointType).toBe('revolute');
    expect(joints[1].jointType).toBe('revolute');
    expect(joints[2].jointType).toBe('prismatic');
    expect(joints[3].jointType).toBe('revolute');
  });

  it('has correct link lengths', () => {
    const joints = scara(1.0, 0.5);
    expect(joints[0].params.a).toBe(1.0);
    expect(joints[1].params.a).toBe(0.5);
    expect(joints[2].params.a).toBe(0);
    expect(joints[3].params.a).toBe(0);
  });

  it('joint 2 has alpha=π', () => {
    const joints = scara(1.0, 0.5);
    expect(joints[1].params.alpha).toBe(Math.PI);
  });

  it('SCARA at q=[0,0,0,0] end effector at (l1+l2, 0, 0)', () => {
    const joints = scara(1.0, 0.5);
    const T = dhChainTransform(joints, [0, 0, 0, 0]);
    expect(T.get(0, 3)).toBeCloseTo(1.5, 8);
    expect(T.get(1, 3)).toBeCloseTo(0, 8);
    expect(T.get(2, 3)).toBeCloseTo(0, 8);
  });

  it('SCARA prismatic joint extends along Z', () => {
    const joints = scara(1.0, 0.5);
    const T = dhChainTransform(joints, [0, 0, 0.3, 0]);
    // d variable on joint 3 (prismatic) shifts z
    expect(T.get(0, 3)).toBeCloseTo(1.5, 8);
    // alpha=π on joint 2 flips the Z axis, so prismatic d goes in -Z
    expect(T.get(2, 3)).toBeCloseTo(-0.3, 8);
  });
});
