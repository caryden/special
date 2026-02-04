import { describe, expect, it } from 'bun:test';
import {
  dStarInit,
  dStarPlan,
  dStarReplan,
} from './d-star.ts';
import { point2d } from './result-types.ts';

describe('dStarPlan — obstacle-free', () => {
  it('finds path on empty grid', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(9, 9));
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.cost).toBe(18); // Manhattan distance on 4-connected grid
  });

  it('path starts at start and ends at goal', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(5, 5));
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.path[0].x).toBe(0);
    expect(result.path[0].y).toBe(0);
    expect(result.path[result.path.length - 1].x).toBe(5);
    expect(result.path[result.path.length - 1].y).toBe(5);
  });

  it('path length equals cost + 1', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(3, 4));
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.path.length).toBe(result.cost + 1); // 7 + 1 = 8
  });

  it('start equals goal', () => {
    const state = dStarInit(5, 5, point2d(2, 2), point2d(2, 2));
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.path.length).toBe(1);
    expect(result.cost).toBe(0);
  });

  it('adjacent start and goal', () => {
    const state = dStarInit(5, 5, point2d(0, 0), point2d(1, 0));
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.cost).toBe(1);
    expect(result.path.length).toBe(2);
  });
});

describe('dStarPlan — with obstacles', () => {
  it('finds path around obstacle', () => {
    // Wall at x=5, y=0..8
    const obstacles = Array.from({ length: 9 }, (_, y) => point2d(5, y));
    const state = dStarInit(10, 10, point2d(0, 0), point2d(9, 0), obstacles);
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(10); // must go around wall
    // Path should not pass through any obstacle
    for (const p of result.path) {
      const isObstacle = obstacles.some((o) => o.x === p.x && o.y === p.y);
      expect(isObstacle).toBe(false);
    }
  });

  it('fails when completely blocked', () => {
    // Surround goal with walls
    const obstacles = [
      point2d(4, 4), point2d(4, 5), point2d(4, 6),
      point2d(5, 4), point2d(5, 6),
      point2d(6, 4), point2d(6, 5), point2d(6, 6),
    ];
    const state = dStarInit(10, 10, point2d(0, 0), point2d(5, 5), obstacles);
    const result = dStarPlan(state);
    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
    expect(result.cost).toBe(Infinity);
  });

  it('finds path through narrow corridor', () => {
    // Two walls with a gap
    const obstacles = [
      ...Array.from({ length: 4 }, (_, y) => point2d(3, y)),     // wall from y=0..3
      ...Array.from({ length: 5 }, (_, y) => point2d(3, y + 5)), // wall from y=5..9
    ];
    const state = dStarInit(10, 10, point2d(0, 2), point2d(6, 2), obstacles);
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    // Must go through the gap at (3,4)
    const passesGap = result.path.some((p) => p.x === 3 && p.y === 4);
    expect(passesGap).toBe(true);
  });
});

describe('dStarReplan', () => {
  it('replans when new obstacle appears on path', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(9, 0));
    const initial = dStarPlan(state);
    expect(initial.success).toBe(true);

    // Block a cell on the original path
    const blocked = initial.path[Math.floor(initial.path.length / 2)];
    const result = dStarReplan(state, [blocked], []);
    expect(result.success).toBe(true);
    // New path should avoid the blocked cell
    const passesBlocked = result.path.some(
      (p) => p.x === blocked.x && p.y === blocked.y,
    );
    expect(passesBlocked).toBe(false);
  });

  it('replans when obstacle is removed', () => {
    // Start with wall blocking direct path
    const wall = Array.from({ length: 10 }, (_, y) => point2d(5, y));
    const state = dStarInit(10, 10, point2d(0, 0), point2d(9, 0), wall);
    const blocked = dStarPlan(state);
    expect(blocked.success).toBe(false);

    // Remove wall
    const result = dStarReplan(state, [], wall);
    expect(result.success).toBe(true);
    expect(result.cost).toBe(9); // Manhattan distance
  });

  it('incrementally adds multiple obstacles', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(9, 9));
    dStarPlan(state);

    // Add obstacles one at a time
    const r1 = dStarReplan(state, [point2d(1, 1)], []);
    expect(r1.success).toBe(true);
    const r2 = dStarReplan(state, [point2d(2, 2)], []);
    expect(r2.success).toBe(true);
  });

  it('cost increases when shortcut is blocked', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(5, 0));
    const initial = dStarPlan(state);
    expect(initial.cost).toBe(5);

    // Block direct path at (3, 0)
    const result = dStarReplan(state, [point2d(3, 0)], []);
    expect(result.success).toBe(true);
    expect(result.cost).toBeGreaterThan(5);
  });
});

describe('dStarReplan — with robot movement', () => {
  it('replans after robot moves to new start', () => {
    const state = dStarInit(10, 10, point2d(0, 0), point2d(9, 9));
    dStarPlan(state);

    // Robot moves and discovers obstacle
    const r1 = dStarReplan(state, [point2d(3, 3)], [], point2d(1, 1));
    expect(r1.success).toBe(true);
    expect(r1.path[0].x).toBe(1);
    expect(r1.path[0].y).toBe(1);
  });

  it('handles stale keys during incremental replan with km changes', () => {
    const state = dStarInit(15, 15, point2d(0, 0), point2d(14, 14));
    dStarPlan(state);

    // Move robot forward and add obstacles, causing km to grow and stale keys
    const r1 = dStarReplan(state, [point2d(3, 3), point2d(4, 4)], [], point2d(2, 2));
    expect(r1.success).toBe(true);

    const r2 = dStarReplan(state, [point2d(5, 5), point2d(6, 6)], [], point2d(4, 3));
    expect(r2.success).toBe(true);

    const r3 = dStarReplan(state, [point2d(7, 7)], [], point2d(6, 5));
    expect(r3.success).toBe(true);
  });
});

describe('dStarPlan — edge cases', () => {
  it('start is blocked', () => {
    const state = dStarInit(5, 5, point2d(0, 0), point2d(4, 4), [point2d(0, 0)]);
    const result = dStarPlan(state);
    expect(result.success).toBe(false);
  });

  it('goal is blocked', () => {
    const state = dStarInit(5, 5, point2d(0, 0), point2d(4, 4), [point2d(4, 4)]);
    const result = dStarPlan(state);
    expect(result.success).toBe(false);
  });

  it('small 2x2 grid', () => {
    const state = dStarInit(2, 2, point2d(0, 0), point2d(1, 1));
    const result = dStarPlan(state);
    expect(result.success).toBe(true);
    expect(result.cost).toBe(2);
  });
});
