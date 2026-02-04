import { describe, expect, it } from 'bun:test';
import {
  geometricJacobian,
  linearJacobian,
  angularJacobian,
} from './jacobian.ts';
import { fkPosition } from './forward-kinematics.ts';
import {
  testChain2Link,
  testChain3Link,
  testChainPuma560,
  testChainStanford,
} from './test-chains.ts';
import { dhCreateJoint } from './dh-parameters.ts';
import { Matrix } from './mat-ops.ts';

const TOL = 1e-6;
const DELTA = 1e-7;

/**
 * Numerical Jacobian via finite differences for cross-validation.
 * Only computes the 3×n linear (positional) part.
 */
function numericalLinearJacobian(
  joints: ReturnType<typeof testChain2Link>,
  q: number[],
  delta: number = DELTA,
): Matrix {
  const n = q.length;
  const data = new Array(3 * n);
  for (let i = 0; i < n; i++) {
    const qPlus = q.slice();
    const qMinus = q.slice();
    qPlus[i] += delta;
    qMinus[i] -= delta;
    const pPlus = fkPosition(joints, qPlus);
    const pMinus = fkPosition(joints, qMinus);
    data[0 * n + i] = (pPlus[0] - pMinus[0]) / (2 * delta);
    data[1 * n + i] = (pPlus[1] - pMinus[1]) / (2 * delta);
    data[2 * n + i] = (pPlus[2] - pMinus[2]) / (2 * delta);
  }
  return new Matrix(3, n, data);
}

describe('geometricJacobian — dimensions', () => {
  it('returns 6×2 for 2-link arm', () => {
    const J = geometricJacobian(testChain2Link(), [0, 0]);
    expect(J.rows).toBe(6);
    expect(J.cols).toBe(2);
  });

  it('returns 6×3 for 3-link arm', () => {
    const J = geometricJacobian(testChain3Link(), [0, 0, 0]);
    expect(J.rows).toBe(6);
    expect(J.cols).toBe(3);
  });

  it('returns 6×6 for PUMA 560', () => {
    const J = geometricJacobian(testChainPuma560(), [0, 0, 0, 0, 0, 0]);
    expect(J.rows).toBe(6);
    expect(J.cols).toBe(6);
  });

  it('returns 6×6 for Stanford arm', () => {
    const J = geometricJacobian(testChainStanford(), [0, 0, 0, 0, 0, 0]);
    expect(J.rows).toBe(6);
    expect(J.cols).toBe(6);
  });
});

describe('geometricJacobian — 2-link planar analytic cross-validation', () => {
  it('q=[0,0]: matches analytic Jacobian', () => {
    const l1 = 1, l2 = 0.5;
    const joints = testChain2Link(l1, l2);
    const J = geometricJacobian(joints, [0, 0]);

    // For 2-link planar at q=[0,0]:
    // J_linear = [[-l1*sin(q1)-l2*sin(q1+q2), -l2*sin(q1+q2)],
    //             [ l1*cos(q1)+l2*cos(q1+q2),  l2*cos(q1+q2)],
    //             [0, 0]]
    // At q=[0,0]: sin=0, cos=1
    // J_linear = [[0, 0], [l1+l2, l2], [0, 0]]
    expect(J.get(0, 0)).toBeCloseTo(0, 8);      // dx/dq1
    expect(J.get(0, 1)).toBeCloseTo(0, 8);      // dx/dq2
    expect(J.get(1, 0)).toBeCloseTo(l1 + l2, 8); // dy/dq1
    expect(J.get(1, 1)).toBeCloseTo(l2, 8);     // dy/dq2
    expect(J.get(2, 0)).toBeCloseTo(0, 8);      // dz/dq1
    expect(J.get(2, 1)).toBeCloseTo(0, 8);      // dz/dq2
  });

  it('q=[0,0]: angular part is pure z-axis rotation', () => {
    const joints = testChain2Link(1, 0.5);
    const J = geometricJacobian(joints, [0, 0]);
    // Both revolute joints rotate about Z: angular Jacobian = [[0,0],[0,0],[1,1]]
    expect(J.get(3, 0)).toBeCloseTo(0, 10); // omega_x
    expect(J.get(4, 0)).toBeCloseTo(0, 10); // omega_y
    expect(J.get(5, 0)).toBeCloseTo(1, 10); // omega_z for joint 1
    expect(J.get(5, 1)).toBeCloseTo(1, 10); // omega_z for joint 2
  });

  it('q=[π/2, 0]: matches analytic', () => {
    const l1 = 1, l2 = 0.5;
    const q1 = Math.PI / 2;
    const joints = testChain2Link(l1, l2);
    const J = geometricJacobian(joints, [q1, 0]);

    // J_linear at q=[π/2, 0]:
    // dx/dq1 = -l1*sin(q1) - l2*sin(q1+0) = -(l1+l2)*sin(q1) = -(l1+l2)
    // dy/dq1 = l1*cos(q1) + l2*cos(q1+0) = 0
    expect(J.get(0, 0)).toBeCloseTo(-(l1 + l2), 8);
    expect(J.get(1, 0)).toBeCloseTo(0, 8);
    expect(J.get(0, 1)).toBeCloseTo(-l2, 8);
    expect(J.get(1, 1)).toBeCloseTo(0, 8);
  });
});

describe('geometricJacobian — numerical cross-validation', () => {
  it('2-link planar at q=[π/4, -π/6]', () => {
    const joints = testChain2Link(1, 0.5);
    const q = [Math.PI / 4, -Math.PI / 6];
    const Jlin = linearJacobian(joints, q);
    const Jnum = numericalLinearJacobian(joints, q);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        expect(Jlin.get(r, c)).toBeCloseTo(Jnum.get(r, c), 5);
      }
    }
  });

  it('3-link spatial at q=[π/6, π/3, -π/4]', () => {
    const joints = testChain3Link();
    const q = [Math.PI / 6, Math.PI / 3, -Math.PI / 4];
    const Jlin = linearJacobian(joints, q);
    const Jnum = numericalLinearJacobian(joints, q);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(Jlin.get(r, c)).toBeCloseTo(Jnum.get(r, c), 4);
      }
    }
  });

  it('PUMA 560 at random config', () => {
    const joints = testChainPuma560();
    const q = [0.3, -0.5, 0.7, -0.1, 0.4, -0.2];
    const Jlin = linearJacobian(joints, q);
    const Jnum = numericalLinearJacobian(joints, q);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        expect(Jlin.get(r, c)).toBeCloseTo(Jnum.get(r, c), 4);
      }
    }
  });

  it('Stanford arm with prismatic extension', () => {
    const joints = testChainStanford();
    const q = [0.2, -0.3, 0.5, 0.1, -0.2, 0.4];
    const Jlin = linearJacobian(joints, q);
    const Jnum = numericalLinearJacobian(joints, q);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        expect(Jlin.get(r, c)).toBeCloseTo(Jnum.get(r, c), 4);
      }
    }
  });

  it('2-link planar at various configs', () => {
    const joints = testChain2Link(1.5, 0.8);
    const configs = [
      [0, 0],
      [Math.PI / 2, 0],
      [0, Math.PI / 2],
      [Math.PI / 3, -Math.PI / 4],
      [Math.PI, Math.PI / 6],
    ];
    for (const q of configs) {
      const Jlin = linearJacobian(joints, q);
      const Jnum = numericalLinearJacobian(joints, q);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          expect(Jlin.get(r, c)).toBeCloseTo(Jnum.get(r, c), 4);
        }
      }
    }
  });
});

describe('geometricJacobian — prismatic joint', () => {
  it('prismatic joint contributes z-axis to linear, zero to angular', () => {
    // Single prismatic joint along Z
    const joint = [dhCreateJoint({ theta: 0, d: 0, a: 0, alpha: 0 }, 'prismatic')];
    const J = geometricJacobian(joint, [0]);

    // z-axis of base frame is [0, 0, 1]
    expect(J.get(0, 0)).toBeCloseTo(0, 10); // linear x
    expect(J.get(1, 0)).toBeCloseTo(0, 10); // linear y
    expect(J.get(2, 0)).toBeCloseTo(1, 10); // linear z
    expect(J.get(3, 0)).toBeCloseTo(0, 10); // angular x
    expect(J.get(4, 0)).toBeCloseTo(0, 10); // angular y
    expect(J.get(5, 0)).toBeCloseTo(0, 10); // angular z
  });

  it('Stanford arm joint 3 (prismatic) has zero angular contribution', () => {
    const joints = testChainStanford();
    const J = geometricJacobian(joints, [0, 0, 0, 0, 0, 0]);
    // Joint 3 (column 2, 0-indexed) is prismatic
    expect(J.get(3, 2)).toBeCloseTo(0, 10);
    expect(J.get(4, 2)).toBeCloseTo(0, 10);
    expect(J.get(5, 2)).toBeCloseTo(0, 10);
  });
});

describe('geometricJacobian — singularity detection', () => {
  it('2-link fully extended: column 2 of linear Jacobian is parallel to column 1', () => {
    const l1 = 1, l2 = 1;
    const joints = testChain2Link(l1, l2);
    // q=[0,0]: fully extended along X
    const Jlin = linearJacobian(joints, [0, 0]);
    // Both columns should have zero x-component and positive y-component
    // (since both joints cause y-motion at this config)
    expect(Jlin.get(0, 0)).toBeCloseTo(0, 8);
    expect(Jlin.get(0, 1)).toBeCloseTo(0, 8);
    // Column 1: [0, l1+l2, 0], Column 2: [0, l2, 0] — these are parallel (both along y)
    // This is a singularity
    const ratio = Jlin.get(1, 0) / Jlin.get(1, 1);
    expect(ratio).toBeCloseTo((l1 + l2) / l2, 8);
  });
});

describe('linearJacobian', () => {
  it('returns 3×n matrix', () => {
    const Jlin = linearJacobian(testChain2Link(), [0, 0]);
    expect(Jlin.rows).toBe(3);
    expect(Jlin.cols).toBe(2);
  });

  it('matches top 3 rows of geometric Jacobian', () => {
    const joints = testChain3Link();
    const q = [0.5, -0.3, 0.7];
    const J = geometricJacobian(joints, q);
    const Jlin = linearJacobian(joints, q);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(Jlin.get(r, c)).toBeCloseTo(J.get(r, c), 10);
      }
    }
  });
});

describe('angularJacobian', () => {
  it('returns 3×n matrix', () => {
    const Jang = angularJacobian(testChain2Link(), [0, 0]);
    expect(Jang.rows).toBe(3);
    expect(Jang.cols).toBe(2);
  });

  it('matches bottom 3 rows of geometric Jacobian', () => {
    const joints = testChain3Link();
    const q = [0.5, -0.3, 0.7];
    const J = geometricJacobian(joints, q);
    const Jang = angularJacobian(joints, q);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(Jang.get(r, c)).toBeCloseTo(J.get(r + 3, c), 10);
      }
    }
  });

  it('all-revolute planar: angular columns are all [0,0,1]', () => {
    const joints = testChain2Link();
    const Jang = angularJacobian(joints, [Math.PI / 4, -Math.PI / 3]);
    for (let c = 0; c < 2; c++) {
      expect(Jang.get(0, c)).toBeCloseTo(0, 10);
      expect(Jang.get(1, c)).toBeCloseTo(0, 10);
      expect(Jang.get(2, c)).toBeCloseTo(1, 10);
    }
  });
});

describe('geometricJacobian — velocity mapping', () => {
  it('Jacobian * dq approximates dp/dt for small dq', () => {
    const joints = testChain2Link(1, 0.5);
    const q = [Math.PI / 4, -Math.PI / 6];
    const dq = [0.001, -0.002];

    // Predict position change via Jacobian
    const Jlin = linearJacobian(joints, q);
    const dpPred = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        dpPred[r] += Jlin.get(r, c) * dq[c];
      }
    }

    // Actual position change
    const p0 = fkPosition(joints, q);
    const p1 = fkPosition(joints, [q[0] + dq[0], q[1] + dq[1]]);
    const dpActual = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];

    for (let r = 0; r < 3; r++) {
      expect(dpPred[r]).toBeCloseTo(dpActual[r], 5);
    }
  });
});
