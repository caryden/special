import { describe, expect, test } from 'bun:test';
import {
  simpleGridWorld,
  straightLinePath,
  circularArcPath,
  figureEightPath,
  constantPositionMeasurements,
  linearRampMeasurements,
  stepResponseErrors,
} from './test-scenarios.ts';

// ---------------------------------------------------------------------------
// Grid world
// ---------------------------------------------------------------------------

describe('simpleGridWorld', () => {
  test('returns correct dimensions', () => {
    const grid = simpleGridWorld(10, 8);
    expect(grid.width).toBe(10);
    expect(grid.height).toBe(8);
  });

  test('no obstacles when fraction is 0', () => {
    const grid = simpleGridWorld(10, 10, 0);
    expect(grid.obstacles.size).toBe(0);
  });

  test('obstacle count roughly matches fraction', () => {
    const grid = simpleGridWorld(20, 20, 0.3);
    const totalCells = 20 * 20;
    const ratio = grid.obstacles.size / totalCells;
    // Should be in a reasonable range around 0.3
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.6);
  });

  test('deterministic: calling twice gives same result', () => {
    const a = simpleGridWorld(15, 15, 0.25);
    const b = simpleGridWorld(15, 15, 0.25);
    expect([...a.obstacles].sort()).toEqual([...b.obstacles].sort());
  });

  test('isBlocked returns true for obstacles', () => {
    const grid = simpleGridWorld(20, 20, 0.5);
    // Pick an obstacle from the set and verify isBlocked
    if (grid.obstacles.size > 0) {
      const first = [...grid.obstacles][0];
      const [x, y] = first.split(',').map(Number);
      expect(grid.isBlocked(x, y)).toBe(true);
    }
  });

  test('isBlocked returns true for out-of-bounds', () => {
    const grid = simpleGridWorld(10, 10);
    expect(grid.isBlocked(-1, 0)).toBe(true);
    expect(grid.isBlocked(0, -1)).toBe(true);
    expect(grid.isBlocked(10, 0)).toBe(true);
    expect(grid.isBlocked(0, 10)).toBe(true);
  });

  test('isBlocked returns false for empty in-bounds cell', () => {
    const grid = simpleGridWorld(10, 10, 0);
    expect(grid.isBlocked(5, 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Straight line path
// ---------------------------------------------------------------------------

describe('straightLinePath', () => {
  test('default returns 11 points', () => {
    const path = straightLinePath();
    expect(path.length).toBe(11);
  });

  test('custom length', () => {
    const path = straightLinePath(5);
    expect(path.length).toBe(5);
  });

  test('starts at origin', () => {
    const path = straightLinePath();
    expect(path[0].x).toBeCloseTo(0, 10);
    expect(path[0].y).toBeCloseTo(0, 10);
  });

  test('ends at (10, 0)', () => {
    const path = straightLinePath();
    expect(path[path.length - 1].x).toBeCloseTo(10, 10);
    expect(path[path.length - 1].y).toBeCloseTo(0, 10);
  });

  test('all points are collinear (y=0)', () => {
    const path = straightLinePath(20);
    for (const p of path) {
      expect(p.y).toBeCloseTo(0, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// Circular arc path
// ---------------------------------------------------------------------------

describe('circularArcPath', () => {
  test('correct number of points', () => {
    const path = circularArcPath(5, 0, Math.PI, 10);
    expect(path.length).toBe(10);
  });

  test('default is 20 points', () => {
    const path = circularArcPath(5, 0, Math.PI);
    expect(path.length).toBe(20);
  });

  test('all points at correct radius', () => {
    const r = 3;
    const path = circularArcPath(r, 0, Math.PI, 15);
    for (const p of path) {
      const dist = Math.sqrt(p.x * p.x + p.y * p.y);
      expect(dist).toBeCloseTo(r, 8);
    }
  });

  test('first point matches start angle', () => {
    const path = circularArcPath(5, Math.PI / 4, Math.PI, 10);
    const angle = Math.atan2(path[0].y, path[0].x);
    expect(angle).toBeCloseTo(Math.PI / 4, 8);
  });

  test('last point matches end angle', () => {
    const path = circularArcPath(5, 0, Math.PI / 2, 10);
    const last = path[path.length - 1];
    const angle = Math.atan2(last.y, last.x);
    expect(angle).toBeCloseTo(Math.PI / 2, 8);
  });
});

// ---------------------------------------------------------------------------
// Figure eight path
// ---------------------------------------------------------------------------

describe('figureEightPath', () => {
  test('correct number of points', () => {
    const path = figureEightPath(5, 30);
    expect(path.length).toBe(30);
  });

  test('default is 40 points', () => {
    const path = figureEightPath(5);
    expect(path.length).toBe(40);
  });

  test('passes through origin region', () => {
    const path = figureEightPath(5, 100);
    // The figure eight passes through (0,0) at t=0 and t=pi
    const nearOrigin = path.some(
      (p) => Math.abs(p.x) < 0.5 && Math.abs(p.y) < 0.5,
    );
    expect(nearOrigin).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constant position measurements
// ---------------------------------------------------------------------------

describe('constantPositionMeasurements', () => {
  test('correct length', () => {
    const m = constantPositionMeasurements(5, [0.1, -0.1], 10);
    expect(m.length).toBe(10);
  });

  test('values near true value', () => {
    const noise = [0.1, -0.2, 0.05];
    const m = constantPositionMeasurements(10, noise, 6);
    for (const v of m) {
      expect(Math.abs(v - 10)).toBeLessThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Linear ramp measurements
// ---------------------------------------------------------------------------

describe('linearRampMeasurements', () => {
  test('correct length', () => {
    const m = linearRampMeasurements(2, 1, [0], 5);
    expect(m.length).toBe(5);
  });

  test('correct slope when noise is zero', () => {
    const m = linearRampMeasurements(3, 0, [0], 5);
    // m[i] = 3*i, so differences should be 3
    for (let i = 1; i < m.length; i++) {
      expect(m[i] - m[i - 1]).toBeCloseTo(3, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// Step response errors
// ---------------------------------------------------------------------------

describe('stepResponseErrors', () => {
  test('correct length', () => {
    const errors = stepResponseErrors(1, 0.1, 20);
    expect(errors.length).toBe(20);
  });

  test('initial error equals setpoint', () => {
    const errors = stepResponseErrors(5, 0.1, 10);
    expect(errors[0]).toBeCloseTo(5, 10);
  });

  test('errors decrease over time for stable plant', () => {
    const errors = stepResponseErrors(1, 0.5, 20);
    // With gain 0.5, the system converges: errors should generally decrease
    expect(Math.abs(errors[19])).toBeLessThan(Math.abs(errors[0]));
  });
});
