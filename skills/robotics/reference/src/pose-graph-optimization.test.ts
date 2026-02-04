import { describe, test, expect } from 'bun:test';
import { Matrix } from './mat-ops.ts';
import {
  poseGraphOptimize,
  poseGraphError,
  poseGraphResiduals,
} from './pose-graph-optimization.ts';
import type { Pose2D, PoseEdge, PoseGraphConfig } from './pose-graph-optimization.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PREC = 6; // digits of closeness for toBeCloseTo

/** Identity 3×3 information matrix. */
const I3 = Matrix.identity(3);

/** Make a pose edge with identity information by default. */
function edge(
  from: number,
  to: number,
  dx: number,
  dy: number,
  dtheta: number,
  info?: Matrix,
): PoseEdge {
  return { from, to, dx, dy, dtheta, information: info ?? I3 };
}

/** Euclidean distance between two poses. */
function poseDist(a: Pose2D, b: Pose2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---------------------------------------------------------------------------
// Test 1: Two-pose odometry (already consistent)
// ---------------------------------------------------------------------------
describe('two-pose odometry (consistent)', () => {
  const poses: Pose2D[] = [
    { x: 0, y: 0, theta: 0 },
    { x: 1, y: 0, theta: 0 },
  ];
  const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];

  test('error is zero for consistent poses', () => {
    const err = poseGraphError(poses, edges);
    expect(err).toBeCloseTo(0, PREC);
  });

  test('optimizer converges immediately', () => {
    const result = poseGraphOptimize(poses, edges);
    expect(result.converged).toBe(true);
    expect(result.totalError).toBeCloseTo(0, PREC);
    expect(result.iterations).toBeLessThanOrEqual(2);
    expect(result.poses[0].x).toBeCloseTo(0, PREC);
    expect(result.poses[1].x).toBeCloseTo(1, PREC);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Square loop closure (4 poses + closing edge)
// ---------------------------------------------------------------------------
describe('square loop closure', () => {
  // Ground truth: unit square traversed CCW
  // Pose 0 at origin, pose 1 at (1,0), pose 2 at (1,1), pose 3 at (0,1)
  // Initial poses have accumulated drift
  const initPoses: Pose2D[] = [
    { x: 0, y: 0, theta: 0 },
    { x: 1.1, y: 0.05, theta: Math.PI / 2 + 0.05 },
    { x: 1.05, y: 1.1, theta: Math.PI - 0.03 },
    { x: -0.05, y: 1.05, theta: -Math.PI / 2 + 0.02 },
  ];

  // Odometry edges + loop closure
  const loopEdges: PoseEdge[] = [
    edge(0, 1, 1, 0, Math.PI / 2),
    edge(1, 2, 1, 0, Math.PI / 2),
    edge(2, 3, 1, 0, Math.PI / 2),
    edge(3, 0, 1, 0, Math.PI / 2), // loop closure
  ];

  test('optimizer reduces error significantly', () => {
    const errorBefore = poseGraphError(initPoses, loopEdges);
    const result = poseGraphOptimize(initPoses, loopEdges, {
      maxIterations: 200,
    });
    expect(result.converged).toBe(true);
    expect(result.totalError).toBeLessThan(errorBefore);
    expect(result.totalError).toBeCloseTo(0, 3);
  });

  test('optimized poses form a closed square', () => {
    const result = poseGraphOptimize(initPoses, loopEdges, {
      maxIterations: 200,
    });
    const p = result.poses;
    // Check distances between consecutive poses are roughly 1
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      expect(poseDist(p[i], p[j])).toBeCloseTo(1, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3: Circular trajectory (N poses + loop closure)
// ---------------------------------------------------------------------------
describe('circular trajectory with loop closure', () => {
  const N = 8;
  const R = 2; // radius
  const dtheta = (2 * Math.PI) / N;

  // Ground truth poses on circle
  const truePoses: Pose2D[] = [];
  for (let i = 0; i < N; i++) {
    const angle = i * dtheta;
    truePoses.push({
      x: R * Math.cos(angle),
      y: R * Math.sin(angle),
      theta: angle + Math.PI / 2, // tangent direction
    });
  }

  // Add drift to initial poses
  const initPoses: Pose2D[] = truePoses.map((p, i) => ({
    x: p.x + (i > 0 ? 0.05 * i : 0),
    y: p.y + (i > 0 ? -0.03 * i : 0),
    theta: p.theta + (i > 0 ? 0.02 * i : 0),
  }));

  // Compute relative transforms from true poses for edges
  const circleEdges: PoseEdge[] = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const ci = Math.cos(truePoses[i].theta);
    const si = Math.sin(truePoses[i].theta);
    const dxw = truePoses[j].x - truePoses[i].x;
    const dyw = truePoses[j].y - truePoses[i].y;
    circleEdges.push(
      edge(
        i,
        j,
        ci * dxw + si * dyw,
        -si * dxw + ci * dyw,
        dtheta,
        Matrix.fromArray([
          [100, 0, 0],
          [0, 100, 0],
          [0, 0, 100],
        ]),
      ),
    );
  }

  test('optimizer converges and reduces error', () => {
    const errBefore = poseGraphError(initPoses, circleEdges);
    const result = poseGraphOptimize(initPoses, circleEdges, {
      maxIterations: 200,
    });
    expect(result.converged).toBe(true);
    expect(result.totalError).toBeLessThan(errBefore * 0.01);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Single pose / no edges (degenerate)
// ---------------------------------------------------------------------------
describe('degenerate cases', () => {
  test('single pose with no edges', () => {
    const poses: Pose2D[] = [{ x: 5, y: 3, theta: 1 }];
    const result = poseGraphOptimize(poses, []);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
    expect(result.totalError).toBe(0);
    expect(result.poses[0].x).toBe(5);
  });

  test('single pose is unchanged', () => {
    const poses: Pose2D[] = [{ x: 1, y: 2, theta: 0.5 }];
    const result = poseGraphOptimize(poses, []);
    expect(result.poses[0]).toEqual({ x: 1, y: 2, theta: 0.5 });
  });

  test('two poses with no edges', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1, y: 1, theta: 1 },
    ];
    const result = poseGraphOptimize(poses, []);
    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(0);
    expect(result.totalError).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: LM solver path
// ---------------------------------------------------------------------------
describe('Levenberg-Marquardt solver', () => {
  const initPoses: Pose2D[] = [
    { x: 0, y: 0, theta: 0 },
    { x: 1.2, y: 0.1, theta: 0.05 },
    { x: 2.1, y: -0.1, theta: -0.03 },
  ];

  const lmEdges: PoseEdge[] = [
    edge(0, 1, 1, 0, 0),
    edge(1, 2, 1, 0, 0),
    edge(0, 2, 2, 0, 0), // direct constraint
  ];

  test('LM converges', () => {
    const result = poseGraphOptimize(initPoses, lmEdges, {
      solver: 'lm',
      lambda: 1e-3,
    });
    expect(result.converged).toBe(true);
    expect(result.totalError).toBeCloseTo(0, 3);
  });

  test('LM produces similar result to GN', () => {
    const gnResult = poseGraphOptimize(initPoses, lmEdges, { solver: 'gn' });
    const lmResult = poseGraphOptimize(initPoses, lmEdges, {
      solver: 'lm',
      lambda: 1e-6,
    });
    for (let i = 0; i < 3; i++) {
      expect(lmResult.poses[i].x).toBeCloseTo(gnResult.poses[i].x, 3);
      expect(lmResult.poses[i].y).toBeCloseTo(gnResult.poses[i].y, 3);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 6: First pose anchored (doesn't move)
// ---------------------------------------------------------------------------
describe('first pose anchored', () => {
  test('pose 0 does not change after optimization', () => {
    const poses: Pose2D[] = [
      { x: 1, y: 2, theta: 0.5 },
      { x: 3, y: 4, theta: 1.0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const result = poseGraphOptimize(poses, edges);
    expect(result.poses[0].x).toBeCloseTo(1, PREC);
    expect(result.poses[0].y).toBeCloseTo(2, PREC);
    expect(result.poses[0].theta).toBeCloseTo(0.5, PREC);
  });

  test('only non-anchored poses move to satisfy constraints', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 5, y: 5, theta: 1 }, // far from constraint
    ];
    // Edge says pose 1 should be at (1, 0) relative to pose 0
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const result = poseGraphOptimize(poses, edges);
    expect(result.poses[0].x).toBeCloseTo(0, PREC);
    expect(result.poses[0].y).toBeCloseTo(0, PREC);
    expect(result.poses[1].x).toBeCloseTo(1, 3);
    expect(result.poses[1].y).toBeCloseTo(0, 3);
  });
});

// ---------------------------------------------------------------------------
// Test 7: Information matrix weighting (tight vs loose)
// ---------------------------------------------------------------------------
describe('information matrix weighting', () => {
  test('tight constraint dominates loose constraint', () => {
    // Pose 1 has two conflicting constraints from pose 0:
    // Edge A: (1, 0, 0) with high information
    // Edge B: (2, 0, 0) with low information
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1.5, y: 0, theta: 0 },
    ];
    const tightInfo = Matrix.fromArray([
      [1000, 0, 0],
      [0, 1000, 0],
      [0, 0, 1000],
    ]);
    const looseInfo = Matrix.fromArray([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    const edges: PoseEdge[] = [
      edge(0, 1, 1, 0, 0, tightInfo),
      edge(0, 1, 2, 0, 0, looseInfo),
    ];
    const result = poseGraphOptimize(poses, edges, { maxIterations: 200 });
    // Should be much closer to 1 than to 2
    expect(result.poses[1].x).toBeCloseTo(1, 0);
    expect(Math.abs(result.poses[1].x - 1)).toBeLessThan(
      Math.abs(result.poses[1].x - 2),
    );
  });

  test('equal information gives midpoint', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1.5, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [
      edge(0, 1, 1, 0, 0),
      edge(0, 1, 2, 0, 0),
    ];
    const result = poseGraphOptimize(poses, edges);
    expect(result.poses[1].x).toBeCloseTo(1.5, 1);
  });
});

// ---------------------------------------------------------------------------
// Test 8: Large angle wrapping near ±π
// ---------------------------------------------------------------------------
describe('angle wrapping near ±π', () => {
  test('handles angles crossing ±π boundary', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: Math.PI - 0.1 },
      { x: 1, y: 0, theta: -Math.PI + 0.1 },
    ];
    // The relative rotation should be 0.2 rad
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0.2)];
    const result = poseGraphOptimize(poses, edges);
    expect(result.converged).toBe(true);
    // The angle difference should be approximately 0.2
    const angleDiff =
      result.poses[1].theta - result.poses[0].theta;
    // Normalize for comparison
    let norm = angleDiff % (2 * Math.PI);
    if (norm > Math.PI) norm -= 2 * Math.PI;
    if (norm < -Math.PI) norm += 2 * Math.PI;
    expect(Math.abs(norm)).toBeLessThan(1);
  });

  test('normalizes output angles to [-π, π]', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1, y: 0, theta: 3.0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 3.0)];
    const result = poseGraphOptimize(poses, edges);
    for (const p of result.poses) {
      expect(p.theta).toBeGreaterThanOrEqual(-Math.PI);
      expect(p.theta).toBeLessThanOrEqual(Math.PI);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 9: poseGraphError standalone
// ---------------------------------------------------------------------------
describe('poseGraphError standalone', () => {
  test('zero error for perfect poses', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    expect(poseGraphError(poses, edges)).toBeCloseTo(0, PREC);
  });

  test('positive error for inconsistent poses', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 2, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)]; // expects (1,0)
    const err = poseGraphError(poses, edges);
    expect(err).toBeGreaterThan(0);
    // Error should be (2-1)^2 = 1 with identity information
    expect(err).toBeCloseTo(1, PREC);
  });

  test('weighted error scales with information', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 2, y: 0, theta: 0 },
    ];
    const info10 = Matrix.fromArray([
      [10, 0, 0],
      [0, 10, 0],
      [0, 0, 10],
    ]);
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0, info10)];
    const err = poseGraphError(poses, edges);
    // (2-1)^2 * 10 = 10
    expect(err).toBeCloseTo(10, PREC);
  });

  test('multiple edges accumulate error', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 2, y: 0, theta: 0 },
      { x: 3, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [
      edge(0, 1, 1, 0, 0), // error 1
      edge(1, 2, 1, 0, 0), // error 0
    ];
    const err = poseGraphError(poses, edges);
    expect(err).toBeCloseTo(1, PREC);
  });
});

// ---------------------------------------------------------------------------
// Test 10: poseGraphResiduals standalone
// ---------------------------------------------------------------------------
describe('poseGraphResiduals standalone', () => {
  test('returns one residual per edge', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1, y: 0, theta: 0 },
      { x: 2, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [
      edge(0, 1, 1, 0, 0),
      edge(1, 2, 1, 0, 0),
    ];
    const residuals = poseGraphResiduals(poses, edges);
    expect(residuals.length).toBe(2);
  });

  test('zero residuals for consistent graph', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const residuals = poseGraphResiduals(poses, edges);
    expect(residuals[0][0]).toBeCloseTo(0, PREC);
    expect(residuals[0][1]).toBeCloseTo(0, PREC);
    expect(residuals[0][2]).toBeCloseTo(0, PREC);
  });

  test('nonzero residuals for inconsistent graph', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 2, y: 1, theta: 0.5 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const residuals = poseGraphResiduals(poses, edges);
    // dx residual: 2-1=1, dy residual: 1, dtheta residual: 0.5
    expect(residuals[0][0]).toBeCloseTo(1, PREC);
    expect(residuals[0][1]).toBeCloseTo(1, PREC);
    expect(residuals[0][2]).toBeCloseTo(0.5, PREC);
  });

  test('residuals with rotated frame', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: Math.PI / 2 },
      { x: 0, y: 1, theta: Math.PI / 2 },
    ];
    // In pose 0's frame, pose 1 is at (1, 0) (forward)
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const residuals = poseGraphResiduals(poses, edges);
    expect(residuals[0][0]).toBeCloseTo(0, PREC);
    expect(residuals[0][1]).toBeCloseTo(0, PREC);
    expect(residuals[0][2]).toBeCloseTo(0, PREC);
  });
});

// ---------------------------------------------------------------------------
// Additional: result structure
// ---------------------------------------------------------------------------
describe('result structure', () => {
  test('returns all required fields', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const result = poseGraphOptimize(poses, edges);
    expect(result).toHaveProperty('poses');
    expect(result).toHaveProperty('totalError');
    expect(result).toHaveProperty('iterations');
    expect(result).toHaveProperty('converged');
    expect(Array.isArray(result.poses)).toBe(true);
    expect(typeof result.totalError).toBe('number');
    expect(typeof result.iterations).toBe('number');
    expect(typeof result.converged).toBe('boolean');
  });

  test('does not mutate input poses', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 5, y: 5, theta: 1 },
    ];
    const original = poses.map((p) => ({ ...p }));
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    poseGraphOptimize(poses, edges);
    expect(poses[0]).toEqual(original[0]);
    expect(poses[1]).toEqual(original[1]);
  });

  test('default config uses GN', () => {
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 1.1, y: 0, theta: 0 },
    ];
    const edges: PoseEdge[] = [edge(0, 1, 1, 0, 0)];
    const result = poseGraphOptimize(poses, edges);
    expect(result.converged).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Max iterations reached (non-convergence path)
// ---------------------------------------------------------------------------
describe('max iterations', () => {
  test('returns converged=false when maxIterations too low', () => {
    // Create a problem that needs multiple iterations
    const poses: Pose2D[] = [
      { x: 0, y: 0, theta: 0 },
      { x: 10, y: 10, theta: 2 },
      { x: 20, y: -5, theta: -1 },
    ];
    const edges: PoseEdge[] = [
      edge(0, 1, 1, 0, 0),
      edge(1, 2, 1, 0, 0),
      edge(0, 2, 2, 0, 0),
    ];
    const result = poseGraphOptimize(poses, edges, {
      maxIterations: 1,
      tolerance: 1e-20, // very tight tolerance
    });
    expect(result.iterations).toBe(1);
    expect(result.converged).toBe(false);
  });
});
