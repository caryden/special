/**
 * Path planning dispatcher.
 *
 * Provides a unified interface for 2D path planning using one of multiple
 * methods: grid-based search (A-star, Dijkstra, BFS), RRT, RRT-star, PRM,
 * or D-star Lite.
 *
 * @node plan-path
 * @depends-on result-types, any-of(graph-search, rrt, rrt-star, prm, d-star)
 * @contract plan-path.test.ts
 * @hint dispatcher: Thin routing layer — all real logic lives in downstream nodes.
 * @hint default: Uses 'rrt' if no method specified.
 */

import type { Point2D, PlanResult } from './result-types.ts';
import {
  gridSearch,
  type GridGraph,
  type SearchOptions,
} from './graph-search.ts';
import { rrtPlan, type RRTConfig, DEFAULT_RRT_CONFIG, type CollisionChecker } from './rrt.ts';
import { rrtStarPlan, type RRTStarConfig, DEFAULT_RRT_STAR_CONFIG } from './rrt-star.ts';
import { prmPlan, type PRMConfig, DEFAULT_PRM_CONFIG } from './prm.ts';
import { dStarInit, dStarPlan } from './d-star.ts';

/** Available path planning methods */
export type PlanMethod = 'astar' | 'dijkstra' | 'bfs' | 'rrt' | 'rrt-star' | 'prm' | 'd-star';

/** Unified path planning options */
export interface PlanPathOptions {
  /** Planning method (default: 'rrt') */
  method?: PlanMethod;

  // --- Grid search options (astar, dijkstra, bfs, d-star) ---
  /** Grid graph for grid-based methods */
  grid?: GridGraph;
  /** Grid width for D* Lite (alternative to grid) */
  gridWidth?: number;
  /** Grid height for D* Lite (alternative to grid) */
  gridHeight?: number;
  /** Obstacles as point array (for D* Lite) */
  obstacles?: Point2D[];

  // --- Sampling-based options (rrt, rrt-star, prm) ---
  /** Workspace bounds for sampling-based planners */
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  /** Collision checker for sampling-based planners */
  isCollisionFree?: CollisionChecker;
  /** RNG seed for reproducibility */
  seed?: number;
  /** Step size for tree extension */
  stepSize?: number;
  /** Goal bias probability */
  goalBias?: number;
  /** Maximum iterations / samples */
  maxIterations?: number;
  /** Goal radius for connection */
  goalRadius?: number;
  /** Rewire gamma (RRT* only) */
  rewireGamma?: number;
  /** Number of PRM samples */
  numSamples?: number;
  /** K-nearest neighbors for PRM */
  kNeighbors?: number;
  /** Connection radius for PRM */
  connectionRadius?: number;
}

/**
 * Plan a path from start to goal using the specified method.
 *
 * For grid-based methods (astar, dijkstra, bfs), a GridGraph must be provided.
 * For sampling-based methods (rrt, rrt-star, prm), bounds and a collision
 * checker must be provided.
 * For D* Lite, either a grid or gridWidth/gridHeight must be provided.
 *
 * @param start  Start position
 * @param goal  Goal position
 * @param options  Planner options including method selection
 * @returns PlanResult with path, cost, success flag, and nodes explored
 */
export function planPath(
  start: Point2D,
  goal: Point2D,
  options: PlanPathOptions = {},
): PlanResult {
  const method = options.method ?? 'rrt';
  const fail: PlanResult = { path: [], cost: Infinity, success: false, nodesExplored: 0 };

  if (method === 'astar' || method === 'dijkstra' || method === 'bfs') {
    if (!options.grid) return fail;
    const searchOpts: Partial<SearchOptions> = { algorithm: method };
    return gridSearch(options.grid, start, goal, searchOpts);
  }

  if (method === 'rrt') {
    if (!options.bounds || !options.isCollisionFree) return fail;
    const config: RRTConfig = {
      ...DEFAULT_RRT_CONFIG,
      ...(options.stepSize !== undefined && { stepSize: options.stepSize }),
      ...(options.goalBias !== undefined && { goalBias: options.goalBias }),
      ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
      ...(options.goalRadius !== undefined && { goalRadius: options.goalRadius }),
    };
    const result = rrtPlan(start, goal, options.bounds, options.isCollisionFree, config, options.seed);
    return { path: result.path, cost: result.cost, success: result.success, nodesExplored: result.nodesExplored };
  }

  if (method === 'rrt-star') {
    if (!options.bounds || !options.isCollisionFree) return fail;
    const config: RRTStarConfig = {
      ...DEFAULT_RRT_STAR_CONFIG,
      ...(options.stepSize !== undefined && { stepSize: options.stepSize }),
      ...(options.goalBias !== undefined && { goalBias: options.goalBias }),
      ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
      ...(options.goalRadius !== undefined && { goalRadius: options.goalRadius }),
      ...(options.rewireGamma !== undefined && { rewireGamma: options.rewireGamma }),
    };
    const result = rrtStarPlan(start, goal, options.bounds, options.isCollisionFree, config, options.seed);
    return { path: result.path, cost: result.cost, success: result.success, nodesExplored: result.nodesExplored };
  }

  if (method === 'prm') {
    if (!options.bounds || !options.isCollisionFree) return fail;
    const config: PRMConfig = {
      ...DEFAULT_PRM_CONFIG,
      ...(options.numSamples !== undefined && { numSamples: options.numSamples }),
      ...(options.kNeighbors !== undefined && { kNeighbors: options.kNeighbors }),
      ...(options.connectionRadius !== undefined && { connectionRadius: options.connectionRadius }),
    };
    return prmPlan(start, goal, options.bounds, options.isCollisionFree, config, options.seed);
  }

  // d-star
  const width = options.gridWidth ?? (options.grid ? options.grid.width : 0);
  const height = options.gridHeight ?? (options.grid ? options.grid.height : 0);
  if (width <= 0 || height <= 0) return fail;
  const state = dStarInit(width, height, start, goal, options.obstacles);
  return dStarPlan(state);
}
