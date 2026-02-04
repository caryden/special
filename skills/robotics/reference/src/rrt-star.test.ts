import { describe, expect, it } from 'bun:test';
import {
  rrtStarPlan,
  rrtStarNearNodes,
  rrtStarRadius,
  DEFAULT_RRT_STAR_CONFIG,
} from './rrt-star.ts';
import { dist2d, type RRTNode } from './rrt.ts';
import { point2d } from './result-types.ts';

describe('rrtStarRadius', () => {
  it('returns Infinity for n <= 1', () => {
    expect(rrtStarRadius(1, 50)).toBe(Infinity);
    expect(rrtStarRadius(0, 50)).toBe(Infinity);
  });

  it('decreases as n increases', () => {
    const r10 = rrtStarRadius(10, 50);
    const r100 = rrtStarRadius(100, 50);
    const r1000 = rrtStarRadius(1000, 50);
    expect(r100).toBeLessThan(r10);
    expect(r1000).toBeLessThan(r100);
  });

  it('increases with gamma', () => {
    const r1 = rrtStarRadius(100, 10);
    const r2 = rrtStarRadius(100, 100);
    expect(r2).toBeGreaterThan(r1);
  });
});

describe('rrtStarNearNodes', () => {
  const tree: RRTNode[] = [
    { point: point2d(0, 0), parent: -1, cost: 0 },
    { point: point2d(1, 0), parent: 0, cost: 1 },
    { point: point2d(5, 5), parent: 0, cost: 7 },
    { point: point2d(0.5, 0.5), parent: 0, cost: 0.7 },
  ];

  it('finds nodes within radius', () => {
    const near = rrtStarNearNodes(tree, point2d(0.5, 0), 1.5);
    expect(near).toContain(0);
    expect(near).toContain(1);
    expect(near).toContain(3);
    expect(near).not.toContain(2);
  });

  it('returns empty for very small radius', () => {
    const near = rrtStarNearNodes(tree, point2d(3, 3), 0.1);
    expect(near.length).toBe(0);
  });

  it('returns all for very large radius', () => {
    const near = rrtStarNearNodes(tree, point2d(0, 0), 100);
    expect(near.length).toBe(tree.length);
  });
});

describe('rrtStarPlan — obstacle-free', () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const noObstacles = () => true;

  it('finds path in free space', () => {
    const result = rrtStarPlan(
      point2d(0, 0), point2d(9, 9), bounds, noObstacles,
      DEFAULT_RRT_STAR_CONFIG, 42,
    );
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.cost).toBeLessThan(Infinity);
  });

  it('path starts at start', () => {
    const result = rrtStarPlan(
      point2d(1, 1), point2d(8, 8), bounds, noObstacles,
      DEFAULT_RRT_STAR_CONFIG, 42,
    );
    expect(result.path[0].x).toBeCloseTo(1, 8);
    expect(result.path[0].y).toBeCloseTo(1, 8);
  });

  it('deterministic with same seed', () => {
    const r1 = rrtStarPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles,
      DEFAULT_RRT_STAR_CONFIG, 42);
    const r2 = rrtStarPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles,
      DEFAULT_RRT_STAR_CONFIG, 42);
    expect(r1.cost).toBeCloseTo(r2.cost, 10);
    expect(r1.path.length).toBe(r2.path.length);
  });

  it('produces better cost than basic RRT with more iterations', () => {
    // RRT* should produce near-optimal (straight-line ≈ 12.73) paths with enough iterations
    const config = { ...DEFAULT_RRT_STAR_CONFIG, maxIterations: 2000, goalRadius: 0.5 };
    const result = rrtStarPlan(point2d(0, 0), point2d(9, 9), bounds, noObstacles, config, 42);
    expect(result.success).toBe(true);
    const optimal = dist2d(point2d(0, 0), point2d(9, 9)); // ~12.73
    // RRT* should be within 2x of optimal
    expect(result.cost).toBeLessThan(optimal * 2);
  });
});

describe('rrtStarPlan — with obstacles', () => {
  it('finds path around wall', () => {
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
    const config = { ...DEFAULT_RRT_STAR_CONFIG, maxIterations: 2000, goalRadius: 0.5 };
    const result = rrtStarPlan(point2d(1, 1), point2d(9, 1), bounds, isCollisionFree, config, 42);
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(2);
  });

  it('fails when completely blocked', () => {
    const alwaysBlocked = () => false;
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const config = { ...DEFAULT_RRT_STAR_CONFIG, maxIterations: 50 };
    const result = rrtStarPlan(point2d(0, 0), point2d(9, 9), bounds, alwaysBlocked, config, 42);
    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
  });
});

describe('rrtStarPlan — rewiring', () => {
  it('tree has rewired nodes with lower cost', () => {
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const noObstacles = () => true;
    const config = { ...DEFAULT_RRT_STAR_CONFIG, maxIterations: 500, goalRadius: 1.0 };
    const result = rrtStarPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles, config, 42);

    // Verify tree node costs are consistent
    for (let i = 1; i < result.tree.length; i++) {
      const node = result.tree[i];
      if (node.parent >= 0) {
        const parent = result.tree[node.parent];
        const edgeCost = dist2d(parent.point, node.point);
        // Cost should be approximately parent cost + edge cost
        expect(node.cost).toBeCloseTo(parent.cost + edgeCost, 2);
      }
    }
  });

  it('returns tree with valid parent pointers', () => {
    const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    const noObstacles = () => true;
    const result = rrtStarPlan(point2d(0, 0), point2d(5, 5), bounds, noObstacles,
      DEFAULT_RRT_STAR_CONFIG, 42);

    // Root has parent -1
    expect(result.tree[0].parent).toBe(-1);

    // All other nodes have valid parent
    for (let i = 1; i < result.tree.length; i++) {
      expect(result.tree[i].parent).toBeGreaterThanOrEqual(0);
      expect(result.tree[i].parent).toBeLessThan(result.tree.length);
    }
  });
});
