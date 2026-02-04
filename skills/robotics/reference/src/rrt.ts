/**
 * Rapidly-exploring Random Tree (RRT) path planner.
 *
 * Sampling-based motion planner that grows a tree from the start toward
 * the goal by randomly sampling the configuration space.
 *
 * @node rrt
 * @depends-on result-types
 * @contract rrt.test.ts
 * @hint seed: Accept optional RNG seed for reproducible tests
 * @hint defaults: stepSize=0.5, goalBias=0.05, maxIterations=1000
 * @hint off-policy: RRT vs RRT* vs PRM — RRT is simplest, not optimal.
 *       Use RRT* for asymptotically optimal paths.
 * @provenance LaValle "Rapidly-Exploring Random Trees: A New Tool for Path Planning" 1998,
 *       PythonRobotics (cross-validation), OMPL v1.7.0
 */

import type { Point2D, PlanResult } from './result-types.ts';
import { point2d } from './result-types.ts';

/** RRT configuration */
export interface RRTConfig {
  /** Maximum step size for tree extension */
  stepSize: number;
  /** Probability of sampling the goal directly (0-1) */
  goalBias: number;
  /** Maximum number of iterations */
  maxIterations: number;
  /** Goal acceptance radius */
  goalRadius: number;
}

/** Default RRT configuration */
export const DEFAULT_RRT_CONFIG: RRTConfig = {
  stepSize: 0.5,
  goalBias: 0.05,
  maxIterations: 1000,
  goalRadius: 0.5,
};

/** A node in the RRT tree */
export interface RRTNode {
  point: Point2D;
  parent: number; // index of parent node, -1 for root
  cost: number;   // cost from root to this node
}

/** Collision checker function type */
export type CollisionChecker = (from: Point2D, to: Point2D) => boolean;

/** Simple seeded PRNG (Mulberry32) for reproducible tests */
export function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Find the nearest node in the tree to a given point.
 */
export function rrtNearestNode(tree: RRTNode[], point: Point2D): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < tree.length; i++) {
    const d = dist2d(tree[i].point, point);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Steer from a point toward a target, limiting the distance to stepSize.
 */
export function rrtSteer(from: Point2D, toward: Point2D, stepSize: number): Point2D {
  const d = dist2d(from, toward);
  if (d <= stepSize) return toward;
  const ratio = stepSize / d;
  return point2d(
    from.x + ratio * (toward.x - from.x),
    from.y + ratio * (toward.y - from.y),
  );
}

/**
 * Extract path from tree by tracing parent pointers from goal node to root.
 */
export function rrtExtractPath(tree: RRTNode[], goalIdx: number): Point2D[] {
  const path: Point2D[] = [];
  let idx = goalIdx;
  while (idx !== -1) {
    path.push(tree[idx].point);
    idx = tree[idx].parent;
  }
  path.reverse();
  return path;
}

/**
 * Run RRT planning algorithm.
 *
 * @param start  Start position
 * @param goal  Goal position
 * @param bounds  Search space bounds { minX, maxX, minY, maxY }
 * @param isCollisionFree  Function that returns true if the path from→to is collision-free
 * @param config  RRT configuration
 * @param seed  Optional random seed for reproducibility
 * @returns PlanResult with path, cost, success status, and nodes explored
 */
export function rrtPlan(
  start: Point2D,
  goal: Point2D,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  isCollisionFree: CollisionChecker,
  config: RRTConfig = DEFAULT_RRT_CONFIG,
  seed?: number,
): PlanResult & { tree: RRTNode[] } {
  const { stepSize, goalBias, maxIterations, goalRadius } = config;
  const rng = seed !== undefined ? createRNG(seed) : Math.random;

  const tree: RRTNode[] = [{ point: start, parent: -1, cost: 0 }];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Sample random point (with goal bias)
    let sample: Point2D;
    if (rng() < goalBias) {
      sample = goal;
    } else {
      sample = point2d(
        bounds.minX + rng() * (bounds.maxX - bounds.minX),
        bounds.minY + rng() * (bounds.maxY - bounds.minY),
      );
    }

    // Find nearest node
    const nearestIdx = rrtNearestNode(tree, sample);
    const nearest = tree[nearestIdx];

    // Steer toward sample
    const newPoint = rrtSteer(nearest.point, sample, stepSize);

    // Check collision
    if (!isCollisionFree(nearest.point, newPoint)) continue;

    // Add node to tree
    const newCost = nearest.cost + dist2d(nearest.point, newPoint);
    tree.push({ point: newPoint, parent: nearestIdx, cost: newCost });

    // Check if goal reached
    if (dist2d(newPoint, goal) <= goalRadius) {
      // Add goal node if not exactly at goal
      let goalIdx = tree.length - 1;
      if (dist2d(newPoint, goal) > 1e-10) {
        if (isCollisionFree(newPoint, goal)) {
          tree.push({ point: goal, parent: goalIdx, cost: newCost + dist2d(newPoint, goal) });
          goalIdx = tree.length - 1;
        }
      }
      const path = rrtExtractPath(tree, goalIdx);
      return {
        path,
        cost: tree[goalIdx].cost,
        success: true,
        nodesExplored: tree.length,
        tree,
      };
    }
  }

  // Failed to reach goal
  return {
    path: [],
    cost: Infinity,
    success: false,
    nodesExplored: tree.length,
    tree,
  };
}

/** Euclidean distance between two 2D points. */
export function dist2d(a: Point2D, b: Point2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Create a grid-based collision checker.
 *
 * Returns a CollisionChecker that checks whether a straight line between
 * two points passes through any obstacle cell in the grid.
 *
 * @param grid  2D boolean array (true = obstacle)
 * @param resolution  Grid cell size (meters)
 * @param origin  Grid origin position in world coordinates
 */
export function createGridCollisionChecker(
  grid: boolean[][],
  resolution: number,
  origin: Point2D = point2d(0, 0),
): CollisionChecker {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  return (from: Point2D, to: Point2D): boolean => {
    // Check points along the line at sub-cell resolution
    const d = dist2d(from, to);
    const steps = Math.max(1, Math.ceil(d / (resolution * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = from.x + t * (to.x - from.x);
      const py = from.y + t * (to.y - from.y);
      const col = Math.floor((px - origin.x) / resolution);
      const row = Math.floor((py - origin.y) / resolution);
      if (row < 0 || row >= rows || col < 0 || col >= cols) continue;
      if (grid[row][col]) return false; // collision
    }
    return true;
  };
}
