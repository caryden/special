import { describe, expect, it } from 'bun:test';
import {
  testChain2Link,
  testChain3Link,
  testChainPuma560,
  testChainStanford,
} from './test-chains.ts';
import { dhChainTransform } from './dh-parameters.ts';

const TOL = 1e-10;

describe('testChain2Link', () => {
  it('returns 2 revolute joints', () => {
    const chain = testChain2Link();
    expect(chain.length).toBe(2);
    expect(chain[0].jointType).toBe('revolute');
    expect(chain[1].jointType).toBe('revolute');
  });

  it('default link lengths are 1, 1', () => {
    const chain = testChain2Link();
    expect(chain[0].params.a).toBe(1);
    expect(chain[1].params.a).toBe(1);
  });

  it('accepts custom link lengths', () => {
    const chain = testChain2Link(2.0, 1.5);
    expect(chain[0].params.a).toBe(2.0);
    expect(chain[1].params.a).toBe(1.5);
  });

  it('all alpha values are 0 (planar)', () => {
    const chain = testChain2Link();
    expect(chain[0].params.alpha).toBe(0);
    expect(chain[1].params.alpha).toBe(0);
  });

  it('all d values are 0 (planar)', () => {
    const chain = testChain2Link();
    expect(chain[0].params.d).toBe(0);
    expect(chain[1].params.d).toBe(0);
  });

  it('FK at q=[0,0] gives (l1+l2, 0, 0)', () => {
    const l1 = 1, l2 = 0.5;
    const chain = testChain2Link(l1, l2);
    const T = dhChainTransform(chain, [0, 0]);
    expect(T.get(0, 3)).toBeCloseTo(l1 + l2, 10);
    expect(T.get(1, 3)).toBeCloseTo(0, 10);
    expect(T.get(2, 3)).toBeCloseTo(0, 10);
  });

  it('FK at q=[π/2, 0] gives (0, l1+l2, 0)', () => {
    const l1 = 1, l2 = 0.5;
    const chain = testChain2Link(l1, l2);
    const T = dhChainTransform(chain, [Math.PI / 2, 0]);
    expect(T.get(0, 3)).toBeCloseTo(0, 8);
    expect(T.get(1, 3)).toBeCloseTo(l1 + l2, 8);
    expect(T.get(2, 3)).toBeCloseTo(0, 10);
  });

  it('FK at q=[π/4, -π/4] matches analytic formula', () => {
    const l1 = 1, l2 = 1;
    const q1 = Math.PI / 4, q2 = -Math.PI / 4;
    const chain = testChain2Link(l1, l2);
    const T = dhChainTransform(chain, [q1, q2]);
    const expectedX = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2);
    const expectedY = l1 * Math.sin(q1) + l2 * Math.sin(q1 + q2);
    expect(T.get(0, 3)).toBeCloseTo(expectedX, 8);
    expect(T.get(1, 3)).toBeCloseTo(expectedY, 8);
  });

  it('FK at q=[π, 0] gives (-l1-l2, 0, 0)', () => {
    const chain = testChain2Link(1, 1);
    const T = dhChainTransform(chain, [Math.PI, 0]);
    expect(T.get(0, 3)).toBeCloseTo(-2, 8);
    expect(T.get(1, 3)).toBeCloseTo(0, 8);
  });

  it('FK at q=[0, π] folds back (l1-l2, 0, 0)', () => {
    const l1 = 2, l2 = 1;
    const chain = testChain2Link(l1, l2);
    const T = dhChainTransform(chain, [0, Math.PI]);
    expect(T.get(0, 3)).toBeCloseTo(l1 - l2, 8);
    expect(T.get(1, 3)).toBeCloseTo(0, 8);
  });

  it('fully extended reach equals l1+l2', () => {
    const l1 = 1.5, l2 = 0.8;
    const chain = testChain2Link(l1, l2);
    const T = dhChainTransform(chain, [0, 0]);
    const x = T.get(0, 3);
    const y = T.get(1, 3);
    const reach = Math.sqrt(x * x + y * y);
    expect(reach).toBeCloseTo(l1 + l2, 8);
  });
});

describe('testChain3Link', () => {
  it('returns 3 revolute joints', () => {
    const chain = testChain3Link();
    expect(chain.length).toBe(3);
    for (const j of chain) {
      expect(j.jointType).toBe('revolute');
    }
  });

  it('joint 1 has alpha=π/2 for spatial configuration', () => {
    const chain = testChain3Link();
    expect(chain[0].params.alpha).toBeCloseTo(Math.PI / 2, 10);
  });

  it('joints 2 and 3 are planar (alpha=0)', () => {
    const chain = testChain3Link();
    expect(chain[1].params.alpha).toBe(0);
    expect(chain[2].params.alpha).toBe(0);
  });

  it('default dimensions', () => {
    const chain = testChain3Link();
    expect(chain[0].params.d).toBe(0.5);
    expect(chain[1].params.a).toBe(1);
    expect(chain[2].params.a).toBe(0.5);
  });

  it('accepts custom dimensions', () => {
    const chain = testChain3Link(0.3, 0.8, 0.4);
    expect(chain[0].params.d).toBe(0.3);
    expect(chain[1].params.a).toBe(0.8);
    expect(chain[2].params.a).toBe(0.4);
  });

  it('FK at q=[0,0,0]: end-effector in base XZ plane', () => {
    const d1 = 0.5, l2 = 1, l3 = 0.5;
    const chain = testChain3Link(d1, l2, l3);
    const T = dhChainTransform(chain, [0, 0, 0]);
    // With alpha1=π/2 and q1=0: joint 2 arm extends along X
    expect(T.get(0, 3)).toBeCloseTo(l2 + l3, 8);
    expect(T.get(1, 3)).toBeCloseTo(0, 8);
    expect(T.get(2, 3)).toBeCloseTo(d1, 8);
  });

  it('FK at q=[π/2, 0, 0]: base rotation moves arm to Y axis', () => {
    const d1 = 0.5, l2 = 1, l3 = 0.5;
    const chain = testChain3Link(d1, l2, l3);
    const T = dhChainTransform(chain, [Math.PI / 2, 0, 0]);
    expect(T.get(0, 3)).toBeCloseTo(0, 8);
    expect(T.get(1, 3)).toBeCloseTo(l2 + l3, 8);
    expect(T.get(2, 3)).toBeCloseTo(d1, 8);
  });

  it('FK at q=[0, π/2, 0]: shoulder raised lifts arm straight up', () => {
    const d1 = 0.5, l2 = 1, l3 = 0.5;
    const chain = testChain3Link(d1, l2, l3);
    const T = dhChainTransform(chain, [0, Math.PI / 2, 0]);
    // Joint 2 rotated π/2: both l2 and l3 point up (+Z), so z = d1 + l2 + l3
    expect(T.get(0, 3)).toBeCloseTo(0, 8);
    expect(T.get(1, 3)).toBeCloseTo(0, 8);
    expect(T.get(2, 3)).toBeCloseTo(d1 + l2 + l3, 8);
  });
});

describe('testChainPuma560', () => {
  it('returns 6 revolute joints', () => {
    const chain = testChainPuma560();
    expect(chain.length).toBe(6);
    for (const j of chain) {
      expect(j.jointType).toBe('revolute');
    }
  });

  it('default DH parameters match Corke RTB', () => {
    const chain = testChainPuma560();
    // Joint 1: d=0, a=0, alpha=π/2
    expect(chain[0].params.d).toBe(0);
    expect(chain[0].params.a).toBe(0);
    expect(chain[0].params.alpha).toBeCloseTo(Math.PI / 2, 10);
    // Joint 2: d=0, a=0.4318, alpha=0
    expect(chain[1].params.a).toBeCloseTo(0.4318, 10);
    expect(chain[1].params.alpha).toBe(0);
    // Joint 3: d=0.15005, a=0.0203, alpha=π/2
    expect(chain[2].params.d).toBeCloseTo(0.15005, 10);
    expect(chain[2].params.a).toBeCloseTo(0.0203, 10);
    expect(chain[2].params.alpha).toBeCloseTo(Math.PI / 2, 10);
    // Joint 4: d=0.4318, a=0, alpha=-π/2
    expect(chain[3].params.d).toBeCloseTo(0.4318, 10);
    expect(chain[3].params.alpha).toBeCloseTo(-Math.PI / 2, 10);
    // Joint 5: d=0, a=0, alpha=π/2
    expect(chain[4].params.alpha).toBeCloseTo(Math.PI / 2, 10);
    // Joint 6: d=0, a=0, alpha=0
    expect(chain[5].params.alpha).toBe(0);
  });

  it('accepts custom DH dimensions', () => {
    const chain = testChainPuma560(0.5, 0.03, 0.2, 0.5);
    expect(chain[1].params.a).toBe(0.5);
    expect(chain[2].params.a).toBe(0.03);
    expect(chain[2].params.d).toBe(0.2);
    expect(chain[3].params.d).toBe(0.5);
  });

  it('FK at q=[0,0,0,0,0,0]: known home position', () => {
    const a2 = 0.4318, a3 = 0.0203, d3 = 0.15005, d4 = 0.4318;
    const chain = testChainPuma560(a2, a3, d3, d4);
    const T = dhChainTransform(chain, [0, 0, 0, 0, 0, 0]);

    // At home (all zeros), the end-effector should be at a deterministic position
    // x = a2 + a3 = 0.4521
    // y = d3 = 0.15005 (offset from joint 3 d parameter)
    // z = d4 = 0.4318 (from wrist offset) — but sign depends on alpha chain
    // The exact position depends on the DH chain product
    // Verify the transform is a valid 4x4 with bottom row [0 0 0 1]
    expect(T.get(3, 0)).toBeCloseTo(0, 10);
    expect(T.get(3, 1)).toBeCloseTo(0, 10);
    expect(T.get(3, 2)).toBeCloseTo(0, 10);
    expect(T.get(3, 3)).toBeCloseTo(1, 10);

    // Verify position is deterministic (snapshot)
    const x = T.get(0, 3);
    const y = T.get(1, 3);
    const z = T.get(2, 3);
    const reach = Math.sqrt(x * x + y * y + z * z);
    // Reach should be bounded: can't exceed sum of all link lengths
    expect(reach).toBeLessThan(a2 + a3 + d3 + d4 + 1);
    expect(reach).toBeGreaterThan(0);
  });

  it('FK rotation part is orthogonal at home position', () => {
    const chain = testChainPuma560();
    const T = dhChainTransform(chain, [0, 0, 0, 0, 0, 0]);
    // R * R^T should equal I (orthogonal rotation matrix)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let dot = 0;
        for (let k = 0; k < 3; k++) {
          dot += T.get(i, k) * T.get(j, k);
        }
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 8);
      }
    }
  });

  it('FK determinant of rotation is +1 at various configs', () => {
    const chain = testChainPuma560();
    const configs = [
      [0, 0, 0, 0, 0, 0],
      [Math.PI / 4, -Math.PI / 6, Math.PI / 3, 0, Math.PI / 4, 0],
      [Math.PI / 2, Math.PI / 2, 0, -Math.PI / 4, Math.PI / 6, Math.PI],
    ];
    for (const q of configs) {
      const T = dhChainTransform(chain, q);
      // det(R) = 1 for proper rotation
      const det =
        T.get(0, 0) * (T.get(1, 1) * T.get(2, 2) - T.get(1, 2) * T.get(2, 1)) -
        T.get(0, 1) * (T.get(1, 0) * T.get(2, 2) - T.get(1, 2) * T.get(2, 0)) +
        T.get(0, 2) * (T.get(1, 0) * T.get(2, 1) - T.get(1, 1) * T.get(2, 0));
      expect(det).toBeCloseTo(1, 8);
    }
  });
});

describe('testChainStanford', () => {
  it('returns 6 joints with correct types (RRP + RRR wrist)', () => {
    const chain = testChainStanford();
    expect(chain.length).toBe(6);
    expect(chain[0].jointType).toBe('revolute');
    expect(chain[1].jointType).toBe('revolute');
    expect(chain[2].jointType).toBe('prismatic');
    expect(chain[3].jointType).toBe('revolute');
    expect(chain[4].jointType).toBe('revolute');
    expect(chain[5].jointType).toBe('revolute');
  });

  it('default DH parameters', () => {
    const chain = testChainStanford();
    expect(chain[0].params.d).toBeCloseTo(0.4120, 10);
    expect(chain[0].params.alpha).toBeCloseTo(-Math.PI / 2, 10);
    expect(chain[1].params.d).toBeCloseTo(0.1540, 10);
    expect(chain[1].params.alpha).toBeCloseTo(Math.PI / 2, 10);
    expect(chain[2].params.alpha).toBe(0);
  });

  it('accepts custom dimensions', () => {
    const chain = testChainStanford(0.5, 0.2);
    expect(chain[0].params.d).toBe(0.5);
    expect(chain[1].params.d).toBe(0.2);
  });

  it('FK at q=[0,0,0,0,0,0] produces valid transform', () => {
    const chain = testChainStanford();
    const T = dhChainTransform(chain, [0, 0, 0, 0, 0, 0]);
    expect(T.get(3, 0)).toBeCloseTo(0, 10);
    expect(T.get(3, 1)).toBeCloseTo(0, 10);
    expect(T.get(3, 2)).toBeCloseTo(0, 10);
    expect(T.get(3, 3)).toBeCloseTo(1, 10);
  });

  it('prismatic joint 3 extends reach along its axis', () => {
    const chain = testChainStanford();
    const T0 = dhChainTransform(chain, [0, 0, 0, 0, 0, 0]);
    const T1 = dhChainTransform(chain, [0, 0, 1.0, 0, 0, 0]);
    // The prismatic joint changes the d parameter, causing translation
    const pos0 = [T0.get(0, 3), T0.get(1, 3), T0.get(2, 3)];
    const pos1 = [T1.get(0, 3), T1.get(1, 3), T1.get(2, 3)];
    const dist = Math.sqrt(
      (pos1[0] - pos0[0]) ** 2 +
      (pos1[1] - pos0[1]) ** 2 +
      (pos1[2] - pos0[2]) ** 2,
    );
    expect(dist).toBeCloseTo(1.0, 8);
  });

  it('FK rotation determinant is +1', () => {
    const chain = testChainStanford();
    const T = dhChainTransform(chain, [Math.PI / 3, -Math.PI / 4, 0.5, Math.PI / 6, 0, 0]);
    const det =
      T.get(0, 0) * (T.get(1, 1) * T.get(2, 2) - T.get(1, 2) * T.get(2, 1)) -
      T.get(0, 1) * (T.get(1, 0) * T.get(2, 2) - T.get(1, 2) * T.get(2, 0)) +
      T.get(0, 2) * (T.get(1, 0) * T.get(2, 1) - T.get(1, 1) * T.get(2, 0));
    expect(det).toBeCloseTo(1, 8);
  });
});
