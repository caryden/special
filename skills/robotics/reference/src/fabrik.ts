/**
 * FABRIK (Forward And Backward Reaching Inverse Kinematics).
 *
 * A geometric iterative IK solver that works directly with joint positions
 * in Cartesian space. Does not require DH parameters or Jacobians.
 *
 * @node fabrik
 * @depends-on result-types
 * @contract fabrik.test.ts
 * @hint geometry: Works with joint positions directly — no DH parameters needed.
 * @hint algorithm: Alternates forward and backward reaching passes to converge.
 * @hint off-policy: FABRIK vs Jacobian IK vs CCD — FABRIK is fastest for simple
 *       chains but cannot handle orientation constraints easily.
 * @provenance Aristidou & Lasenby "FABRIK: A fast, iterative solver for the
 *       Inverse Kinematics problem" 2011
 */

import type { IKResult } from './result-types.ts';

/** 3D position for FABRIK joints. */
export interface FabrikPoint {
  x: number;
  y: number;
  z: number;
}

/** Configuration for the FABRIK solver. */
export interface FabrikConfig {
  /** Maximum number of iterations */
  maxIterations: number;
  /** Position error tolerance (meters) for convergence */
  tolerance: number;
}

/** Default FABRIK configuration. */
export const DEFAULT_FABRIK_CONFIG: FabrikConfig = {
  maxIterations: 100,
  tolerance: 1e-4,
};

/**
 * Compute link lengths from an array of joint positions.
 */
export function fabrikLinkLengths(positions: FabrikPoint[]): number[] {
  const lengths: number[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    lengths.push(fabrikDist(positions[i], positions[i + 1]));
  }
  return lengths;
}

/**
 * Compute the total reach of a chain (sum of all link lengths).
 */
export function fabrikTotalReach(linkLengths: number[]): number {
  let sum = 0;
  for (const l of linkLengths) sum += l;
  return sum;
}

/**
 * Solve IK using FABRIK algorithm.
 *
 * Given initial joint positions and a target for the end-effector,
 * iteratively adjusts positions to reach the target while preserving
 * link lengths.
 *
 * @param positions  Array of n+1 joint positions (base through end-effector)
 * @param target  Target position for the end-effector
 * @param config  Solver configuration
 * @returns Object with final positions, convergence status, error, and iterations
 */
export function fabrikSolve(
  positions: FabrikPoint[],
  target: FabrikPoint,
  config: FabrikConfig = DEFAULT_FABRIK_CONFIG,
): { positions: FabrikPoint[]; converged: boolean; error: number; iterations: number } {
  const n = positions.length;
  if (n < 2) {
    throw new Error('FABRIK requires at least 2 positions (1 link)');
  }

  const linkLengths = fabrikLinkLengths(positions);
  const totalReach = fabrikTotalReach(linkLengths);
  const baseToTarget = fabrikDist(positions[0], target);

  // Check if target is reachable
  if (baseToTarget > totalReach) {
    // Target unreachable — stretch chain toward target
    const result = positions.slice().map(p => ({ ...p }));
    for (let i = 0; i < linkLengths.length; i++) {
      const r = fabrikDist(result[i], target);
      const lambda = linkLengths[i] / r;
      result[i + 1] = {
        x: (1 - lambda) * result[i].x + lambda * target.x,
        y: (1 - lambda) * result[i].y + lambda * target.y,
        z: (1 - lambda) * result[i].z + lambda * target.z,
      };
    }
    const error = fabrikDist(result[n - 1], target);
    return { positions: result, converged: false, error, iterations: 0 };
  }

  // FABRIK main loop
  const pts = positions.slice().map(p => ({ ...p }));
  const base = { ...positions[0] };
  let error = fabrikDist(pts[n - 1], target);
  let iter = 0;

  for (iter = 0; iter < config.maxIterations; iter++) {
    error = fabrikDist(pts[n - 1], target);
    if (error < config.tolerance) {
      break;
    }

    // Forward reaching: set end-effector to target, work backward
    pts[n - 1] = { ...target };
    for (let i = n - 2; i >= 0; i--) {
      const r = fabrikDist(pts[i], pts[i + 1]);
      const lambda = linkLengths[i] / r;
      pts[i] = {
        x: (1 - lambda) * pts[i + 1].x + lambda * pts[i].x,
        y: (1 - lambda) * pts[i + 1].y + lambda * pts[i].y,
        z: (1 - lambda) * pts[i + 1].z + lambda * pts[i].z,
      };
    }

    // Backward reaching: set base to original, work forward
    pts[0] = { ...base };
    for (let i = 0; i < n - 1; i++) {
      const r = fabrikDist(pts[i], pts[i + 1]);
      const lambda = linkLengths[i] / r;
      pts[i + 1] = {
        x: (1 - lambda) * pts[i].x + lambda * pts[i + 1].x,
        y: (1 - lambda) * pts[i].y + lambda * pts[i + 1].y,
        z: (1 - lambda) * pts[i].z + lambda * pts[i + 1].z,
      };
    }
  }

  error = fabrikDist(pts[n - 1], target);
  return {
    positions: pts,
    converged: error < config.tolerance,
    error,
    iterations: iter,
  };
}

/**
 * Solve IK using FABRIK and return an IKResult (for compatibility with other IK solvers).
 *
 * Converts between joint-position representation and joint-angle representation.
 * Assumes a planar chain in the XY plane for angle extraction.
 *
 * @param linkLengths  Array of link lengths
 * @param target  Target position
 * @param config  Solver configuration
 * @returns IKResult with joint angles (relative angles between links)
 */
export function fabrikSolveAngles(
  linkLengths: number[],
  target: FabrikPoint,
  config: FabrikConfig = DEFAULT_FABRIK_CONFIG,
): IKResult {
  // Build initial straight-line positions along X
  const positions: FabrikPoint[] = [{ x: 0, y: 0, z: 0 }];
  let cumX = 0;
  for (const l of linkLengths) {
    cumX += l;
    positions.push({ x: cumX, y: 0, z: 0 });
  }

  const result = fabrikSolve(positions, target, config);

  // Extract joint angles (absolute angle of each link)
  const absoluteAngles: number[] = [];
  for (let i = 0; i < linkLengths.length; i++) {
    const dx = result.positions[i + 1].x - result.positions[i].x;
    const dy = result.positions[i + 1].y - result.positions[i].y;
    absoluteAngles.push(Math.atan2(dy, dx));
  }

  // Convert to relative angles
  const jointAngles: number[] = [absoluteAngles[0]];
  for (let i = 1; i < absoluteAngles.length; i++) {
    jointAngles.push(absoluteAngles[i] - absoluteAngles[i - 1]);
  }

  return {
    jointAngles,
    converged: result.converged,
    positionError: result.error,
    iterations: result.iterations,
  };
}

/** Euclidean distance between two 3D points. */
function fabrikDist(a: FabrikPoint, b: FabrikPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
