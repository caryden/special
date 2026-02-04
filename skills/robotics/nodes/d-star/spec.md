# d-star — Spec

Depends on: `result-types`

## Purpose

D* Lite algorithm for incremental replanning in dynamic environments. Efficiently
replans paths when edge costs change (e.g., new obstacles detected). Searches backward
from the goal and propagates cost changes incrementally, avoiding full replanning from
scratch.

Key concepts:
- `rhs(s)`: one-step lookahead cost (min over successors of g + cost)
- `g(s)`: cost-to-come estimate
- A node is **consistent** when `g(s) = rhs(s)`
- Priority queue uses keys: `[min(g, rhs) + h + km; min(g, rhs)]`
- `km` accumulates heuristic offsets when the robot moves

## Conventions

@provenance Koenig & Likhachev "D* Lite" AAAI 2002, PythonRobotics (cross-validation)

- **Grid**: 4-connected (up, down, left, right), uniform cost 1 per step.
- **Backward search**: Initializes from goal (rhs(goal) = 0) and computes costs
  toward start. Path extraction follows decreasing g-values from start to goal.
- **Heuristic**: Manhattan distance for priority key computation.
- **Incremental replanning**: After obstacle changes, only affected nodes are updated
  and re-queued. The `km` modifier handles stale keys when the robot start moves.
- **Mutable state**: `DStarState` is mutated in place during `dStarPlan` and
  `dStarReplan` calls. This is intentional for incremental operation.

## Types

### DStarState

| Field | Type | Description |
|-------|------|-------------|
| `width` | number | Grid width |
| `height` | number | Grid height |
| `start` | Point2D | Current start position |
| `goal` | Point2D | Goal position |
| `cells` | Map<string, DStarCell> | Cell data indexed by "x,y" key |
| `queue` | [k1, k2, x, y][] | Priority queue entries |
| `blocked` | Set<string> | Blocked cell keys |
| `km` | number | Key modifier for incremental replanning |

### DStarCell

| Field | Type | Description |
|-------|------|-------------|
| `g` | number | Cost-to-come estimate |
| `rhs` | number | One-step lookahead cost |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `dStarInit` | `(width, height, start, goal, obstacles?) => DStarState` | Initialize D* Lite planner state |
| `dStarPlan` | `(state: DStarState) => PlanResult` | Plan initial path (mutates state) |
| `dStarReplan` | `(state, addedObstacles, removedObstacles, newStart?) => PlanResult` | Incremental replan after obstacle/start changes (mutates state) |

## Test Vectors

### Obstacle-free planning

@provenance Koenig & Likhachev AAAI 2002, PythonRobotics (cross-validation)

| Test | Grid | Start | Goal | Expected |
|------|------|-------|------|----------|
| Empty 10x10 grid | 10x10 | (0,0) | (9,9) | success=true, cost=18 (Manhattan distance) |
| Path endpoints | 10x10 | (0,0) | (5,5) | path[0]=(0,0), path[last]=(5,5) |
| Path length = cost + 1 | 10x10 | (0,0) | (3,4) | path.length=8, cost=7 |
| Start equals goal | 5x5 | (2,2) | (2,2) | success=true, path=[(2,2)], cost=0 |
| Adjacent cells | 5x5 | (0,0) | (1,0) | cost=1, path.length=2 |

### With obstacles

@provenance PythonRobotics (cross-validation)

| Test | Obstacles | Start | Goal | Expected |
|------|-----------|-------|------|----------|
| Wall at x=5, y=0..8 | 9 cells | (0,0) | (9,0) | success=true, path.length > 10, no obstacle on path |
| Surrounded goal | 8 cells around (5,5) | (0,0) | (5,5) | success=false, cost=Infinity |
| Narrow corridor (gap at y=4) | walls at x=3, y=0..3 and y=5..9 | (0,2) | (6,2) | success=true, path passes through (3,4) |

### Incremental replanning

@provenance Koenig & Likhachev AAAI 2002

| Test | Expected |
|------|----------|
| Block mid-path cell after initial plan: (0,0)->(9,0) | success=true, new path avoids blocked cell |
| Remove full wall (10 cells at x=5): initially blocked | success=true after removal, cost=9 |
| Incrementally add obstacles (1,1) then (2,2) | both replans succeed |
| Block shortcut at (3,0): initial cost=5 from (0,0)->(5,0) | new cost > 5 |

### Replanning with robot movement

@provenance Koenig & Likhachev AAAI 2002

| Test | Expected |
|------|----------|
| Robot moves (0,0)->(1,1), discovers obstacle at (3,3) | success=true, path[0]=(1,1) |
| Multiple moves with obstacle discovery on 15x15 grid | all replans succeed |

### Edge cases

@provenance verified manually

| Test | Expected |
|------|----------|
| Start is blocked | success=false |
| Goal is blocked | success=false |
| 2x2 grid: (0,0)->(1,1) | success=true, cost=2 |
