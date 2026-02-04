import { describe, expect, it } from 'bun:test';
import { solveIK, type IKMethod } from './solve-ik.ts';
import { twoLinkPlanar } from './dh-parameters.ts';
import { fkPosition } from './forward-kinematics.ts';

const joints = twoLinkPlanar(1, 1);

describe('solveIK — method routing', () => {
  const target: [number, number, number] = [1.0, 1.0, 0];
  const initial = [0.5, 0.5];

  it('defaults to jacobian method', () => {
    const result = solveIK(joints, target, initial);
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(0.01);
  });

  const methods: IKMethod[] = ['jacobian', 'ccd', 'fabrik'];
  for (const method of methods) {
    it(`solves with method=${method}`, () => {
      const result = solveIK(joints, target, initial, { method });
      expect(result.converged).toBe(true);
      expect(result.positionError).toBeLessThan(0.01);
    });
  }
});

describe('solveIK — FK round-trip', () => {
  it('jacobian result matches FK', () => {
    const target: [number, number, number] = [1.2, 0.8, 0];
    const result = solveIK(joints, target, [0.5, 0.5], { method: 'jacobian' });
    expect(result.converged).toBe(true);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 2);
    expect(pos[1]).toBeCloseTo(target[1], 2);
  });

  it('ccd result matches FK', () => {
    const target: [number, number, number] = [1.2, 0.8, 0];
    const result = solveIK(joints, target, [0.5, 0.5], { method: 'ccd' });
    expect(result.converged).toBe(true);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 2);
    expect(pos[1]).toBeCloseTo(target[1], 2);
  });
});

describe('solveIK — options passthrough', () => {
  it('passes maxIterations to solver', () => {
    // Very low iterations should not converge for a hard target
    const target: [number, number, number] = [1.5, 0.5, 0];
    const result = solveIK(joints, target, [0, 0], {
      method: 'jacobian',
      maxIterations: 1,
    });
    // 1 iteration is likely not enough
    expect(result.iterations).toBeLessThanOrEqual(1);
  });

  it('passes tolerance to solver', () => {
    const target: [number, number, number] = [1.0, 1.0, 0];
    const result = solveIK(joints, target, [0.5, 0.5], {
      method: 'jacobian',
      tolerance: 0.1,
    });
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(0.1);
  });

  it('passes damping to jacobian solver', () => {
    const target: [number, number, number] = [1.0, 1.0, 0];
    const result = solveIK(joints, target, [0.5, 0.5], {
      method: 'jacobian',
      damping: 0.1,
    });
    expect(result.converged).toBe(true);
  });
});

describe('solveIK — unreachable target', () => {
  it('does not converge for far target', () => {
    const target: [number, number, number] = [5, 5, 0];
    const result = solveIK(joints, target, [0, 0], {
      method: 'jacobian',
      maxIterations: 50,
    });
    expect(result.converged).toBe(false);
    expect(result.positionError).toBeGreaterThan(0.1);
  });
});
