# rrt — Spec

Depends on: `result-types`

## Purpose

Rapidly-exploring Random Tree (RRT) path planner. Sampling-based motion planner that
grows a tree from the start toward the goal by randomly sampling the configuration
space. Operates in continuous 2D space with configurable bounds, step size, goal bias,
and collision checking. Supports deterministic execution via seeded PRNG.

## Conventions

@provenance LaValle "Rapidly-Exploring Random Trees: A New Tool for Path Planning" 1998,
PythonRobotics (cross-validation), OMPL v1.7.0

- **Defaults**: stepSize=0.5, goalBias=0.05, maxIterations=1000, goalRadius=0.5
- **Goal bias**: With probability `goalBias`, sample the goal directly instead of
  a random point. This accelerates convergence.
- **Steer function**: Moves from a point toward a target, limiting distance to stepSize.
  If target is within stepSize, returns the target exactly.
- **Collision checker**: User-provided function `(from, to) => boolean` that returns
  true if the path segment is collision-free.
- **Seeded PRNG**: Mulberry32 algorithm for reproducible results across platforms.
- **Tree structure**: Each node stores point, parent index (-1 for root), and cost
  from root.

## Types

### RRTConfig

| Field | Type | Description |
|-------|------|-------------|
| `stepSize` | number | Maximum step size for tree extension |
| `goalBias` | number | Probability of sampling goal directly (0-1) |
| `maxIterations` | number | Maximum number of iterations |
| `goalRadius` | number | Goal acceptance radius |

### RRTNode

| Field | Type | Description |
|-------|------|-------------|
| `point` | Point2D | Position of this node |
| `parent` | number | Index of parent node (-1 for root) |
| `cost` | number | Cost from root to this node |

### CollisionChecker

`(from: Point2D, to: Point2D) => boolean` — returns true if path from `from` to `to` is collision-free.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `createRNG` | `(seed: number) => () => number` | Seeded PRNG (Mulberry32), returns values in [0, 1) |
| `dist2d` | `(a: Point2D, b: Point2D) => number` | Euclidean distance between two 2D points |
| `rrtNearestNode` | `(tree: RRTNode[], point: Point2D) => number` | Index of nearest tree node to point |
| `rrtSteer` | `(from: Point2D, toward: Point2D, stepSize: number) => Point2D` | Steer from→toward, limiting to stepSize |
| `rrtExtractPath` | `(tree: RRTNode[], goalIdx: number) => Point2D[]` | Extract path by tracing parent pointers root→goal |
| `rrtPlan` | `(start, goal, bounds, isCollisionFree, config?, seed?) => PlanResult & { tree }` | Run RRT planning |
| `createGridCollisionChecker` | `(grid: boolean[][], resolution, origin?) => CollisionChecker` | Create collision checker from boolean occupancy grid |

## Test Vectors

### createRNG

@provenance Mulberry32 algorithm, verified determinism

| Test | Expected |
|------|----------|
| Same seed (42) produces identical 10-value sequences | deterministic |
| Different seeds (42 vs 99) produce different sequences | divergent |
| 100 values from seed 123 | all in [0, 1) |

### dist2d

@provenance mathematical-definition (Euclidean distance)

| Input | Expected |
|-------|----------|
| `dist2d((1,2), (1,2))` | `0` |
| `dist2d((0,0), (3,4))` | `5` |

### rrtNearestNode

@provenance verified manually

| Tree | Query | Expected index |
|------|-------|---------------|
| `[(0,0), (5,5), (1,1)]` | `(1,0)` | `0` |
| `[(0,0), (5,5), (1,1)]` | `(4,4)` | `1` |
| `[(0,0), (5,5), (1,1)]` | `(1.5,1.5)` | `2` |

### rrtSteer

@provenance LaValle 1998, verified manually

| From | Toward | stepSize | Expected |
|------|--------|----------|----------|
| (0,0) | (0.3, 0.4) | 1.0 | (0.3, 0.4) — within stepSize, return target |
| (0,0) | (3, 4) | 1.0 | distance from origin = 1.0 |
| (0,0) | (6, 8) | 5.0 | direction preserved: x/y = 6/8 |

### rrtExtractPath

@provenance verified manually

| Tree (parent chain) | goalIdx | Expected path length |
|---------------------|---------|---------------------|
| `[(0,0)→root, (1,0)→0, (2,0)→1, (3,0)→2]` | 3 | 4, starts at (0,0), ends at (3,0) |
| `[(0,0)→root]` | 0 | 1 |

### rrtPlan — obstacle-free

@provenance PythonRobotics (cross-validation), OMPL v1.7.0

| Test | Bounds | Config | Seed | Expected |
|------|--------|--------|------|----------|
| Free space (0,0)->(9,9) | [0,10]x[0,10] | goalRadius=1.0 | 42 | success=true, path.length > 1, 0 < cost < Inf |
| Path endpoints | [0,10]x[0,10] | goalRadius=1.0 | 42 | path[0]=(1,1), last point within 1.5 of (8,8) |
| Determinism: same seed | [0,10]x[0,10] | default | 42 | identical path.length and nodesExplored |
| Tree root | [0,10]x[0,10] | default | 42 | tree[0].parent == -1 |

### rrtPlan — with obstacles

@provenance PythonRobotics (cross-validation)

| Test | Expected |
|------|----------|
| Wall at x=5, y<8: (1,1)->(9,1), maxIter=2000, seed=42 | success=true, path.length > 2 |
| Always blocked: (0,0)->(9,9), maxIter=50, seed=42 | success=false, path=[], cost=Infinity |

### createGridCollisionChecker

@provenance verified manually

| Test | Expected |
|------|----------|
| 2x2 free grid: (0,0)->(1,1) | collision-free (true) |
| Grid with obstacle at (0,1): (0,0)->(1.5,0) | blocked (false) |
| Out-of-bounds points | treated as free (true) |
