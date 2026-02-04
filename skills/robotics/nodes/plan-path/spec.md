# plan-path — Spec

Depends on: `result-types`, `any-of(graph-search, rrt, rrt-star, prm, d-star)`

## Purpose

Unified path planning dispatcher. Provides a single entry point for 2D path planning
that delegates to one of multiple methods: grid-based search (A*, Dijkstra, BFS),
RRT, RRT*, PRM, or D* Lite. This is a thin routing layer -- all real logic lives in
the downstream planner nodes.

## Conventions

@provenance dispatcher pattern, verified via behavioral equivalence with individual planners

- **Default method**: `rrt` when no method specified.
- **Grid methods** (astar, dijkstra, bfs): Require a `GridGraph` in options. Return
  failure if grid not provided.
- **Sampling methods** (rrt, rrt-star, prm): Require `bounds` and `isCollisionFree`
  in options. Return failure if either missing.
- **D* Lite**: Requires `gridWidth`/`gridHeight` or a `grid` object. Accepts optional
  `obstacles` array.
- **Option passthrough**: Planner-specific options (stepSize, goalBias, maxIterations,
  goalRadius, rewireGamma, numSamples, kNeighbors, connectionRadius, seed) are passed
  through to the underlying planner, merging with that planner's defaults.

## Types

### PlanMethod

`'astar' | 'dijkstra' | 'bfs' | 'rrt' | 'rrt-star' | 'prm' | 'd-star'`

### PlanPathOptions

| Field | Type | Description |
|-------|------|-------------|
| `method?` | PlanMethod | Planning method (default: 'rrt') |
| `grid?` | GridGraph | Grid graph for grid-based methods |
| `gridWidth?` | number | Grid width for D* Lite |
| `gridHeight?` | number | Grid height for D* Lite |
| `obstacles?` | Point2D[] | Obstacles for D* Lite |
| `bounds?` | {minX, maxX, minY, maxY} | Workspace bounds for sampling-based planners |
| `isCollisionFree?` | CollisionChecker | Collision checker for sampling-based planners |
| `seed?` | number | RNG seed for reproducibility |
| `stepSize?` | number | Step size for tree extension |
| `goalBias?` | number | Goal bias probability |
| `maxIterations?` | number | Maximum iterations / samples |
| `goalRadius?` | number | Goal radius for connection |
| `rewireGamma?` | number | Rewire gamma (RRT* only) |
| `numSamples?` | number | Number of PRM samples |
| `kNeighbors?` | number | K-nearest neighbors for PRM |
| `connectionRadius?` | number | Connection radius for PRM |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `planPath` | `(start: Point2D, goal: Point2D, options?: PlanPathOptions) => PlanResult` | Plan a path using the specified method |

## Test Vectors

### Grid methods

@provenance verified via behavioral equivalence with graph-search node

| Test | Method | Expected |
|------|--------|----------|
| A* on empty 10x10 grid: (0,0)->(9,9) | astar | success=true, path.length > 1, cost > 0 |
| Dijkstra on empty 10x10 grid: (0,0)->(5,5) | dijkstra | success=true, path.length > 1 |
| BFS on empty 10x10 grid: (0,0)->(3,3) | bfs | success=true, path.length > 1 |
| No grid provided | astar | success=false, path=[] |
| A* with obstacles at x=5, y=0..3: (0,0)->(9,0) | astar | success=true, path.length > 2 |

### Sampling methods

@provenance verified via behavioral equivalence with rrt, rrt-star nodes

| Test | Method | Expected |
|------|--------|----------|
| Default (no method): (0,0)->(5,5), seed=42 | rrt (default) | success=true, path.length > 1 |
| RRT: (0,0)->(9,9), seed=42 | rrt | success=true, path[0]=(0,0) |
| RRT*: (0,0)->(9,9), seed=42 | rrt-star | success=true, path.length > 1 |
| RRT without bounds | rrt | success=false |
| RRT without collision checker | rrt | success=false |
| RRT* without bounds | rrt-star | success=false, path=[] |

### Options passthrough

@provenance verified via behavioral equivalence

| Test | Expected |
|------|----------|
| RRT with maxIterations=2000, goalRadius=1.0, seed=42 | success=true |
| RRT* deterministic: same seed=42 | identical cost and path.length |

### With obstacles

@provenance verified via behavioral equivalence with individual planners

| Test | Method | Expected |
|------|--------|----------|
| Wall at x=5, y<8: (1,1)->(9,1), seed=42, maxIter=2000 | rrt | success=true, path.length > 2 |
| Grid obstacles at x=5, y=0..3: (0,0)->(9,0) | astar | success=true, path.length > 2 |

### PRM

@provenance verified via behavioral equivalence with prm node

| Test | Expected |
|------|----------|
| Free space (0,0)->(9,9), seed=42 | success=true, path.length > 1 |
| PRM without bounds | success=false |

### D* Lite

@provenance verified via behavioral equivalence with d-star node

| Test | Expected |
|------|----------|
| Empty 10x10 grid: (0,0)->(9,9) via gridWidth/gridHeight | success=true, cost=18 |
| With obstacles at x=5, y=0..3: (0,0)->(9,0) | success=true, path.length > 2 |
| No grid dimensions provided | success=false |
| Grid dimensions from grid object | success=true |
