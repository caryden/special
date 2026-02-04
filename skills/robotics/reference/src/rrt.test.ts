import { describe, expect, it } from 'bun:test';
import {
  rrtPlan,
  rrtNearestNode,
  rrtSteer,
  rrtExtractPath,
  createRNG,
  createGridCollisionChecker,
  dist2d,
  DEFAULT_RRT_CONFIG,
  type RRTNode,
} from './rrt.ts';
import { point2d } from './result-types.ts';

describe('createRNG', () => {
  it('produces deterministic sequence from same seed', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(99);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRNG(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('dist2d', () => {
  it('distance between same point is 0', () => {
    expect(dist2d(point2d(1, 2), point2d(1, 2))).toBe(0);
  });

  it('computes Euclidean distance', () => {
    expect(dist2d(point2d(0, 0), point2d(3, 4))).toBeCloseTo(5, 10);
  });
});

describe('rrtNearestNode', () => {
  it('finds nearest node', () => {
    const tree: RRTNode[] = [
      { point: point2d(0, 0), parent: -1, cost: 0 },
      { point: point2d(5, 5), parent: 0, cost: 1 },
      { point: point2d(1, 1), parent: 0, cost: 1 },
    ];
    expect(rrtNearestNode(tree, point2d(1, 0))).toBe(0);
    expect(rrtNearestNode(tree, point2d(4, 4))).toBe(1);
    expect(rrtNearestNode(tree, point2d(1.5, 1.5))).toBe(2);
  });
});

describe('rrtSteer', () => {
  it('returns target if within step size', () => {
    const result = rrtSteer(point2d(0, 0), point2d(0.3, 0.4), 1.0);
    expect(result.x).toBeCloseTo(0.3, 10);
    expect(result.y).toBeCloseTo(0.4, 10);
  });

  it('limits distance to step size', () => {
    const result = rrtSteer(point2d(0, 0), point2d(3, 4), 1.0);
    const d = dist2d(point2d(0, 0), result);
    expect(d).toBeCloseTo(1.0, 8);
  });

  it('preserves direction', () => {
    const result = rrtSteer(point2d(0, 0), point2d(6, 8), 5.0);
    // Direction should be (3/5, 4/5)
    expect(result.x / result.y).toBeCloseTo(6 / 8, 8);
  });
});

describe('rrtExtractPath', () => {
  it('extracts path from root to goal', () => {
    const tree: RRTNode[] = [
      { point: point2d(0, 0), parent: -1, cost: 0 },
      { point: point2d(1, 0), parent: 0, cost: 1 },
      { point: point2d(2, 0), parent: 1, cost: 2 },
      { point: point2d(3, 0), parent: 2, cost: 3 },
    ];
    const path = rrtExtractPath(tree, 3);
    expect(path.length).toBe(4);
    expect(path[0].x).toBe(0);
    expect(path[3].x).toBe(3);
  });

  it('single node path', () => {
    const tree: RRTNode[] = [{ point: point2d(0, 0), parent: -1, cost: 0 }];
    const path = rrtExtractPath(tree, 0);
    expect(path.length).toBe(1);
  });
});

describe('rrtPlan — obstacle-free', () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const noObstacles = () => true;

  it('finds path in obstacle-free space', () => {
    const result = rrtPlan(
      point2d(0, 0), point2d(9, 9), bounds, noObstacles,
      { ...DEFAULT_RRT_CONFIG, goalRadius: 1.0 },
      42,
    );
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.path[0].x).toBe(0);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.cost).toBeLessThan(Infinity);
  });

  it('path starts at start and ends near goal', () => {
    const result = rrtPlan(
      point2d(1, 1), point2d(8, 8), bounds, noObstacles,
      { ...DEFAULT_RRT_CONFIG, goalRadius: 1.0 },
      42,
    );
    expect(result.success).toBe(true);
    expect(result.path[0].x).toBeCloseTo(1, 8);
    expect(result.path[0].y).toBeCloseTo(1, 8);
    const last = result.path[result.path.length - 1];
    expect(dist2d(last, point2d(8, 8))).toBeLessThan(1.5);
  });

  it('deterministic with same seed', () => {
    const r1 = rrtPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles,
      DEFAULT_RRT_CONFIG, 42);
    const r2 = rrtPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles,
      DEFAULT_RRT_CONFIG, 42);
    expect(r1.path.length).toBe(r2.path.length);
    expect(r1.nodesExplored).toBe(r2.nodesExplored);
  });

  it('returns tree', () => {
    const result = rrtPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles,
      DEFAULT_RRT_CONFIG, 42);
    expect(result.tree.length).toBeGreaterThan(1);
    expect(result.tree[0].parent).toBe(-1); // root
  });
});

describe('rrtPlan — with obstacles', () => {
  it('finds path around wall', () => {
    // Wall from y=0 to y=8 at x=5
    const isCollisionFree = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + t * (to.x - from.x);
        const y = from.y + t * (to.y - from.y);
        if (Math.abs(x - 5) < 0.1 && y < 8) return false;
      }
      return true;
    };

    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const config = { ...DEFAULT_RRT_CONFIG, maxIterations: 2000, goalRadius: 0.5 };
    const result = rrtPlan(point2d(1, 1), point2d(9, 1), bounds, isCollisionFree, config, 42);
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(2);
  });

  it('fails when completely blocked', () => {
    const alwaysBlocked = () => false;
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const result = rrtPlan(point2d(0, 0), point2d(9, 9), bounds, alwaysBlocked,
      { ...DEFAULT_RRT_CONFIG, maxIterations: 50 }, 42);
    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
    expect(result.cost).toBe(Infinity);
  });
});

describe('rrtPlan — grid collision checker', () => {
  it('navigates around grid obstacles', () => {
    // 10x10 grid with wall
    const grid: boolean[][] = Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (_, c) => c === 5 && r < 8),
    );
    const checker = createGridCollisionChecker(grid, 1.0);
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const config = { ...DEFAULT_RRT_CONFIG, maxIterations: 2000, goalRadius: 0.5, stepSize: 0.5 };
    const result = rrtPlan(point2d(2, 2), point2d(8, 2), bounds, checker, config, 42);
    expect(result.success).toBe(true);
  });
});

describe('createGridCollisionChecker', () => {
  it('allows movement in free space', () => {
    const grid = [[false, false], [false, false]];
    const checker = createGridCollisionChecker(grid, 1.0);
    expect(checker(point2d(0, 0), point2d(1, 1))).toBe(true);
  });

  it('blocks movement through obstacles', () => {
    const grid = [[false, true], [false, false]];
    const checker = createGridCollisionChecker(grid, 1.0);
    expect(checker(point2d(0, 0), point2d(1.5, 0))).toBe(false);
  });

  it('handles out-of-bounds as free', () => {
    const grid = [[true]];
    const checker = createGridCollisionChecker(grid, 1.0);
    // Points outside grid should be free
    expect(checker(point2d(-1, -1), point2d(-2, -2))).toBe(true);
  });
});
