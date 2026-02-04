# pose-graph-optimization — Spec

Depends on: `mat-ops`

## Purpose

SE(2) pose graph optimization via Gauss-Newton or Levenberg-Marquardt. Optimizes
a set of 2D poses connected by relative-pose constraints (edges). Each edge carries
a 3x3 information matrix weighting its residual. Pose 0 is anchored to remove gauge
freedom. All angles are wrapped to [-pi, pi] after each update.

## Conventions

@provenance Grisetti, Kummerle et al. "A Tutorial on Graph-Based SLAM",
IEEE Intelligent Transportation Systems Magazine, 2010

- **Solver**: Gauss-Newton (`solver='gn'`) or Levenberg-Marquardt (`solver='lm'`).
  LM adds `lambda` to the diagonal of H before solving.
- **Anchoring**: Pose 0 is fixed by zeroing its rows/columns in H and b, then
  setting the 3x3 diagonal block to identity. This removes gauge freedom.
- **Angle wrapping**: All angles are normalized to [-pi, pi] after each update step.
- **SE(2) operations**: Compose and inverse are computed inline using cos/sin
  (no Matrix needed). The 3N x 3N linear system uses `mat-ops` for the solve step.
- **Error formulation**: Relative error `e_ij = (T_i^{-1} compose T_j) - z_ij`,
  with Jacobians derived analytically per Grisetti et al. 2010, section III-B.
- **Convergence**: Iteration stops when `||dx|| < tolerance` or `maxIterations` reached.

## Types

### Pose2D

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | Position x |
| `y` | number | Position y |
| `theta` | number | Heading in radians |

### PoseEdge

| Field | Type | Description |
|-------|------|-------------|
| `from` | number | Index of source pose |
| `to` | number | Index of target pose |
| `dx` | number | Relative translation x (in source frame) |
| `dy` | number | Relative translation y (in source frame) |
| `dtheta` | number | Relative rotation (radians) |
| `information` | Matrix | 3x3 symmetric positive-definite information matrix |

### PoseGraphConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `solver` | `'gn' \| 'lm'` | `'gn'` | Solver type |
| `maxIterations` | number | `100` | Maximum iterations |
| `tolerance` | number | `1e-6` | Convergence tolerance on `\|\|dx\|\|` |
| `lambda` | number | `1e-3` | LM damping parameter (only used when solver='lm') |

### PoseGraphResult

| Field | Type | Description |
|-------|------|-------------|
| `poses` | Pose2D[] | Optimized poses |
| `totalError` | number | Total weighted squared error after optimization |
| `iterations` | number | Number of iterations performed |
| `converged` | boolean | Whether solver converged (`\|\|dx\|\| < tolerance`) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `poseGraphError` | `(poses, edges) -> number` | Compute total weighted squared error: sum of e_ij^T * Omega_ij * e_ij |
| `poseGraphResiduals` | `(poses, edges) -> [number, number, number][]` | Compute per-edge residual vectors [ex, ey, etheta] |
| `poseGraphOptimize` | `(poses, edges, config?) -> PoseGraphResult` | Optimize pose graph with GN or LM; pose 0 anchored |

## Test Vectors

### Two-pose consistent odometry

@provenance mathematical-definition (SE(2) identity constraint)

| Test | Expected |
|------|----------|
| poses=[(0,0,0),(1,0,0)], edge 0->1 dx=1,dy=0,dtheta=0 | error = 0 |
| Same setup, optimize | converged=true, totalError ~= 0, iterations <= 2 |
| Pose 0 unchanged after optimization | x=0, y=0, theta=0 |
| Pose 1 unchanged after optimization | x=1, y=0, theta=0 |

### poseGraphError standalone

@provenance mathematical-definition (weighted least squares)

| Test | Expected |
|------|----------|
| Consistent graph: poses=[(0,0,0),(1,0,0)], edge dx=1 | error = 0 |
| Inconsistent: poses=[(0,0,0),(2,0,0)], edge dx=1 | error = 1.0 (identity info) |
| Scaled info (10*I_3): poses=[(0,0,0),(2,0,0)], edge dx=1 | error = 10.0 |
| Multiple edges: poses=[(0,0,0),(2,0,0),(3,0,0)], edges dx=1 each | error = 1.0 (only edge 0->1 has residual) |

### poseGraphResiduals standalone

@provenance mathematical-definition (SE(2) relative error)

| Test | Expected |
|------|----------|
| Consistent graph | all residuals [0, 0, 0] |
| poses=[(0,0,0),(2,1,0.5)], edge dx=1,dy=0,dtheta=0 | residual = [1, 1, 0.5] |
| Rotated frame: poses=[(0,0,pi/2),(0,1,pi/2)], edge dx=1,dy=0,dtheta=0 | residual = [0, 0, 0] |
| Returns one residual per edge | length = edge count |

### Square loop closure (4 poses)

@provenance Grisetti et al. 2010 (loop closure scenario)

| Test | Expected |
|------|----------|
| Init: [(0,0,0),(1.1,0.05,pi/2+0.05),(1.05,1.1,pi-0.03),(-0.05,1.05,-pi/2+0.02)] | drifted initial poses |
| 4 odometry edges (dx=1,dy=0,dtheta=pi/2) + loop closure edge 3->0 | CCW unit square |
| After optimization (maxIter=200) | converged=true, totalError ~= 0 (tol 1e-3) |
| Consecutive pose distances | each ~= 1.0 (tol 0.1) |

### Circular trajectory with loop closure (8 poses)

@provenance Grisetti et al. 2010 (circular SLAM scenario)

| Test | Expected |
|------|----------|
| 8 poses on circle of radius 2 with accumulated drift | noisy initial estimates |
| Information matrices: 100*I_3 per edge | high-confidence constraints |
| After optimization (maxIter=200) | converged=true, error < 1% of initial |

### First pose anchored

@provenance Grisetti et al. 2010 (gauge freedom removal)

| Test | Expected |
|------|----------|
| Pose 0 = (1,2,0.5), pose 1 = (3,4,1.0), edge 0->1 dx=1,dy=0,dtheta=0 | pose 0 unchanged: (1, 2, 0.5) |
| Pose 0 = (0,0,0), pose 1 = (5,5,1), edge dx=1,dy=0,dtheta=0 | pose 0 = (0,0,0); pose 1 moves to ~(1,0,0) |

### Information matrix weighting

@provenance Grisetti et al. 2010 (information-weighted optimization)

| Test | Expected |
|------|----------|
| Tight (1000*I) says dx=1, loose (I) says dx=2 | result closer to x=1 than x=2 |
| Equal info (I) says dx=1 and dx=2 | result ~= 1.5 (midpoint) |

### Angle wrapping near +/-pi

@provenance mathematical-definition (angle normalization)

| Test | Expected |
|------|----------|
| Poses with theta near +/-pi boundary, edge dtheta=0.2 | converged=true |
| All output angles in [-pi, pi] | verified for all poses |

### Levenberg-Marquardt solver

@provenance Grisetti et al. 2010 (LM variant)

| Test | Expected |
|------|----------|
| 3 poses, 3 edges (chain + direct), solver='lm', lambda=1e-3 | converged=true, error ~= 0 |
| LM vs GN on same problem (lambda=1e-6) | poses agree to 3 decimal places |

### Degenerate cases

| Test | Expected |
|------|----------|
| Single pose, no edges | converged=true, iterations=0, error=0, pose unchanged |
| Two poses, no edges | converged=true, iterations=0, error=0 |

### Non-convergence

| Test | Expected |
|------|----------|
| maxIterations=1, tolerance=1e-20 (very tight) | converged=false, iterations=1 |

### Purity

- `poseGraphOptimize` does not mutate input poses array
- Result contains all required fields: poses, totalError, iterations, converged
- Default config uses Gauss-Newton solver
