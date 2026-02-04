/**
 * Grid-based graph search algorithms: BFS, Dijkstra, A*.
 *
 * @node graph-search
 * @depends-on result-types
 * @contract graph-search.test.ts
 * @hint grid: 4-connected grid (up/down/left/right), no diagonal movement.
 *       Each step has cost 1.0 for BFS/Dijkstra. A* uses Manhattan distance heuristic.
 * @hint off-policy: Grid connectivity (4 vs 8), diagonal cost (1 vs sqrt(2)), and
 *       heuristic choice (Manhattan vs Euclidean) are key design decisions.
 * @provenance Hart, Nilsson & Raphael "A Formal Basis for the Heuristic Determination
 *       of Minimum Cost Paths" 1968 (A*), PythonRobotics (cross-validation)
 */

import type { Point2D, PlanResult } from './result-types.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridGraph {
  width: number;
  height: number;
  /** Returns true if (x,y) is blocked */
  isBlocked: (x: number, y: number) => boolean;
}

export interface SearchOptions {
  /** Which algorithm: 'bfs' | 'dijkstra' | 'astar' */
  algorithm: 'bfs' | 'dijkstra' | 'astar';
  /** For weighted search, cost function (default: uniform cost 1) */
  costFn?: (from: Point2D, to: Point2D) => number;
  /** For A*, heuristic function (default: Manhattan distance) */
  heuristicFn?: (from: Point2D, goal: Point2D) => number;
}

// ---------------------------------------------------------------------------
// Heuristic functions
// ---------------------------------------------------------------------------

/** Manhattan distance heuristic: |dx| + |dy| */
export function manhattanDistance(a: Point2D, b: Point2D): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Euclidean distance heuristic */
export function euclideanDistance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Grid factory
// ---------------------------------------------------------------------------

/** Create a GridGraph from dimensions and an optional list of obstacle points. */
export function createGridGraph(
  width: number,
  height: number,
  obstacles?: Point2D[],
): GridGraph {
  const blocked = new Set<string>();
  if (obstacles) {
    for (const p of obstacles) {
      blocked.add(`${p.x},${p.y}`);
    }
  }
  return {
    width,
    height,
    isBlocked: (x: number, y: number) => blocked.has(`${x},${y}`),
  };
}

// ---------------------------------------------------------------------------
// 4-connected neighbours
// ---------------------------------------------------------------------------

const DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function neighbours(
  graph: GridGraph,
  p: Point2D,
): Point2D[] {
  const result: Point2D[] = [];
  for (const [dx, dy] of DIRS) {
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (nx >= 0 && nx < graph.width && ny >= 0 && ny < graph.height && !graph.isBlocked(nx, ny)) {
      result.push({ x: nx, y: ny });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Key helper
// ---------------------------------------------------------------------------

function key(p: Point2D): string {
  return `${p.x},${p.y}`;
}

// ---------------------------------------------------------------------------
// Path reconstruction
// ---------------------------------------------------------------------------

function reconstructPath(
  parentMap: Map<string, string | null>,
  goal: Point2D,
): Point2D[] {
  const path: Point2D[] = [];
  let cur: string | null | undefined = key(goal);
  while (cur != null) {
    const [sx, sy] = cur.split(',');
    path.push({ x: Number(sx), y: Number(sy) });
    cur = parentMap.get(cur) ?? null;
    if (cur === null) break;           // reached start (parent === null)
    if (cur === undefined) break;      // safety
  }
  path.reverse();
  return path;
}

// ---------------------------------------------------------------------------
// BFS
// ---------------------------------------------------------------------------

function bfs(
  graph: GridGraph,
  start: Point2D,
  goal: Point2D,
): PlanResult {
  const startKey = key(start);
  const goalKey = key(goal);

  if (startKey === goalKey) {
    return { path: [start], cost: 0, success: true, nodesExplored: 1 };
  }

  const parentMap = new Map<string, string | null>();
  parentMap.set(startKey, null);

  const queue: Point2D[] = [start];
  let nodesExplored = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    nodesExplored++;

    if (key(current) === goalKey) {
      const path = reconstructPath(parentMap, goal);
      return { path, cost: path.length - 1, success: true, nodesExplored };
    }

    for (const nb of neighbours(graph, current)) {
      const nk = key(nb);
      if (!parentMap.has(nk)) {
        parentMap.set(nk, key(current));
        queue.push(nb);
      }
    }
  }

  return { path: [], cost: 0, success: false, nodesExplored };
}

// ---------------------------------------------------------------------------
// Dijkstra
// ---------------------------------------------------------------------------

function dijkstra(
  graph: GridGraph,
  start: Point2D,
  goal: Point2D,
  costFn: (from: Point2D, to: Point2D) => number,
): PlanResult {
  const startKey = key(start);
  const goalKey = key(goal);

  if (startKey === goalKey) {
    return { path: [start], cost: 0, success: true, nodesExplored: 1 };
  }

  const dist = new Map<string, number>();
  dist.set(startKey, 0);

  const parentMap = new Map<string, string | null>();
  parentMap.set(startKey, null);

  // Simple sorted-array priority queue: [cost, point]
  let openList: { cost: number; point: Point2D }[] = [{ cost: 0, point: start }];

  const closed = new Set<string>();
  let nodesExplored = 0;

  while (openList.length > 0) {
    const current = openList.shift()!;
    const ck = key(current.point);

    if (closed.has(ck)) continue;
    closed.add(ck);
    nodesExplored++;

    if (ck === goalKey) {
      const path = reconstructPath(parentMap, goal);
      return { path, cost: current.cost, success: true, nodesExplored };
    }

    for (const nb of neighbours(graph, current.point)) {
      const nk = key(nb);
      if (closed.has(nk)) continue;

      const newCost = current.cost + costFn(current.point, nb);
      const prevCost = dist.get(nk);
      if (prevCost === undefined || newCost < prevCost) {
        dist.set(nk, newCost);
        parentMap.set(nk, ck);
        openList.push({ cost: newCost, point: nb });
        // Re-sort (simple sorted array approach)
        openList.sort((a, b) => a.cost - b.cost);
      }
    }
  }

  return { path: [], cost: 0, success: false, nodesExplored };
}

// ---------------------------------------------------------------------------
// A*
// ---------------------------------------------------------------------------

function astar(
  graph: GridGraph,
  start: Point2D,
  goal: Point2D,
  costFn: (from: Point2D, to: Point2D) => number,
  heuristicFn: (from: Point2D, goal: Point2D) => number,
): PlanResult {
  const startKey = key(start);
  const goalKey = key(goal);

  if (startKey === goalKey) {
    return { path: [start], cost: 0, success: true, nodesExplored: 1 };
  }

  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  const parentMap = new Map<string, string | null>();
  parentMap.set(startKey, null);

  // Open list sorted by f = g + h
  let openList: { f: number; g: number; point: Point2D }[] = [
    { f: heuristicFn(start, goal), g: 0, point: start },
  ];

  const closed = new Set<string>();
  let nodesExplored = 0;

  while (openList.length > 0) {
    const current = openList.shift()!;
    const ck = key(current.point);

    if (closed.has(ck)) continue;
    closed.add(ck);
    nodesExplored++;

    if (ck === goalKey) {
      const path = reconstructPath(parentMap, goal);
      return { path, cost: current.g, success: true, nodesExplored };
    }

    for (const nb of neighbours(graph, current.point)) {
      const nk = key(nb);
      if (closed.has(nk)) continue;

      const newG = current.g + costFn(current.point, nb);
      const prevG = gScore.get(nk);
      if (prevG === undefined || newG < prevG) {
        gScore.set(nk, newG);
        parentMap.set(nk, ck);
        const f = newG + heuristicFn(nb, goal);
        openList.push({ f, g: newG, point: nb });
        openList.sort((a, b) => a.f - b.f);
      }
    }
  }

  return { path: [], cost: 0, success: false, nodesExplored };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const DEFAULT_COST: (from: Point2D, to: Point2D) => number = () => 1;

/** Grid-based graph search. Defaults to A* with Manhattan distance heuristic. */
export function gridSearch(
  graph: GridGraph,
  start: Point2D,
  goal: Point2D,
  options?: Partial<SearchOptions>,
): PlanResult {
  const algorithm = options?.algorithm ?? 'astar';

  // Validate start and goal
  if (
    start.x < 0 || start.x >= graph.width ||
    start.y < 0 || start.y >= graph.height ||
    graph.isBlocked(start.x, start.y)
  ) {
    return { path: [], cost: 0, success: false, nodesExplored: 0 };
  }
  if (
    goal.x < 0 || goal.x >= graph.width ||
    goal.y < 0 || goal.y >= graph.height ||
    graph.isBlocked(goal.x, goal.y)
  ) {
    return { path: [], cost: 0, success: false, nodesExplored: 0 };
  }

  const costFn = options?.costFn ?? DEFAULT_COST;

  if (algorithm === 'bfs') {
    return bfs(graph, start, goal);
  }
  if (algorithm === 'dijkstra') {
    return dijkstra(graph, start, goal, costFn);
  }
  const heuristicFn = options?.heuristicFn ?? manhattanDistance;
  return astar(graph, start, goal, costFn, heuristicFn);
}
