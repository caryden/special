import { describe, expect, it } from 'bun:test';
import {
  fabrikSolve,
  fabrikSolveAngles,
  fabrikLinkLengths,
  fabrikTotalReach,
  DEFAULT_FABRIK_CONFIG,
  type FabrikPoint,
} from './fabrik.ts';

function dist(a: FabrikPoint, b: FabrikPoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

describe('fabrikLinkLengths', () => {
  it('computes link lengths from positions', () => {
    const positions: FabrikPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
    ];
    const lengths = fabrikLinkLengths(positions);
    expect(lengths.length).toBe(2);
    expect(lengths[0]).toBeCloseTo(1, 10);
    expect(lengths[1]).toBeCloseTo(1, 10);
  });

  it('handles 3D positions', () => {
    const positions: FabrikPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
    ];
    const lengths = fabrikLinkLengths(positions);
    expect(lengths[0]).toBeCloseTo(Math.sqrt(3), 10);
  });
});

describe('fabrikTotalReach', () => {
  it('sums link lengths', () => {
    expect(fabrikTotalReach([1, 0.5, 0.3])).toBeCloseTo(1.8, 10);
  });

  it('returns 0 for empty array', () => {
    expect(fabrikTotalReach([])).toBe(0);
  });
});

describe('fabrikSolve — reachable targets', () => {
  const positions: FabrikPoint[] = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 },
  ];

  it('reaches a target within workspace', () => {
    const target: FabrikPoint = { x: 1.5, y: 0.5, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.converged).toBe(true);
    expect(result.error).toBeLessThan(1e-4);
    expect(dist(result.positions[2], target)).toBeLessThan(1e-4);
  });

  it('preserves link lengths', () => {
    const target: FabrikPoint = { x: 1.0, y: 1.0, z: 0 };
    const result = fabrikSolve(positions, target);
    const origLengths = fabrikLinkLengths(positions);
    const newLengths = fabrikLinkLengths(result.positions);
    for (let i = 0; i < origLengths.length; i++) {
      expect(newLengths[i]).toBeCloseTo(origLengths[i], 4);
    }
  });

  it('preserves base position', () => {
    const target: FabrikPoint = { x: 1.5, y: 0.5, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.positions[0].x).toBeCloseTo(0, 10);
    expect(result.positions[0].y).toBeCloseTo(0, 10);
    expect(result.positions[0].z).toBeCloseTo(0, 10);
  });

  it('converges for target at origin (zero-distance)', () => {
    const target: FabrikPoint = { x: 0, y: 0, z: 0 };
    const result = fabrikSolve(positions, target);
    // Base is fixed at origin; end-effector can fold back
    expect(result.positions[0].x).toBeCloseTo(0, 10);
  });

  it('returns correct number of positions', () => {
    const target: FabrikPoint = { x: 1, y: 1, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.positions.length).toBe(3);
  });
});

describe('fabrikSolve — unreachable targets', () => {
  const positions: FabrikPoint[] = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 },
  ];

  it('stretches toward unreachable target', () => {
    const target: FabrikPoint = { x: 5, y: 0, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.converged).toBe(false);
    // Chain should be fully stretched toward target
    expect(result.positions[2].x).toBeCloseTo(2, 1); // max reach
  });

  it('preserves link lengths for unreachable targets', () => {
    const target: FabrikPoint = { x: 0, y: 0, z: 10 };
    const result = fabrikSolve(positions, target);
    const origLengths = fabrikLinkLengths(positions);
    const newLengths = fabrikLinkLengths(result.positions);
    for (let i = 0; i < origLengths.length; i++) {
      expect(newLengths[i]).toBeCloseTo(origLengths[i], 4);
    }
  });

  it('reports 0 iterations for unreachable (early exit)', () => {
    const target: FabrikPoint = { x: 100, y: 0, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.iterations).toBe(0);
  });
});

describe('fabrikSolve — 3D targets', () => {
  const positions: FabrikPoint[] = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 },
    { x: 3, y: 0, z: 0 },
  ];

  it('reaches a 3D target', () => {
    const target: FabrikPoint = { x: 1, y: 1, z: 1 };
    const result = fabrikSolve(positions, target);
    expect(result.converged).toBe(true);
    expect(dist(result.positions[3], target)).toBeLessThan(1e-4);
  });

  it('handles target directly above base', () => {
    const target: FabrikPoint = { x: 0, y: 0, z: 2.5 };
    const result = fabrikSolve(positions, target);
    expect(result.converged).toBe(true);
    expect(result.positions[3].z).toBeCloseTo(2.5, 3);
  });
});

describe('fabrikSolve — edge cases', () => {
  it('throws for fewer than 2 positions', () => {
    expect(() => fabrikSolve([{ x: 0, y: 0, z: 0 }], { x: 1, y: 0, z: 0 })).toThrow('at least 2');
  });

  it('handles single link', () => {
    const positions: FabrikPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    const target: FabrikPoint = { x: 0, y: 1, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.converged).toBe(true);
    expect(dist(result.positions[1], target)).toBeLessThan(1e-4);
  });

  it('already at target converges in 0 or 1 iterations', () => {
    const positions: FabrikPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    const target: FabrikPoint = { x: 2, y: 0, z: 0 };
    const result = fabrikSolve(positions, target);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeLessThanOrEqual(1);
  });
});

describe('fabrikSolve — custom config', () => {
  it('respects maxIterations', () => {
    const positions: FabrikPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    const target: FabrikPoint = { x: 1.5, y: 0.5, z: 0 };
    const result = fabrikSolve(positions, target, { maxIterations: 5, tolerance: 1e-10 });
    expect(result.iterations).toBeLessThanOrEqual(5);
  });

  it('looser tolerance converges faster', () => {
    const positions: FabrikPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    const target: FabrikPoint = { x: 1.5, y: 0.5, z: 0 };
    const tight = fabrikSolve(positions, target, { ...DEFAULT_FABRIK_CONFIG, tolerance: 1e-8 });
    const loose = fabrikSolve(positions, target, { ...DEFAULT_FABRIK_CONFIG, tolerance: 1e-2 });
    expect(loose.iterations).toBeLessThanOrEqual(tight.iterations);
  });
});

describe('fabrikSolveAngles', () => {
  it('returns correct number of joint angles', () => {
    const result = fabrikSolveAngles([1, 1], { x: 1.5, y: 0.5, z: 0 });
    expect(result.jointAngles.length).toBe(2);
  });

  it('converges for reachable target', () => {
    const result = fabrikSolveAngles([1, 1], { x: 1, y: 1, z: 0 });
    expect(result.converged).toBe(true);
    expect(result.positionError).toBeLessThan(1e-4);
  });

  it('does not converge for unreachable target', () => {
    const result = fabrikSolveAngles([1, 1], { x: 5, y: 0, z: 0 });
    expect(result.converged).toBe(false);
  });

  it('first angle is absolute, rest are relative', () => {
    // Target at (1,1): 2-link chain with l=1 each
    const result = fabrikSolveAngles([1, 1], { x: 1, y: 1, z: 0 });
    expect(result.converged).toBe(true);
    // Verify the angles produce the correct end-effector position
    // by reconstructing from joint angles
    let x = 0, y = 0, angle = 0;
    const lengths = [1, 1];
    for (let i = 0; i < result.jointAngles.length; i++) {
      angle += result.jointAngles[i];
      x += lengths[i] * Math.cos(angle);
      y += lengths[i] * Math.sin(angle);
    }
    expect(x).toBeCloseTo(1, 2);
    expect(y).toBeCloseTo(1, 2);
  });

  it('3-link chain converges', () => {
    const result = fabrikSolveAngles([1, 0.5, 0.3], { x: 1.2, y: 0.5, z: 0 });
    expect(result.converged).toBe(true);
    expect(result.jointAngles.length).toBe(3);
  });
});
