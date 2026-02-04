# graph-search — Spec

Depends on: `result-types`

## Purpose

Grid-based graph search algorithms: BFS, Dijkstra, and A*. Operates on a 4-connected
grid (up/down/left/right, no diagonals). Each step has uniform cost 1.0 by default.
A* uses Manhattan distance heuristic by default. All functions are pure.

## Conventions

@provenance Hart, Nilsson & Raphael "A Formal Basis for the Heuristic Determination
of Minimum Cost Paths" 1968 (A*), PythonRobotics (cross-validation)

- **Grid connectivity**: 4-connected (up, down, left, right). No diagonal movement.
- **Default cost**: Uniform cost 1 per step for BFS and Dijkstra. Custom cost functions
  supported for Dijkstra and A*.
- **Default heuristic**: Manhattan distance `|dx| + |dy|` for A*. Euclidean distance
  available as alternative.
- **Default algorithm**: A* with Manhattan heuristic when no algorithm specified.
- **Coordinate system**: (x, y) where x is column index [0, width) and y is row
  index [0, height).

## Types

### GridGraph

| Field | Type | Description |
|-------|------|-------------|
| `width` | number | Grid width (number of columns) |
| `height` | number | Grid height (number of rows) |
| `isBlocked` | (x, y) => boolean | Returns true if cell (x, y) is an obstacle |

### SearchOptions

| Field | Type | Description |
|-------|------|-------------|
| `algorithm` | 'bfs' \| 'dijkstra' \| 'astar' | Which algorithm to use |
| `costFn?` | (from, to) => number | Custom edge cost function (default: uniform 1) |
| `heuristicFn?` | (from, goal) => number | Custom heuristic for A* (default: Manhattan) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `manhattanDistance` | `(a: Point2D, b: Point2D) => number` | Manhattan distance: \|dx\| + \|dy\| |
| `euclideanDistance` | `(a: Point2D, b: Point2D) => number` | Euclidean distance: sqrt(dx^2 + dy^2) |
| `createGridGraph` | `(width, height, obstacles?) => GridGraph` | Create grid from dimensions and optional obstacle list |
| `gridSearch` | `(graph, start, goal, options?) => PlanResult` | Run grid search. Defaults to A* with Manhattan heuristic |

## Test Vectors

### Heuristic functions

@provenance mathematical-definition

| Input | Expected |
|-------|----------|
| `manhattanDistance((1,2), (3,4))` | `4` |
| `euclideanDistance((1,2), (3,4))` | `sqrt(8) = 2.8284...` |
| `manhattanDistance((5,5), (5,5))` | `0` |
| `euclideanDistance((5,5), (5,5))` | `0` |

### Empty grid paths

@provenance PythonRobotics (cross-validation), verified manually

| Test | Start | Goal | Expected |
|------|-------|------|----------|
| Straight line (10x10 grid) | (0,0) | (5,0) | cost=5, path length=6 |
| Diagonal (10x10 grid) | (0,0) | (5,5) | cost=10 (Manhattan path) |
| 3x3 grid corners | (0,0) | (2,2) | cost=4, all points within bounds |

### Obstacle avoidance

@provenance PythonRobotics (cross-validation), verified manually

| Test | Obstacles | Start | Goal | Expected |
|------|-----------|-------|------|----------|
| Single obstacle | (2,0) | (0,0) | (4,0) | cost=6 (detour around obstacle) |
| Wall with gap at y=5 | x=3, y=0..4 | (0,0) | (6,0) | path found through gap |
| Surrounded goal | (4,3),(4,5),(3,4),(5,4) | (0,0) | (4,4) | success=false, path=[] |

### Algorithm comparison

@provenance Hart, Nilsson & Raphael 1968, verified via behavioral equivalence

| Test | Expected |
|------|----------|
| BFS on uniform 10x10 grid (0,0)->(5,5) | cost=10 |
| Dijkstra on uniform 10x10 grid (0,0)->(5,5) | cost=10 |
| A* on uniform 10x10 grid (0,0)->(5,5) | cost=10 |
| All three algorithms: same cost on uniform grid with obstacles at (3,0),(3,1),(3,2) | costs equal |
| A* explores fewer nodes than BFS on 30x30 grid with wall | nodesExplored(A*) < nodesExplored(BFS) |

### Custom cost and heuristic

@provenance verified manually

| Test | Expected |
|------|----------|
| Dijkstra with rightward cost=10: (0,0)->(3,0) | cost=30 |
| A* with Euclidean heuristic: (0,0)->(5,5) | cost=10 |

### Start/goal edge cases

@provenance verified manually

| Test | Expected |
|------|----------|
| start == goal at (3,3) | success=true, path=[(3,3)], cost=0, nodesExplored=1 |
| start is blocked | success=false, nodesExplored=0 |
| goal is blocked | success=false, nodesExplored=0 |
| BFS: start == goal at (2,2) | success=true, cost=0, path=[(2,2)] |
| Dijkstra: start == goal at (2,2) | success=true, cost=0, path=[(2,2)] |
| BFS: no path (surrounded goal) | success=false |
| Dijkstra: no path (surrounded goal) | success=false |

### Path properties

| Property | Verified |
|----------|----------|
| Path starts at start and ends at goal | Yes |
| Each step is 4-connected (dx+dy = 1) | Yes |
| cost == path.length - 1 for uniform cost | Yes |
| nodesExplored > 0 for non-trivial search | Yes |

### createGridGraph

@provenance verified manually

| Test | Expected |
|------|----------|
| `createGridGraph(5, 8)` | width=5, height=8 |
| No obstacles: `isBlocked(0,0)` and `isBlocked(4,4)` | both false |
| With obstacle at (2,3): `isBlocked(2,3)` | true |
| With obstacle at (2,3): `isBlocked(2,2)` | false |
