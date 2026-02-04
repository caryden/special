/**
 * SE(2) pose graph optimization via Gauss-Newton with optional
 * Levenberg-Marquardt damping.
 *
 * Optimizes a set of 2D poses connected by relative-pose constraints
 * (edges). Each edge carries a 3×3 information matrix weighting its
 * residual. Pose 0 is anchored (gauge freedom removed).
 *
 * @node pose-graph-optimization
 * @depends-on mat-ops
 * @contract pose-graph-optimization.test.ts
 * @hint solver: Gauss-Newton (solver='gn') or Levenberg-Marquardt (solver='lm').
 *       LM adds lambda to the diagonal of H before solving.
 * @hint anchoring: Pose 0 is fixed by zeroing its rows/columns in H and b,
 *       then setting the 3×3 diagonal block to identity.
 * @hint angles: All angles are wrapped to [-π, π] after each update.
 * @hint translation: SE(2) compose/inverse are lightweight — no Matrix needed.
 *       The 3N×3N linear system uses mat-ops for the solve step.
 * @provenance Grisetti, Kümmerle et al. "A Tutorial on Graph-Based SLAM"
 *       IEEE Intelligent Transportation Systems Magazine, 2010
 */

import {
  Matrix,
  matSolve,
  matZeros,
  matIdentity,
} from './mat-ops.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A 2D pose: position (x, y) and heading (theta) in radians. */
export interface Pose2D {
  x: number;
  y: number;
  theta: number;
}

/**
 * A relative-pose constraint between two poses.
 *
 * The measurement (dx, dy, dtheta) is the relative transform observed
 * between pose `from` and pose `to`, expressed in the frame of `from`.
 * The `information` matrix (3×3, symmetric positive-definite) weights
 * the residual.
 */
export interface PoseEdge {
  from: number;
  to: number;
  dx: number;
  dy: number;
  dtheta: number;
  information: Matrix;
}

/** Solver configuration. */
export interface PoseGraphConfig {
  /** 'gn' for Gauss-Newton, 'lm' for Levenberg-Marquardt. */
  solver: 'gn' | 'lm';
  /** Maximum number of iterations (default 100). */
  maxIterations: number;
  /** Convergence tolerance on ||δx|| (default 1e-6). */
  tolerance: number;
  /** LM damping parameter (only used when solver='lm', default 1e-3). */
  lambda: number;
}

/** Optimization result. */
export interface PoseGraphResult {
  /** Optimized poses. */
  poses: Pose2D[];
  /** Total weighted squared error after optimization. */
  totalError: number;
  /** Number of iterations performed. */
  iterations: number;
  /** Whether the solver converged (||δx|| < tolerance). */
  converged: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Wrap angle to [-π, π]. */
function normalizeAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

/** Compose two SE(2) transforms: T_a ⊕ T_b. */
function composeSE2(a: Pose2D, b: Pose2D): Pose2D {
  const c = Math.cos(a.theta);
  const s = Math.sin(a.theta);
  return {
    x: a.x + c * b.x - s * b.y,
    y: a.y + s * b.x + c * b.y,
    theta: normalizeAngle(a.theta + b.theta),
  };
}

/** Inverse of an SE(2) transform: T⁻¹. */
function inverseSE2(p: Pose2D): Pose2D {
  const c = Math.cos(p.theta);
  const s = Math.sin(p.theta);
  return {
    x: -(c * p.x + s * p.y),
    y: -(-s * p.x + c * p.y),
    theta: normalizeAngle(-p.theta),
  };
}

/**
 * Relative error: e_ij = (T_i⁻¹ ⊕ T_j) ⊖ z_ij
 * Returns a 3-element vector [ex, ey, etheta].
 */
function relativeError(
  pi: Pose2D,
  pj: Pose2D,
  z: { dx: number; dy: number; dtheta: number },
): [number, number, number] {
  const piInv = inverseSE2(pi);
  const delta = composeSE2(piInv, pj);
  return [
    delta.x - z.dx,
    delta.y - z.dy,
    normalizeAngle(delta.theta - z.dtheta),
  ];
}

/**
 * Analytical Jacobians of the error e_ij w.r.t. pose_i and pose_j.
 *
 * Returns [Ji (3×3), Jj (3×3)].
 *
 * Derivation follows Grisetti et al. 2010, §III-B.
 */
function edgeJacobians(
  pi: Pose2D,
  pj: Pose2D,
): [number[][], number[][]] {
  const ci = Math.cos(pi.theta);
  const si = Math.sin(pi.theta);
  const dxij = pj.x - pi.x;
  const dyij = pj.y - pi.y;

  // J_i = d e / d x_i
  const Ji: number[][] = [
    [-ci, -si, -si * dxij + ci * dyij],
    [si, -ci, -ci * dxij - si * dyij],
    [0, 0, -1],
  ];

  // J_j = d e / d x_j
  const Jj: number[][] = [
    [ci, si, 0],
    [-si, ci, 0],
    [0, 0, 1],
  ];

  return [Ji, Jj];
}

/**
 * Build the 3N×3N linear system H δx = -b from all edges.
 *
 * H is accumulated as a flat array (row-major, 3N×3N).
 * b is accumulated as a flat array (3N×1).
 */
function buildLinearSystem(
  poses: Pose2D[],
  edges: PoseEdge[],
): { H: number[]; b: number[]; totalError: number } {
  const n = poses.length;
  const dim = 3 * n;
  const H = new Array(dim * dim).fill(0);
  const b = new Array(dim).fill(0);
  let totalError = 0;

  for (const edge of edges) {
    const pi = poses[edge.from];
    const pj = poses[edge.to];
    const e = relativeError(pi, pj, edge);
    const [Ji, Jj] = edgeJacobians(pi, pj);
    const omega = edge.information;

    // Weighted error contribution: e^T Ω e
    // Compute Ω e first
    const omegaE = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        omegaE[r] += omega.get(r, c) * e[c];
      }
    }
    totalError += e[0] * omegaE[0] + e[1] * omegaE[1] + e[2] * omegaE[2];

    // Compute J^T Ω for Ji and Jj
    // JiT_Omega[3×3] = Ji^T * Omega
    const JiT_Omega = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const JjT_Omega = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let vi = 0;
        let vj = 0;
        for (let k = 0; k < 3; k++) {
          vi += Ji[k][r] * omega.get(k, c); // Ji^T row r, col c
          vj += Jj[k][r] * omega.get(k, c);
        }
        JiT_Omega[r][c] = vi;
        JjT_Omega[r][c] = vj;
      }
    }

    // Accumulate H blocks: H_ii += Ji^T Ω Ji, H_ij += Ji^T Ω Jj, etc.
    const bi = edge.from * 3;
    const bj = edge.to * 3;

    // H_ii += JiT_Omega * Ji
    // H_ij += JiT_Omega * Jj
    // H_ji += JjT_Omega * Ji
    // H_jj += JjT_Omega * Jj
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let hii = 0, hij = 0, hji = 0, hjj = 0;
        for (let k = 0; k < 3; k++) {
          hii += JiT_Omega[r][k] * Ji[k][c];
          hij += JiT_Omega[r][k] * Jj[k][c];
          hji += JjT_Omega[r][k] * Ji[k][c];
          hjj += JjT_Omega[r][k] * Jj[k][c];
        }
        H[(bi + r) * dim + (bi + c)] += hii;
        H[(bi + r) * dim + (bj + c)] += hij;
        H[(bj + r) * dim + (bi + c)] += hji;
        H[(bj + r) * dim + (bj + c)] += hjj;
      }
    }

    // b_i += JiT_Omega * e
    // b_j += JjT_Omega * e
    for (let r = 0; r < 3; r++) {
      let biv = 0, bjv = 0;
      for (let k = 0; k < 3; k++) {
        biv += JiT_Omega[r][k] * e[k];
        bjv += JjT_Omega[r][k] * e[k];
      }
      b[bi + r] += biv;
      b[bj + r] += bjv;
    }
  }

  return { H, b, totalError };
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PoseGraphConfig = {
  solver: 'gn',
  maxIterations: 100,
  tolerance: 1e-6,
  lambda: 1e-3,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the total weighted squared error of a pose graph.
 *
 * @param poses  Array of current poses
 * @param edges  Array of relative-pose constraints
 * @returns Total error: Σ e_ij^T Ω_ij e_ij
 */
export function poseGraphError(poses: Pose2D[], edges: PoseEdge[]): number {
  let total = 0;
  for (const edge of edges) {
    const e = relativeError(poses[edge.from], poses[edge.to], edge);
    const omega = edge.information;
    const omegaE = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        omegaE[r] += omega.get(r, c) * e[c];
      }
    }
    total += e[0] * omegaE[0] + e[1] * omegaE[1] + e[2] * omegaE[2];
  }
  return total;
}

/**
 * Compute per-edge residual vectors.
 *
 * @param poses  Array of current poses
 * @param edges  Array of relative-pose constraints
 * @returns Array of 3-element residual vectors [ex, ey, etheta] per edge
 */
export function poseGraphResiduals(
  poses: Pose2D[],
  edges: PoseEdge[],
): [number, number, number][] {
  return edges.map((edge) =>
    relativeError(poses[edge.from], poses[edge.to], edge),
  );
}

/**
 * Optimize a 2D pose graph using Gauss-Newton or Levenberg-Marquardt.
 *
 * Pose 0 is anchored (held fixed) to remove gauge freedom.
 *
 * @param poses   Initial pose estimates
 * @param edges   Relative-pose constraints with information matrices
 * @param config  Solver configuration (optional, defaults to GN)
 * @returns Optimization result with refined poses, error, iterations, convergence
 */
export function poseGraphOptimize(
  poses: Pose2D[],
  edges: PoseEdge[],
  config?: Partial<PoseGraphConfig>,
): PoseGraphResult {
  const cfg: PoseGraphConfig = { ...DEFAULT_CONFIG, ...config };
  const n = poses.length;

  // Deep copy poses
  const current: Pose2D[] = poses.map((p) => ({ ...p }));

  // Degenerate: single pose or no edges
  if (n <= 1 || edges.length === 0) {
    return {
      poses: current,
      totalError: edges.length > 0 ? poseGraphError(current, edges) : 0,
      iterations: 0,
      converged: true,
    };
  }

  const dim = 3 * n;
  let converged = false;
  let iterations = 0;
  let totalError = 0;

  for (let iter = 0; iter < cfg.maxIterations; iter++) {
    iterations = iter + 1;

    // Build linear system
    const system = buildLinearSystem(current, edges);
    totalError = system.totalError;

    const H = system.H;
    const b = system.b;

    // Anchor pose 0: zero out rows/cols 0-2, set diagonal to 1, b to 0
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < dim; j++) {
        H[i * dim + j] = 0;
        H[j * dim + i] = 0;
      }
      H[i * dim + i] = 1;
      b[i] = 0;
    }

    // LM damping: add lambda to diagonal
    if (cfg.solver === 'lm') {
      for (let i = 0; i < dim; i++) {
        H[i * dim + i] += cfg.lambda;
      }
    }

    // Convert to Matrix and solve H * dx = -b
    const Hmat = new Matrix(dim, dim, H);
    const negB = new Matrix(dim, 1, b.map((v) => -v));
    const dx = matSolve(Hmat, negB);

    // Update poses with angle normalization
    for (let i = 0; i < n; i++) {
      current[i].x += dx.get(3 * i, 0);
      current[i].y += dx.get(3 * i + 1, 0);
      current[i].theta = normalizeAngle(current[i].theta + dx.get(3 * i + 2, 0));
    }

    // Check convergence: ||δx||
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += dx.get(i, 0) * dx.get(i, 0);
    }
    norm = Math.sqrt(norm);

    if (norm < cfg.tolerance) {
      converged = true;
      totalError = poseGraphError(current, edges);
      break;
    }
  }

  if (!converged) {
    totalError = poseGraphError(current, edges);
  }

  return { poses: current, totalError, iterations, converged };
}
