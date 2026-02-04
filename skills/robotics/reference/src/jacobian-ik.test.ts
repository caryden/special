import { describe, expect, it } from 'bun:test';
import {
  jacobianIK,
  jacobianIKWithLimits,
  DEFAULT_JACOBIAN_IK_CONFIG,
} from './jacobian-ik.ts';
import { testChain2Link, testChain3Link, testChainPuma560 } from './test-chains.ts';
import { fkPosition } from './forward-kinematics.ts';

describe('jacobianIK — 2-link planar', () => {
  const l1 = 1, l2 = 1;
  const joints = testChain2Link(l1, l2);

  it('reaches a reachable target', () => {
    const target: [number, number, number] = [1.5, 0.5, 0];
    const result = jacobianIK(joints, target, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(1e-4);
    // Verify FK matches
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 3);
    expect(pos[1]).toBeCloseTo(target[1], 3);
  });

  it('reaches target at full extension', () => {
    const target: [number, number, number] = [1.9, 0, 0];
    const result = jacobianIK(joints, target, [0.1, -0.1]);
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(1e-3);
  });

  it('reaches target in negative quadrant', () => {
    const target: [number, number, number] = [-0.5, -1.0, 0];
    const result = jacobianIK(joints, target, [Math.PI / 2, 0]);
    expect(result.converged).toBe(true);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 3);
    expect(pos[1]).toBeCloseTo(target[1], 3);
  });

  it('fails gracefully for unreachable target', () => {
    const target: [number, number, number] = [3, 0, 0]; // beyond reach (l1+l2=2)
    const result = jacobianIK(joints, target, [0, 0], { ...DEFAULT_JACOBIAN_IK_CONFIG, maxIterations: 50 });
    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(50);
  });

  it('returns correct iteration count on convergence', () => {
    const target: [number, number, number] = [1, 1, 0];
    const result = jacobianIK(joints, target, [0.5, 0.5]);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.iterations).toBeLessThan(100);
  });

  it('throws for mismatched initial angles length', () => {
    expect(() => jacobianIK(joints, [1, 0, 0], [0])).toThrow('must match');
  });

  it('converges from various initial guesses', () => {
    const target: [number, number, number] = [0.7, 0.7, 0];
    const guesses = [[0, 0], [1, -1], [Math.PI / 4, Math.PI / 4], [-0.5, 0.5]];
    for (const guess of guesses) {
      const result = jacobianIK(joints, target, guess);
      expect(result.converged).toBe(true);
      expect(result.positionError).toBeLessThan(1e-3);
    }
  });
});

describe('jacobianIK — 3-link spatial', () => {
  const joints = testChain3Link();

  it('reaches a 3D target', () => {
    const target: [number, number, number] = [0.5, 0.5, 0.8];
    const result = jacobianIK(joints, target, [0, 0.3, 0.3]);
    expect(result.converged).toBe(true);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 2);
    expect(pos[1]).toBeCloseTo(target[1], 2);
    expect(pos[2]).toBeCloseTo(target[2], 2);
  });
});

describe('jacobianIK — custom config', () => {
  const joints = testChain2Link(1, 1);

  it('higher damping still converges (slower)', () => {
    const target: [number, number, number] = [1, 1, 0];
    const config = { ...DEFAULT_JACOBIAN_IK_CONFIG, damping: 0.5 };
    const result = jacobianIK(joints, target, [0, 0], config);
    expect(result.converged).toBe(true);
  });

  it('smaller step size converges with more iterations', () => {
    const target: [number, number, number] = [1, 1, 0];
    const full = jacobianIK(joints, target, [0, 0], { ...DEFAULT_JACOBIAN_IK_CONFIG, stepSize: 1.0 });
    const half = jacobianIK(joints, target, [0, 0], { ...DEFAULT_JACOBIAN_IK_CONFIG, stepSize: 0.5 });
    expect(full.converged).toBe(true);
    expect(half.converged).toBe(true);
    expect(half.iterations).toBeGreaterThan(full.iterations);
  });

  it('tighter tolerance requires more iterations', () => {
    const target: [number, number, number] = [1, 1, 0];
    const loose = jacobianIK(joints, target, [0, 0], { ...DEFAULT_JACOBIAN_IK_CONFIG, tolerance: 1e-2 });
    const tight = jacobianIK(joints, target, [0, 0], { ...DEFAULT_JACOBIAN_IK_CONFIG, tolerance: 1e-6 });
    expect(loose.converged).toBe(true);
    expect(tight.converged).toBe(true);
    expect(tight.iterations).toBeGreaterThanOrEqual(loose.iterations);
  });
});

describe('jacobianIKWithLimits', () => {
  const joints = testChain2Link(1, 1);

  it('converges within joint limits', () => {
    const target: [number, number, number] = [1, 1, 0];
    const limits: [number, number][] = [[-Math.PI, Math.PI], [-Math.PI, Math.PI]];
    const config = { ...DEFAULT_JACOBIAN_IK_CONFIG, maxIterations: 200 };
    const result = jacobianIKWithLimits(joints, target, [0.5, 0.5], limits, config);
    expect(result.converged).toBe(true);
    expect(result.jointAngles[0]).toBeGreaterThanOrEqual(-Math.PI);
    expect(result.jointAngles[0]).toBeLessThanOrEqual(Math.PI);
  });

  it('respects tight joint limits', () => {
    const target: [number, number, number] = [1, 1, 0];
    const limits: [number, number][] = [[0, Math.PI / 2], [-Math.PI / 2, 0]];
    const result = jacobianIKWithLimits(joints, target, [0.3, -0.3], limits);
    // Whether it converges or not, angles must respect limits
    expect(result.jointAngles[0]).toBeGreaterThanOrEqual(limits[0][0] - 1e-10);
    expect(result.jointAngles[0]).toBeLessThanOrEqual(limits[0][1] + 1e-10);
    expect(result.jointAngles[1]).toBeGreaterThanOrEqual(limits[1][0] - 1e-10);
    expect(result.jointAngles[1]).toBeLessThanOrEqual(limits[1][1] + 1e-10);
  });

  it('throws for mismatched limits length', () => {
    expect(() => jacobianIKWithLimits(joints, [1, 0, 0], [0, 0], [[0, 1]])).toThrow('must match');
  });

  it('clamps initial angles to limits', () => {
    const target: [number, number, number] = [1, 0.5, 0];
    const limits: [number, number][] = [[0, 1], [0, 1]];
    const result = jacobianIKWithLimits(joints, target, [-5, 5], limits);
    // Initial angles should have been clamped; solution should respect limits
    expect(result.jointAngles[0]).toBeGreaterThanOrEqual(0 - 1e-10);
    expect(result.jointAngles[1]).toBeLessThanOrEqual(1 + 1e-10);
  });
});

describe('jacobianIK — FK round-trip', () => {
  it('recovers joint angles from FK output for 2-link', () => {
    const joints = testChain2Link(1, 0.5);
    const originalQ = [Math.PI / 4, -Math.PI / 6];
    const targetPos = fkPosition(joints, originalQ);
    const result = jacobianIK(joints, targetPos, [0, 0]);
    expect(result.converged).toBe(true);
    // FK of recovered angles should match target
    const recovered = fkPosition(joints, result.jointAngles);
    expect(recovered[0]).toBeCloseTo(targetPos[0], 3);
    expect(recovered[1]).toBeCloseTo(targetPos[1], 3);
  });
});
