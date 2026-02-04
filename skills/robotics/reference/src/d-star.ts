/**
 * D* Lite algorithm for incremental replanning in dynamic environments.
 *
 * D* Lite efficiently replans paths when edge costs change (e.g., new obstacles
 * detected). It searches backward from the goal and propagates cost changes
 * incrementally, avoiding full replanning from scratch.
 *
 * Key concepts:
 *   - rhs(s): one-step lookahead cost (min over successors)
 *   - g(s): cost-to-come estimate
 *   - A node is consistent when g(s) = rhs(s)
 *   - Priority queue uses keys: [min(g, rhs) + h; min(g, rhs)]
 *
 * @node d-star
 * @depends-on result-types
 * @contract d-star.test.ts
 * @hint incremental: Only reprocesses affected nodes when costs change.
 * @hint backward: Searches from goal to start (opposite of A*).
 * @hint off-policy: D* Lite vs D* vs LPA* — D* Lite is simpler than D* and
 *       equivalent to LPA* with goal-directed heuristic.
 * @provenance Koenig & Likhachev "D* Lite" AAAI 2002, PythonRobotics
 */

import type { Point2D, PlanResult } from './result-types.ts';
import { point2d } from './result-types.ts';

/** Grid cell for D* Lite */
interface DStarCell {
  g: number;
  rhs: number;
}

/** D* Lite planner state (mutable, supports incremental replanning) */
export interface DStarState {
  /** Grid width */
  width: number;
  /** Grid height */
  height: number;
  /** Start position */
  start: Point2D;
  /** Goal position */
  goal: Point2D;
  /** Cell data indexed by key string */
  cells: Map<string, DStarCell>;
  /** Priority queue entries: [key1, key2, x, y] */
  queue: [number, number, number, number][];
  /** Blocked cells */
  blocked: Set<string>;
  /** Key modifier for incremental replanning */
  km: number;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function getCell(state: DStarState, x: number, y: number): DStarCell {
  const key = cellKey(x, y);
  let cell = state.cells.get(key);
  if (!cell) {
    cell = { g: Infinity, rhs: Infinity };
    state.cells.set(key, cell);
  }
  return cell;
}

function heuristic(a: Point2D, b: Point2D): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function calcKey(state: DStarState, x: number, y: number): [number, number] {
  const cell = getCell(state, x, y);
  const minVal = Math.min(cell.g, cell.rhs);
  return [minVal + heuristic(point2d(x, y), state.start) + state.km, minVal];
}

function compareKeys(a: [number, number], b: [number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

function keyLess(a: [number, number], b: [number, number]): boolean {
  return compareKeys(a, b) < 0;
}

/** 4-connected neighbors */
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

function neighbors(state: DStarState, x: number, y: number): [number, number][] {
  const result: [number, number][] = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height) {
      result.push([nx, ny]);
    }
  }
  return result;
}

function queueInsert(state: DStarState, x: number, y: number): void {
  const key = calcKey(state, x, y);
  state.queue.push([key[0], key[1], x, y]);
}

function queueRemove(state: DStarState, x: number, y: number): void {
  state.queue = state.queue.filter((e) => !(e[2] === x && e[3] === y));
}

function queueContains(state: DStarState, x: number, y: number): boolean {
  return state.queue.some((e) => e[2] === x && e[3] === y);
}

function queueTopKey(state: DStarState): [number, number] {
  if (state.queue.length === 0) return [Infinity, Infinity];
  let best: [number, number] = [state.queue[0][0], state.queue[0][1]];
  for (let i = 1; i < state.queue.length; i++) {
    const k: [number, number] = [state.queue[i][0], state.queue[i][1]];
    if (keyLess(k, best)) best = k;
  }
  return best;
}

function queuePop(state: DStarState): [number, number, number, number] {
  let bestIdx = 0;
  let bestKey: [number, number] = [state.queue[0][0], state.queue[0][1]];
  for (let i = 1; i < state.queue.length; i++) {
    const k: [number, number] = [state.queue[i][0], state.queue[i][1]];
    if (keyLess(k, bestKey)) {
      bestIdx = i;
      bestKey = k;
    }
  }
  const entry = state.queue[bestIdx];
  state.queue.splice(bestIdx, 1);
  return entry;
}

function updateVertex(state: DStarState, x: number, y: number): void {
  const cell = getCell(state, x, y);
  if (!(x === state.goal.x && y === state.goal.y)) {
    let minRhs = Infinity;
    if (!state.blocked.has(cellKey(x, y))) {
      for (const [nx, ny] of neighbors(state, x, y)) {
        if (!state.blocked.has(cellKey(nx, ny))) {
          const nCell = getCell(state, nx, ny);
          const cost = 1; // uniform cost
          minRhs = Math.min(minRhs, nCell.g + cost);
        }
      }
    }
    cell.rhs = minRhs;
  }

  if (queueContains(state, x, y)) {
    queueRemove(state, x, y);
  }

  if (cell.g !== cell.rhs) {
    queueInsert(state, x, y);
  }
}

function computeShortestPath(state: DStarState): number {
  let nodesExplored = 0;
  const startCell = getCell(state, state.start.x, state.start.y);
  const maxIter = state.width * state.height * 2;

  for (let iter = 0; iter < maxIter && state.queue.length > 0; iter++) {
    const topKey = queueTopKey(state);
    const startKey = calcKey(state, state.start.x, state.start.y);

    if (!keyLess(topKey, startKey) && startCell.rhs === startCell.g) {
      break;
    }

    const entry = queuePop(state);
    const [, , x, y] = entry;
    const cell = getCell(state, x, y);
    nodesExplored++;

    if (cell.g > cell.rhs) {
      cell.g = cell.rhs;
      for (const [nx, ny] of neighbors(state, x, y)) {
        updateVertex(state, nx, ny);
      }
    } else {
      cell.g = Infinity;
      updateVertex(state, x, y);
      for (const [nx, ny] of neighbors(state, x, y)) {
        updateVertex(state, nx, ny);
      }
    }
  }

  return nodesExplored;
}

/**
 * Initialize D* Lite planner state.
 */
export function dStarInit(
  width: number,
  height: number,
  start: Point2D,
  goal: Point2D,
  obstacles?: Point2D[],
): DStarState {
  const blocked = new Set<string>();
  if (obstacles) {
    for (const o of obstacles) {
      blocked.add(cellKey(o.x, o.y));
    }
  }

  const state: DStarState = {
    width,
    height,
    start: point2d(start.x, start.y),
    goal: point2d(goal.x, goal.y),
    cells: new Map(),
    queue: [],
    blocked,
    km: 0,
  };

  const goalCell = getCell(state, goal.x, goal.y);
  goalCell.rhs = 0;
  queueInsert(state, goal.x, goal.y);

  return state;
}

/**
 * Plan initial path using D* Lite.
 */
export function dStarPlan(state: DStarState): PlanResult {
  const nodesExplored = computeShortestPath(state);
  return extractPath(state, nodesExplored);
}

/**
 * Update the planner when obstacles change, then replan.
 *
 * @param state  D* Lite planner state (mutated in place)
 * @param addedObstacles  Newly discovered obstacles
 * @param removedObstacles  Obstacles that were cleared
 * @param newStart  Optional new start position (if robot has moved)
 * @returns Updated plan result
 */
export function dStarReplan(
  state: DStarState,
  addedObstacles: Point2D[],
  removedObstacles: Point2D[],
  newStart?: Point2D,
): PlanResult {
  const oldStart = state.start;
  if (newStart) {
    state.start = point2d(newStart.x, newStart.y);
  }
  state.km += heuristic(oldStart, state.start);

  // Process added obstacles
  for (const o of addedObstacles) {
    state.blocked.add(cellKey(o.x, o.y));
    updateVertex(state, o.x, o.y);
    for (const [nx, ny] of neighbors(state, o.x, o.y)) {
      updateVertex(state, nx, ny);
    }
  }

  // Process removed obstacles
  for (const o of removedObstacles) {
    state.blocked.delete(cellKey(o.x, o.y));
    updateVertex(state, o.x, o.y);
    for (const [nx, ny] of neighbors(state, o.x, o.y)) {
      updateVertex(state, nx, ny);
    }
  }

  const nodesExplored = computeShortestPath(state);
  return extractPath(state, nodesExplored);
}

function extractPath(state: DStarState, nodesExplored: number): PlanResult {
  const startCell = getCell(state, state.start.x, state.start.y);
  if (startCell.g === Infinity) {
    return { path: [], cost: Infinity, success: false, nodesExplored };
  }

  const path: Point2D[] = [point2d(state.start.x, state.start.y)];
  let cx = state.start.x;
  let cy = state.start.y;
  const maxSteps = state.width * state.height;

  for (let step = 0; step < maxSteps; step++) {
    if (cx === state.goal.x && cy === state.goal.y) break;

    let bestX = cx;
    let bestY = cy;
    let bestG = Infinity;

    for (const [nx, ny] of neighbors(state, cx, cy)) {
      if (state.blocked.has(cellKey(nx, ny))) continue;
      const nCell = getCell(state, nx, ny);
      if (nCell.g < bestG) {
        bestG = nCell.g;
        bestX = nx;
        bestY = ny;
      }
    }

    if (bestX === cx && bestY === cy) break; // stuck
    cx = bestX;
    cy = bestY;
    path.push(point2d(cx, cy));
  }

  const reachedGoal = cx === state.goal.x && cy === state.goal.y;
  return {
    path: reachedGoal ? path : [],
    cost: reachedGoal ? startCell.g : Infinity,
    success: reachedGoal,
    nodesExplored,
  };
}
