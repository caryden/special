/**
 * Probabilistic Roadmap (PRM) planner for multi-query path planning.
 *
 * PRM constructs a roadmap graph in a preprocessing phase by sampling random
 * configurations and connecting nearby collision-free pairs. Queries then
 * search this graph using A* or Dijkstra.
 *
 * Two-phase approach:
 *   1. Build: sample N points, connect k-nearest neighbors if collision-free
 *   2. Query: connect start/goal to roadmap, search for shortest path
 *
 * @node prm
 * @depends-on result-types, rrt
 * @contract prm.test.ts
 * @hint multi-query: Build once, query many times — amortizes construction cost.
 * @hint off-policy: PRM vs RRT — PRM is better for multi-query scenarios;
 *       RRT is better for single-query with narrow passages.
 * @provenance Kavraki et al. "Probabilistic roadmaps for path planning in
 *       high-dimensional configuration spaces" 1996, OMPL v1.7.0
 */

import type { Point2D, PlanResult } from './result-types.ts';
import { point2d } from './result-types.ts';
import { createRNG, dist2d, type CollisionChecker } from './rrt.ts';

/** A node in the PRM roadmap */
export interface PRMNode {
  point: Point2D;
  /** Indices of connected neighbors */
  neighbors: number[];
}

/** PRM configuration */
export interface PRMConfig {
  /** Number of samples to generate */
  numSamples: number;
  /** Maximum number of nearest neighbors to attempt connections to */
  kNeighbors: number;
  /** Maximum connection distance */
  connectionRadius: number;
}

/** Default PRM configuration */
export const DEFAULT_PRM_CONFIG: PRMConfig = {
  numSamples: 200,
  kNeighbors: 10,
  connectionRadius: 5.0,
};

/** A built PRM roadmap */
export interface PRMRoadmap {
  nodes: PRMNode[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  isCollisionFree: CollisionChecker;
}

/**
 * Build a PRM roadmap by sampling and connecting nodes.
 */
export function prmBuild(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  isCollisionFree: CollisionChecker,
  config: PRMConfig = DEFAULT_PRM_CONFIG,
  seed: number = 0,
): PRMRoadmap {
  const rng = createRNG(seed);
  const nodes: PRMNode[] = [];

  // Sample random points
  for (let i = 0; i < config.numSamples; i++) {
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + rng() * (bounds.maxY - bounds.minY);
    nodes.push({ point: point2d(x, y), neighbors: [] });
  }

  // Connect k-nearest neighbors within connection radius
  for (let i = 0; i < nodes.length; i++) {
    const distances = nodes
      .map((n, j) => ({ index: j, dist: dist2d(nodes[i].point, n.point) }))
      .filter((d) => d.index !== i && d.dist <= config.connectionRadius)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, config.kNeighbors);

    for (const d of distances) {
      if (
        !nodes[i].neighbors.includes(d.index) &&
        isCollisionFree(nodes[i].point, nodes[d.index].point)
      ) {
        nodes[i].neighbors.push(d.index);
        nodes[d.index].neighbors.push(i);
      }
    }
  }

  return { nodes, bounds, isCollisionFree };
}

/**
 * Connect a point to the nearest reachable node in the roadmap.
 * Returns the index of the connected node, or -1 if no connection possible.
 */
function connectToRoadmap(
  roadmap: PRMRoadmap,
  point: Point2D,
  connectionRadius: number,
): number {
  let bestIdx = -1;
  let bestDist = Infinity;

  for (let i = 0; i < roadmap.nodes.length; i++) {
    const d = dist2d(point, roadmap.nodes[i].point);
    if (d < bestDist && d <= connectionRadius && roadmap.isCollisionFree(point, roadmap.nodes[i].point)) {
      bestDist = d;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Query the PRM roadmap for a path from start to goal.
 *
 * Connects start and goal to the roadmap, then runs Dijkstra on the graph.
 */
export function prmQuery(
  roadmap: PRMRoadmap,
  start: Point2D,
  goal: Point2D,
  connectionRadius: number = 5.0,
): PlanResult {
  const fail: PlanResult = { path: [], cost: Infinity, success: false, nodesExplored: 0 };

  const startIdx = connectToRoadmap(roadmap, start, connectionRadius);
  if (startIdx < 0) return fail;

  const goalIdx = connectToRoadmap(roadmap, goal, connectionRadius);
  if (goalIdx < 0) return fail;

  // Dijkstra on the roadmap graph
  const n = roadmap.nodes.length;
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);

  dist[startIdx] = 0;
  let nodesExplored = 0;

  for (let iter = 0; iter < n; iter++) {
    // Find unvisited node with smallest distance
    let u = -1;
    let uDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < uDist) {
        u = i;
        uDist = dist[i];
      }
    }

    if (u < 0 || u === goalIdx) break;

    visited[u] = true;
    nodesExplored++;

    for (const v of roadmap.nodes[u].neighbors) {
      if (visited[v]) continue;
      const edgeCost = dist2d(roadmap.nodes[u].point, roadmap.nodes[v].point);
      const newDist = dist[u] + edgeCost;
      if (newDist < dist[v]) {
        dist[v] = newDist;
        parent[v] = u;
      }
    }
  }

  if (dist[goalIdx] === Infinity) return fail;

  // Extract path
  const pathIndices: number[] = [];
  let curr = goalIdx;
  while (curr >= 0) {
    pathIndices.push(curr);
    curr = parent[curr];
  }
  pathIndices.reverse();

  const path: Point2D[] = [start];
  for (const idx of pathIndices) {
    path.push(roadmap.nodes[idx].point);
  }
  path.push(goal);

  // Compute total cost including start-to-roadmap and roadmap-to-goal edges
  const totalCost =
    dist2d(start, roadmap.nodes[startIdx].point) +
    dist[goalIdx] +
    dist2d(roadmap.nodes[goalIdx].point, goal);

  return { path, cost: totalCost, success: true, nodesExplored };
}

/**
 * One-shot PRM: build and query in a single call.
 */
export function prmPlan(
  start: Point2D,
  goal: Point2D,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  isCollisionFree: CollisionChecker,
  config: PRMConfig = DEFAULT_PRM_CONFIG,
  seed: number = 0,
): PlanResult {
  const roadmap = prmBuild(bounds, isCollisionFree, config, seed);
  return prmQuery(roadmap, start, goal, config.connectionRadius);
}
