import { describe, expect, it } from 'bun:test';
import { ccdSolve, DEFAULT_CCD_CONFIG } from './ccd.ts';
import { testChain2Link, testChain3Link } from './test-chains.ts';
import { fkPosition } from './forward-kinematics.ts';

describe('ccdSolve — 2-link planar', () => {
  const joints = testChain2Link(1, 1);

  it('reaches a reachable target', () => {
    const target: [number, number, number] = [1.5, 0.5, 0];
    const result = ccdSolve(joints, target, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(1e-4);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 3);
    expect(pos[1]).toBeCloseTo(target[1], 3);
  });

  it('reaches target in negative quadrant', () => {
    const target: [number, number, number] = [-0.5, -1.0, 0];
    const result = ccdSolve(joints, target, [Math.PI / 2, 0]);
    expect(result.converged).toBe(true);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 2);
    expect(pos[1]).toBeCloseTo(target[1], 2);
  });

  it('handles target at reach boundary', () => {
    const target: [number, number, number] = [1.9, 0, 0];
    const result = ccdSolve(joints, target, [0.1, -0.1]);
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(1e-3);
  });

  it('fails gracefully for unreachable target', () => {
    const target: [number, number, number] = [3, 0, 0];
    const config = { ...DEFAULT_CCD_CONFIG, maxIterations: 50 };
    const result = ccdSolve(joints, target, [0, 0], config);
    expect(result.converged).toBe(false);
  });

  it('returns correct joint angles count', () => {
    const result = ccdSolve(joints, [1, 1, 0], [0, 0]);
    expect(result.jointAngles.length).toBe(2);
  });

  it('throws for mismatched angles length', () => {
    expect(() => ccdSolve(joints, [1, 0, 0], [0])).toThrow('must match');
  });
});

describe('ccdSolve — 3-link spatial', () => {
  const joints = testChain3Link();

  it('reaches a 3D target', () => {
    const target: [number, number, number] = [0.5, 0.5, 0.8];
    const result = ccdSolve(joints, target, [0, 0.3, 0.3]);
    expect(result.converged).toBe(true);
    const pos = fkPosition(joints, result.jointAngles);
    expect(pos[0]).toBeCloseTo(target[0], 2);
    expect(pos[1]).toBeCloseTo(target[1], 2);
    expect(pos[2]).toBeCloseTo(target[2], 2);
  });

  it('converges from zero initial angles', () => {
    const target: [number, number, number] = [0.8, 0.3, 0.7];
    const result = ccdSolve(joints, target, [0, 0, 0]);
    expect(result.converged).toBe(true);
  });
});

describe('ccdSolve — FK round-trip', () => {
  it('recovers a configuration for 2-link', () => {
    const joints = testChain2Link(1, 0.5);
    const originalQ = [Math.PI / 4, -Math.PI / 6];
    const targetPos = fkPosition(joints, originalQ);
    const result = ccdSolve(joints, targetPos, [0, 0]);
    expect(result.converged).toBe(true);
    const recovered = fkPosition(joints, result.jointAngles);
    expect(recovered[0]).toBeCloseTo(targetPos[0], 3);
    expect(recovered[1]).toBeCloseTo(targetPos[1], 3);
  });
});

describe('ccdSolve — custom config', () => {
  const joints = testChain2Link(1, 1);

  it('tighter tolerance produces better accuracy', () => {
    const target: [number, number, number] = [1, 1, 0];
    const loose = ccdSolve(joints, target, [0, 0], { ...DEFAULT_CCD_CONFIG, tolerance: 1e-2 });
    const tight = ccdSolve(joints, target, [0, 0], { ...DEFAULT_CCD_CONFIG, tolerance: 1e-6 });
    expect(loose.converged).toBe(true);
    expect(tight.converged).toBe(true);
    expect(tight.positionError).toBeLessThan(loose.positionError + 1e-10);
  });

  it('max iterations limits computation', () => {
    const target: [number, number, number] = [1, 1, 0];
    const result = ccdSolve(joints, target, [0, 0], { ...DEFAULT_CCD_CONFIG, maxIterations: 3, tolerance: 1e-10 });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });
});
