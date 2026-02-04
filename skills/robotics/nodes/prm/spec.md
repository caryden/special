# prm — Spec

Depends on: `result-types`, `rrt`

## Purpose

Probabilistic Roadmap (PRM) planner for multi-query path planning. Constructs a
roadmap graph in a preprocessing phase by sampling random configurations and
connecting nearby collision-free pairs. Queries then search this graph using Dijkstra.

Two-phase approach:
1. **Build**: Sample N points, connect k-nearest neighbors within a connection radius
   if collision-free. Edges are bidirectional.
2. **Query**: Connect start and goal to nearest reachable roadmap node, then run
   Dijkstra on the graph.

Amortizes construction cost across multiple queries on the same environment.

## Conventions

@provenance Kavraki et al. "Probabilistic roadmaps for path planning in
high-dimensional configuration spaces" 1996, OMPL v1.7.0

- **Defaults**: numSamples=200, kNeighbors=10, connectionRadius=5.0
- **Bidirectional edges**: When node A connects to B, B also connects to A.
- **Collision checking**: Uses the same `CollisionChecker` type as RRT.
- **Seeded PRNG**: Uses `createRNG` from the `rrt` node for reproducibility.
- **Query phase**: Dijkstra on the roadmap graph. Path includes start and goal
  endpoints prepended/appended to the roadmap path. Total cost includes the
  start-to-roadmap and roadmap-to-goal edge distances.

## Types

### PRMNode

| Field | Type | Description |
|-------|------|-------------|
| `point` | Point2D | Position of this node |
| `neighbors` | number[] | Indices of connected neighbor nodes |

### PRMConfig

| Field | Type | Description |
|-------|------|-------------|
| `numSamples` | number | Number of samples to generate |
| `kNeighbors` | number | Max nearest neighbors to attempt connections to |
| `connectionRadius` | number | Maximum connection distance |

### PRMRoadmap

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | PRMNode[] | Roadmap nodes |
| `bounds` | {minX, maxX, minY, maxY} | Search space bounds |
| `isCollisionFree` | CollisionChecker | Collision checker |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `prmBuild` | `(bounds, isCollisionFree, config?, seed?) => PRMRoadmap` | Build a PRM roadmap by sampling and connecting nodes |
| `prmQuery` | `(roadmap, start, goal, connectionRadius?) => PlanResult` | Query the roadmap for a path using Dijkstra |
| `prmPlan` | `(start, goal, bounds, isCollisionFree, config?, seed?) => PlanResult` | One-shot: build and query in a single call |

## Test Vectors

### prmBuild

@provenance Kavraki et al. 1996, verified manually

| Test | Expected |
|------|----------|
| 50 samples, seed=42, [0,10]x[0,10] | nodes.length == 50 |
| 200 samples, seed=42: all points within bounds | x in [0,10], y in [0,10] |
| 200 samples, free space: some nodes have neighbors | connected count > 0 |
| Determinism: same seed=42 | identical node positions |
| All connections blocked: every node | neighbors.length == 0 |
| Bidirectional: if A has neighbor B | B has neighbor A |

### prmQuery

@provenance OMPL v1.7.0 (cross-validation)

| Test | Expected |
|------|----------|
| Connected roadmap, (1,1)->(9,9) | success=true, path.length > 1, 0 < cost < Inf |
| Path endpoints | path[0]=(1,1), path[last]=(9,9) |
| Start far from roadmap (100,100), tiny radius=0.01 | success=false |
| Goal far from roadmap (100,100), tiny radius=0.01 | success=false |
| Multi-query: 3 queries on same roadmap | all success=true |
| Disconnected roadmap (all edges blocked) | success=false |

### prmPlan

@provenance OMPL v1.7.0 (cross-validation), PythonRobotics

| Test | Expected |
|------|----------|
| Free space (0,0)->(9,9), seed=42 | success=true, path.length > 1, cost > 0 |
| Determinism: same seed=42, (1,1)->(8,8) | identical cost and path.length |
| Wall at x=5, y<8: (1,1)->(9,1), 500 samples | success=true, path.length > 2 |
| Straight-line cost: (0,5)->(10,5), 500 samples | cost < 3 * optimal (optimal=10) |
