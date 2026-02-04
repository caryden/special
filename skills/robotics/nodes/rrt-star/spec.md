# rrt-star — Spec

Depends on: `result-types`, `rrt`

## Purpose

RRT* (RRT-Star) with asymptotically optimal rewiring. Extends standard RRT with:
1. Near-neighbor search within an adaptive radius
2. Cost-based parent selection (choose lowest-cost parent from neighbors)
3. Rewiring (update nearby nodes if a lower-cost path through the new node exists)

Converges toward optimal path cost as iteration count increases.

## Conventions

@provenance Karaman & Frazzoli "Sampling-based Algorithms for Optimal Motion Planning"
2011, PythonRobotics (cross-validation), OMPL v1.7.0

- **Adaptive radius**: `r = gamma * sqrt(log(n) / n)` where n = tree size, gamma =
  rewireGamma. For n <= 1, radius = Infinity.
- **Rewiring**: After adding a new node, check all near neighbors. If routing through
  the new node is cheaper, rewire them and propagate cost updates to descendants.
- **Best-so-far**: Tracks the best goal node found across all iterations. Continues
  exploring even after first goal connection to find better paths.
- **Default config**: Inherits RRT defaults plus rewireGamma=50.0.
- **Reuses**: `rrtSteer`, `rrtExtractPath`, `rrtNearestNode`, `createRNG`, `dist2d`
  from the `rrt` node.

## Types

### RRTStarConfig (extends RRTConfig)

| Field | Type | Description |
|-------|------|-------------|
| `stepSize` | number | Maximum step size for tree extension |
| `goalBias` | number | Probability of sampling goal directly (0-1) |
| `maxIterations` | number | Maximum number of iterations |
| `goalRadius` | number | Goal acceptance radius |
| `rewireGamma` | number | Rewiring radius scaling factor (default: 50.0) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `rrtStarNearNodes` | `(tree: RRTNode[], point: Point2D, radius: number) => number[]` | Find all node indices within radius of point |
| `rrtStarRadius` | `(n: number, gamma: number) => number` | Compute adaptive rewiring radius: gamma * sqrt(log(n)/n) |
| `rrtStarPlan` | `(start, goal, bounds, isCollisionFree, config?, seed?) => PlanResult & { tree }` | Run RRT* planning with rewiring |

## Test Vectors

### rrtStarRadius

@provenance Karaman & Frazzoli 2011, Eq. 2

| Input | Expected |
|-------|----------|
| `rrtStarRadius(1, 50)` | `Infinity` |
| `rrtStarRadius(0, 50)` | `Infinity` |
| `rrtStarRadius(10, 50)` vs `rrtStarRadius(100, 50)` | r(10) > r(100) — decreases with n |
| `rrtStarRadius(1000, 50)` vs `rrtStarRadius(100, 50)` | r(1000) < r(100) |
| `rrtStarRadius(100, 10)` vs `rrtStarRadius(100, 100)` | r(gamma=100) > r(gamma=10) — increases with gamma |

### rrtStarNearNodes

@provenance verified manually

| Tree | Query | Radius | Expected |
|------|-------|--------|----------|
| `[(0,0), (1,0), (5,5), (0.5,0.5)]` | `(0.5, 0)` | 1.5 | contains {0, 1, 3}, not {2} |
| `[(0,0), (1,0), (5,5), (0.5,0.5)]` | `(3, 3)` | 0.1 | empty |
| `[(0,0), (1,0), (5,5), (0.5,0.5)]` | `(0, 0)` | 100 | all 4 nodes |

### rrtStarPlan — obstacle-free

@provenance PythonRobotics (cross-validation), OMPL v1.7.0

| Test | Expected |
|------|----------|
| Free space (0,0)->(9,9), seed=42 | success=true, path.length > 1, 0 < cost < Inf |
| Path starts at start (1,1)->(8,8), seed=42 | path[0] = (1,1) |
| Determinism: same seed=42 | identical cost and path.length |
| Near-optimal: 2000 iterations, (0,0)->(9,9) | cost < 2 * sqrt(162) where sqrt(162) ~= 12.73 |

### rrtStarPlan — with obstacles

@provenance PythonRobotics (cross-validation)

| Test | Expected |
|------|----------|
| Wall at x=5, y<8: (1,1)->(9,1), maxIter=2000, seed=42 | success=true, path.length > 2 |
| Always blocked: (0,0)->(9,9), maxIter=50, seed=42 | success=false, path=[] |

### Rewiring properties

@provenance Karaman & Frazzoli 2011

| Property | Verified |
|----------|----------|
| Tree node costs are consistent: cost ~= parent.cost + edge_cost | Yes (tol 1e-2) |
| Root has parent == -1 | Yes |
| All non-root nodes have valid parent in [0, tree.length) | Yes |
