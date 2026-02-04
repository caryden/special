import { describe, expect, it } from 'bun:test';
import { planPath, type PlanMethod } from './plan-path.ts';
import { point2d } from './result-types.ts';
import { createGridGraph } from './graph-search.ts';

describe('planPath — grid methods', () => {
  const grid = createGridGraph(10, 10);

  it('astar finds path on empty grid', () => {
    const result = planPath(point2d(0, 0), point2d(9, 9), {
      method: 'astar',
      grid,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.cost).toBeGreaterThan(0);
  });

  it('dijkstra finds path on empty grid', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'dijkstra',
      grid,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  it('bfs finds path on empty grid', () => {
    const result = planPath(point2d(0, 0), point2d(3, 3), {
      method: 'bfs',
      grid,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  it('returns failure when grid not provided', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), { method: 'astar' });
    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
  });
});

describe('planPath — sampling methods', () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const noObstacles = () => true;

  it('defaults to rrt', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      bounds,
      isCollisionFree: noObstacles,
      seed: 42,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  it('rrt finds path', () => {
    const result = planPath(point2d(0, 0), point2d(9, 9), {
      method: 'rrt',
      bounds,
      isCollisionFree: noObstacles,
      seed: 42,
    });
    expect(result.success).toBe(true);
    expect(result.path[0].x).toBeCloseTo(0, 8);
    expect(result.path[0].y).toBeCloseTo(0, 8);
  });

  it('rrt-star finds path', () => {
    const result = planPath(point2d(0, 0), point2d(9, 9), {
      method: 'rrt-star',
      bounds,
      isCollisionFree: noObstacles,
      seed: 42,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  it('returns failure when bounds not provided', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'rrt',
      isCollisionFree: noObstacles,
    });
    expect(result.success).toBe(false);
  });

  it('returns failure when collision checker not provided', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'rrt',
      bounds,
    });
    expect(result.success).toBe(false);
  });

  it('rrt-star returns failure when bounds not provided', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'rrt-star',
      isCollisionFree: noObstacles,
    });
    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
  });
});

describe('planPath — options passthrough', () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const noObstacles = () => true;

  it('passes maxIterations and goalRadius to rrt', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'rrt',
      bounds,
      isCollisionFree: noObstacles,
      seed: 42,
      maxIterations: 2000,
      goalRadius: 1.0,
    });
    expect(result.success).toBe(true);
  });

  it('rrt-star is deterministic with same seed', () => {
    const opts = {
      method: 'rrt-star' as PlanMethod,
      bounds,
      isCollisionFree: noObstacles,
      seed: 42,
    };
    const r1 = planPath(point2d(0, 0), point2d(5, 5), opts);
    const r2 = planPath(point2d(0, 0), point2d(5, 5), opts);
    expect(r1.cost).toBeCloseTo(r2.cost, 10);
    expect(r1.path.length).toBe(r2.path.length);
  });
});

describe('planPath — with obstacles', () => {
  it('rrt finds path around wall', () => {
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
    const result = planPath(point2d(1, 1), point2d(9, 1), {
      method: 'rrt',
      bounds,
      isCollisionFree,
      seed: 42,
      maxIterations: 2000,
      goalRadius: 0.5,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(2);
  });

  it('grid search finds path around obstacles', () => {
    const obstacles = [point2d(5, 0), point2d(5, 1), point2d(5, 2), point2d(5, 3)];
    const grid = createGridGraph(10, 10, obstacles);
    const result = planPath(point2d(0, 0), point2d(9, 0), {
      method: 'astar',
      grid,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(2);
  });
});

describe('planPath — prm', () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const noObstacles = () => true;

  it('finds path in free space', () => {
    const result = planPath(point2d(0, 0), point2d(9, 9), {
      method: 'prm',
      bounds,
      isCollisionFree: noObstacles,
      seed: 42,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  it('returns failure when bounds not provided', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'prm',
      isCollisionFree: noObstacles,
    });
    expect(result.success).toBe(false);
  });
});

describe('planPath — d-star', () => {
  it('finds path on grid', () => {
    const result = planPath(point2d(0, 0), point2d(9, 9), {
      method: 'd-star',
      gridWidth: 10,
      gridHeight: 10,
    });
    expect(result.success).toBe(true);
    expect(result.cost).toBe(18);
  });

  it('finds path with obstacles', () => {
    const obstacles = [point2d(5, 0), point2d(5, 1), point2d(5, 2), point2d(5, 3)];
    const result = planPath(point2d(0, 0), point2d(9, 0), {
      method: 'd-star',
      gridWidth: 10,
      gridHeight: 10,
      obstacles,
    });
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(2);
  });

  it('returns failure when grid dimensions not provided', () => {
    const result = planPath(point2d(0, 0), point2d(5, 5), {
      method: 'd-star',
    });
    expect(result.success).toBe(false);
  });

  it('uses grid dimensions from grid object', () => {
    const grid = createGridGraph(10, 10);
    const result = planPath(point2d(0, 0), point2d(9, 9), {
      method: 'd-star',
      grid,
    });
    expect(result.success).toBe(true);
  });
});
