import { describe, test, expect } from 'bun:test';
import {
  gridSearch,
  manhattanDistance,
  euclideanDistance,
  createGridGraph,
} from './graph-search.ts';
import type { GridGraph, SearchOptions } from './graph-search.ts';
import { point2d } from './result-types.ts';
import type { Point2D } from './result-types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert path is 4-connected (each step differs by exactly 1 in one axis). */
function assertConnected(path: Point2D[]): void {
  for (let i = 1; i < path.length; i++) {
    const dx = Math.abs(path[i].x - path[i - 1].x);
    const dy = Math.abs(path[i].y - path[i - 1].y);
    expect(dx + dy).toBe(1);
  }
}

// ---------------------------------------------------------------------------
// Core tests
// ---------------------------------------------------------------------------

describe('graph-search core', () => {
  test('empty grid: straight-line path from (0,0) to (5,0)', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 0));
    expect(result.success).toBe(true);
    expect(result.cost).toBe(5);
    expect(result.path.length).toBe(6);
    expect(result.path[0]).toEqual(point2d(0, 0));
    expect(result.path[result.path.length - 1]).toEqual(point2d(5, 0));
  });

  test('single obstacle: path goes around it', () => {
    // Obstacle at (2,0), path from (0,0) to (4,0) must detour
    const graph = createGridGraph(10, 10, [point2d(2, 0)]);
    const result = gridSearch(graph, point2d(0, 0), point2d(4, 0));
    expect(result.success).toBe(true);
    // Detour adds 2 extra steps (go up/down around obstacle)
    expect(result.cost).toBe(6);
    assertConnected(result.path);
  });

  test('wall with gap: path finds the gap', () => {
    // Wall along x=3 from y=0..4, gap at y=5
    const obstacles: Point2D[] = [];
    for (let y = 0; y < 5; y++) {
      obstacles.push(point2d(3, y));
    }
    const graph = createGridGraph(10, 10, obstacles);
    const result = gridSearch(graph, point2d(0, 0), point2d(6, 0));
    expect(result.success).toBe(true);
    expect(result.path[0]).toEqual(point2d(0, 0));
    expect(result.path[result.path.length - 1]).toEqual(point2d(6, 0));
    assertConnected(result.path);
  });

  test('no path possible: returns success=false', () => {
    // Completely surround the goal
    const obstacles: Point2D[] = [
      point2d(4, 3), point2d(4, 5),
      point2d(3, 4), point2d(5, 4),
    ];
    const graph = createGridGraph(10, 10, obstacles);
    const result = gridSearch(graph, point2d(0, 0), point2d(4, 4));
    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
  });

  test('start equals goal: path=[start], cost=0', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(3, 3), point2d(3, 3));
    expect(result.success).toBe(true);
    expect(result.path).toEqual([point2d(3, 3)]);
    expect(result.cost).toBe(0);
    expect(result.nodesExplored).toBe(1);
  });

  test('start is blocked: returns success=false', () => {
    const graph = createGridGraph(10, 10, [point2d(0, 0)]);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 5));
    expect(result.success).toBe(false);
    expect(result.nodesExplored).toBe(0);
  });

  test('goal is blocked: returns success=false', () => {
    const graph = createGridGraph(10, 10, [point2d(5, 5)]);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 5));
    expect(result.success).toBe(false);
    expect(result.nodesExplored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Algorithm comparison
// ---------------------------------------------------------------------------

describe('algorithm comparison', () => {
  test('BFS finds shortest path on uniform grid', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 5), { algorithm: 'bfs' });
    expect(result.success).toBe(true);
    expect(result.cost).toBe(10);
    assertConnected(result.path);
  });

  test('Dijkstra finds shortest path on uniform grid', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 5), { algorithm: 'dijkstra' });
    expect(result.success).toBe(true);
    expect(result.cost).toBe(10);
    assertConnected(result.path);
  });

  test('A* explores fewer nodes than BFS on large grid with obstacles', () => {
    // Add a partial wall so the search space is non-trivial
    const obstacles: Point2D[] = [];
    for (let y = 0; y < 25; y++) {
      obstacles.push(point2d(15, y));
    }
    const graph = createGridGraph(30, 30, obstacles);
    const bfsResult = gridSearch(graph, point2d(0, 0), point2d(29, 29), { algorithm: 'bfs' });
    const astarResult = gridSearch(graph, point2d(0, 0), point2d(29, 29), { algorithm: 'astar' });
    expect(bfsResult.success).toBe(true);
    expect(astarResult.success).toBe(true);
    expect(astarResult.cost).toBe(bfsResult.cost);
    expect(astarResult.nodesExplored).toBeLessThan(bfsResult.nodesExplored);
  });

  test('all three algorithms find same path length on uniform cost grid', () => {
    const obstacles = [point2d(3, 0), point2d(3, 1), point2d(3, 2)];
    const graph = createGridGraph(10, 10, obstacles);

    const bfsR = gridSearch(graph, point2d(0, 0), point2d(6, 0), { algorithm: 'bfs' });
    const dijR = gridSearch(graph, point2d(0, 0), point2d(6, 0), { algorithm: 'dijkstra' });
    const asR = gridSearch(graph, point2d(0, 0), point2d(6, 0), { algorithm: 'astar' });

    expect(bfsR.success).toBe(true);
    expect(dijR.success).toBe(true);
    expect(asR.success).toBe(true);
    expect(bfsR.cost).toBe(dijR.cost);
    expect(dijR.cost).toBe(asR.cost);
  });
});

// ---------------------------------------------------------------------------
// Heuristic tests
// ---------------------------------------------------------------------------

describe('heuristic functions', () => {
  test('Manhattan distance: |3-1| + |4-2| = 4', () => {
    expect(manhattanDistance(point2d(1, 2), point2d(3, 4))).toBe(4);
  });

  test('Euclidean distance: sqrt((3-1)^2 + (4-2)^2) = sqrt(8)', () => {
    const d = euclideanDistance(point2d(1, 2), point2d(3, 4));
    expect(d).toBeCloseTo(Math.sqrt(8), 10);
  });

  test('Manhattan distance between same point is 0', () => {
    expect(manhattanDistance(point2d(5, 5), point2d(5, 5))).toBe(0);
  });

  test('Euclidean distance between same point is 0', () => {
    expect(euclideanDistance(point2d(5, 5), point2d(5, 5))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  test('grid boundary: cannot go outside bounds', () => {
    // 3x3 grid, path from (0,0) to (2,2)
    const graph = createGridGraph(3, 3);
    const result = gridSearch(graph, point2d(0, 0), point2d(2, 2));
    expect(result.success).toBe(true);
    // Every point in path should be within bounds
    for (const p of result.path) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(3);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(3);
    }
  });

  test('large grid (50x50) with obstacles finds path', () => {
    // Add some scattered obstacles
    const obstacles: Point2D[] = [];
    for (let i = 5; i < 45; i++) {
      obstacles.push(point2d(25, i)); // vertical wall
    }
    const graph = createGridGraph(50, 50, obstacles);
    const result = gridSearch(graph, point2d(0, 25), point2d(49, 25));
    expect(result.success).toBe(true);
    expect(result.nodesExplored).toBeGreaterThan(0);
    assertConnected(result.path);
  });

  test('custom cost function works with Dijkstra', () => {
    const graph = createGridGraph(10, 10);
    // Moving right costs 10, moving left costs 1, vertical costs 1
    const costFn = (from: Point2D, to: Point2D): number => {
      if (to.x > from.x) return 10;
      return 1;
    };
    const result = gridSearch(graph, point2d(0, 0), point2d(3, 0), {
      algorithm: 'dijkstra',
      costFn,
    });
    expect(result.success).toBe(true);
    // Cost should be 30 (3 steps right * 10 each)
    expect(result.cost).toBe(30);
  });

  test('custom heuristic works with A*', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 5), {
      algorithm: 'astar',
      heuristicFn: euclideanDistance,
    });
    expect(result.success).toBe(true);
    expect(result.cost).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('path properties', () => {
  test('path starts at start and ends at goal', () => {
    const graph = createGridGraph(10, 10);
    const start = point2d(1, 2);
    const goal = point2d(7, 8);
    const result = gridSearch(graph, start, goal);
    expect(result.success).toBe(true);
    expect(result.path[0]).toEqual(start);
    expect(result.path[result.path.length - 1]).toEqual(goal);
  });

  test('each step in path is adjacent (4-connected)', () => {
    const obstacles = [point2d(3, 2), point2d(3, 3), point2d(3, 4)];
    const graph = createGridGraph(10, 10, obstacles);
    const result = gridSearch(graph, point2d(0, 0), point2d(8, 8));
    expect(result.success).toBe(true);
    assertConnected(result.path);
  });

  test('cost equals path.length - 1 for uniform cost', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(0, 0), point2d(7, 3));
    expect(result.success).toBe(true);
    expect(result.cost).toBe(result.path.length - 1);
  });

  test('nodesExplored > 0 for any non-trivial search', () => {
    const graph = createGridGraph(10, 10);
    const result = gridSearch(graph, point2d(0, 0), point2d(5, 5));
    expect(result.success).toBe(true);
    expect(result.nodesExplored).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// createGridGraph tests
// ---------------------------------------------------------------------------

describe('createGridGraph', () => {
  test('creates grid with correct dimensions', () => {
    const graph = createGridGraph(5, 8);
    expect(graph.width).toBe(5);
    expect(graph.height).toBe(8);
  });

  test('no obstacles by default', () => {
    const graph = createGridGraph(5, 5);
    expect(graph.isBlocked(0, 0)).toBe(false);
    expect(graph.isBlocked(4, 4)).toBe(false);
  });

  test('obstacles are blocked', () => {
    const graph = createGridGraph(5, 5, [point2d(2, 3)]);
    expect(graph.isBlocked(2, 3)).toBe(true);
    expect(graph.isBlocked(2, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BFS/Dijkstra start=goal coverage
// ---------------------------------------------------------------------------

describe('start=goal per algorithm', () => {
  test('BFS: start equals goal', () => {
    const graph = createGridGraph(5, 5);
    const result = gridSearch(graph, point2d(2, 2), point2d(2, 2), { algorithm: 'bfs' });
    expect(result.success).toBe(true);
    expect(result.cost).toBe(0);
    expect(result.path).toEqual([point2d(2, 2)]);
  });

  test('BFS: no path possible', () => {
    const obstacles = [
      point2d(4, 3), point2d(4, 5),
      point2d(3, 4), point2d(5, 4),
    ];
    const graph = createGridGraph(10, 10, obstacles);
    const result = gridSearch(graph, point2d(0, 0), point2d(4, 4), { algorithm: 'bfs' });
    expect(result.success).toBe(false);
  });

  test('Dijkstra: no path possible', () => {
    const obstacles = [
      point2d(4, 3), point2d(4, 5),
      point2d(3, 4), point2d(5, 4),
    ];
    const graph = createGridGraph(10, 10, obstacles);
    const result = gridSearch(graph, point2d(0, 0), point2d(4, 4), { algorithm: 'dijkstra' });
    expect(result.success).toBe(false);
  });

  test('Dijkstra: start equals goal', () => {
    const graph = createGridGraph(5, 5);
    const result = gridSearch(graph, point2d(2, 2), point2d(2, 2), { algorithm: 'dijkstra' });
    expect(result.success).toBe(true);
    expect(result.cost).toBe(0);
    expect(result.path).toEqual([point2d(2, 2)]);
  });
});
