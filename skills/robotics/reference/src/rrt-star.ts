/**
 * RRT* (RRT-Star): optimal RRT with rewiring.
 *
 * Extends standard RRT with:
 * 1. Near-neighbor search within a radius
 * 2. Cost-based parent selection (choose lowest-cost parent)
 * 3. Rewiring (update children if a lower-cost path is found)
 *
 * This yields asymptotically optimal paths as iteration count increases.
 *
 * @node rrt-star
 * @depends-on result-types, rrt
 * @contract rrt-star.test.ts
 * @hint extends: Adds rewiring step after nearest-neighbor extension
 * @hint radius: Near radius = gamma * (log(n)/n)^(1/d) where d=2 for 2D
 * @provenance Karaman & Frazzoli "Sampling-based Algorithms for Optimal Motion Planning" 2011,
 *       PythonRobotics (cross-validation), OMPL v1.7.0
 */

import type { Point2D, PlanResult } from './result-types.ts';
import { point2d } from './result-types.ts';
import {
  type RRTNode,
  type RRTConfig,
  type CollisionChecker,
  DEFAULT_RRT_CONFIG,
  rrtSteer,
  rrtExtractPath,
  rrtNearestNode,
  createRNG,
  dist2d,
} from './rrt.ts';

/** RRT* configuration (extends RRT config) */
export interface RRTStarConfig extends RRTConfig {
  /** Rewiring radius scaling factor (gamma). Higher = larger search radius. */
  rewireGamma: number;
}

/** Default RRT* configuration */
export const DEFAULT_RRT_STAR_CONFIG: RRTStarConfig = {
  ...DEFAULT_RRT_CONFIG,
  rewireGamma: 50.0,
};

/**
 * Find all nodes within a given radius of a point.
 *
 * @returns Array of node indices within the radius
 */
export function rrtStarNearNodes(
  tree: RRTNode[],
  point: Point2D,
  radius: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < tree.length; i++) {
    if (dist2d(tree[i].point, point) <= radius) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Compute the adaptive rewiring radius.
 *
 * r = gamma * (log(n) / n)^(1/d)
 *
 * where n = number of nodes, d = 2 for 2D, gamma = rewireGamma
 */
export function rrtStarRadius(n: number, gamma: number): number {
  if (n <= 1) return Infinity;
  return gamma * Math.sqrt(Math.log(n) / n);
}

/**
 * Run RRT* planning algorithm.
 *
 * @param start  Start position
 * @param goal  Goal position
 * @param bounds  Search space bounds
 * @param isCollisionFree  Collision checker
 * @param config  RRT* configuration
 * @param seed  Optional random seed
 * @returns PlanResult with optimized path, cost, and statistics
 */
export function rrtStarPlan(
  start: Point2D,
  goal: Point2D,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  isCollisionFree: CollisionChecker,
  config: RRTStarConfig = DEFAULT_RRT_STAR_CONFIG,
  seed?: number,
): PlanResult & { tree: RRTNode[] } {
  const { stepSize, goalBias, maxIterations, goalRadius, rewireGamma } = config;
  const rng = seed !== undefined ? createRNG(seed) : Math.random;

  const tree: RRTNode[] = [{ point: start, parent: -1, cost: 0 }];
  let bestGoalIdx = -1;
  let bestGoalCost = Infinity;

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

    // Find nearest node and steer
    const nearestIdx = rrtNearestNode(tree, sample);
    const nearest = tree[nearestIdx];
    const newPoint = rrtSteer(nearest.point, sample, stepSize);

    // Check collision from nearest to new point
    if (!isCollisionFree(nearest.point, newPoint)) continue;

    // Find near neighbors
    const radius = rrtStarRadius(tree.length, rewireGamma);
    const nearIndices = rrtStarNearNodes(tree, newPoint, radius);

    // Choose best parent from near neighbors
    let bestParent = nearestIdx;
    let bestCost = nearest.cost + dist2d(nearest.point, newPoint);

    for (const idx of nearIndices) {
      const candidate = tree[idx];
      const candidateCost = candidate.cost + dist2d(candidate.point, newPoint);
      if (candidateCost < bestCost && isCollisionFree(candidate.point, newPoint)) {
        bestParent = idx;
        bestCost = candidateCost;
      }
    }

    // Add new node
    const newIdx = tree.length;
    tree.push({ point: newPoint, parent: bestParent, cost: bestCost });

    // Rewire near neighbors
    for (const idx of nearIndices) {
      if (idx === bestParent) continue;
      const neighbor = tree[idx];
      const newNeighborCost = bestCost + dist2d(newPoint, neighbor.point);
      if (newNeighborCost < neighbor.cost && isCollisionFree(newPoint, neighbor.point)) {
        tree[idx] = { ...neighbor, parent: newIdx, cost: newNeighborCost };
        // Propagate cost updates to descendants
        propagateCostUpdate(tree, idx);
      }
    }

    // Check if goal reached
    const goalDist = dist2d(newPoint, goal);
    if (goalDist <= goalRadius) {
      const goalCost = bestCost + (goalDist > 1e-10 ? goalDist : 0);
      if (goalCost < bestGoalCost) {
        if (goalDist > 1e-10) {
          if (isCollisionFree(newPoint, goal)) {
            tree.push({ point: goal, parent: newIdx, cost: goalCost });
            bestGoalIdx = tree.length - 1;
            bestGoalCost = goalCost;
          }
        } else {
          bestGoalIdx = newIdx;
          bestGoalCost = goalCost;
        }
      }
    }
  }

  if (bestGoalIdx === -1) {
    return {
      path: [],
      cost: Infinity,
      success: false,
      nodesExplored: tree.length,
      tree,
    };
  }

  const path = rrtExtractPath(tree, bestGoalIdx);
  return {
    path,
    cost: bestGoalCost,
    success: true,
    nodesExplored: tree.length,
    tree,
  };
}

/**
 * Propagate cost update through the tree after rewiring.
 */
function propagateCostUpdate(tree: RRTNode[], nodeIdx: number): void {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].parent === nodeIdx) {
      const parentCost = tree[nodeIdx].cost;
      const edgeCost = dist2d(tree[nodeIdx].point, tree[i].point);
      tree[i] = { ...tree[i], cost: parentCost + edgeCost };
      propagateCostUpdate(tree, i);
    }
  }
}
