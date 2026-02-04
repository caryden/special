# fabrik -- Spec

Depends on: `result-types`

## Purpose

FABRIK (Forward And Backward Reaching Inverse Kinematics). A geometric iterative
IK solver that works directly with joint positions in Cartesian space. Does not
require DH parameters or Jacobians.

### Key design decisions

- **Position-based.** Works with joint positions (FabrikPoint), not angles or
  DH parameters. This makes it simple and fast for serial chains.
- **Two-phase iteration.** Each iteration alternates a forward reaching pass
  (end-effector to base) and a backward reaching pass (base to end-effector).
- **Unreachable early exit.** If the target distance exceeds total reach, the
  chain is stretched toward the target in a single pass with 0 iterations
  (no iterative loop entered).
- **Angle extraction.** `fabrikSolveAngles` converts between the position-based
  FABRIK result and a joint-angle IKResult. Assumes a planar chain starting
  along X for initial layout. First angle is absolute; subsequent angles are
  relative (difference from previous link angle).

@provenance Aristidou & Lasenby "FABRIK: A fast, iterative solver for the
Inverse Kinematics problem" 2011

## Types

### FabrikPoint

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | X coordinate (meters) |
| `y` | number | Y coordinate (meters) |
| `z` | number | Z coordinate (meters) |

### FabrikConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxIterations` | number | 100 | Maximum number of forward/backward iterations |
| `tolerance` | number | 1e-4 | Position error tolerance (meters) for convergence |

### DEFAULT_FABRIK_CONFIG

Constant: `{ maxIterations: 100, tolerance: 1e-4 }`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `fabrikLinkLengths` | `(positions: FabrikPoint[]) -> number[]` | Compute link lengths from consecutive joint positions |
| `fabrikTotalReach` | `(linkLengths: number[]) -> number` | Sum of all link lengths |
| `fabrikSolve` | `(positions: FabrikPoint[], target: FabrikPoint, config?: FabrikConfig) -> { positions, converged, error, iterations }` | Solve IK in position space |
| `fabrikSolveAngles` | `(linkLengths: number[], target: FabrikPoint, config?: FabrikConfig) -> IKResult` | Solve IK and return joint angles |

### fabrikSolve behavior

1. Require at least 2 positions; throw otherwise.
2. Compute link lengths and total reach.
3. If base-to-target distance > total reach: stretch chain toward target,
   return `converged=false`, `iterations=0`.
4. Otherwise iterate (up to `maxIterations`):
   a. Check error; if < tolerance, break.
   b. **Forward pass:** set end-effector to target, reposition joints backward
      preserving link lengths.
   c. **Backward pass:** reset base to original position, reposition joints
      forward preserving link lengths.
5. Return final positions, convergence status, error, and iteration count.

### fabrikSolveAngles behavior

1. Build initial positions along X-axis from link lengths (starting at origin).
2. Run `fabrikSolve`.
3. Extract absolute angle of each link via `atan2(dy, dx)`.
4. Convert to relative angles: first angle is absolute, each subsequent angle
   is the difference from the previous link's absolute angle.
5. Return IKResult.

## Test Vectors

### fabrikLinkLengths

@provenance structural -- Euclidean distance between consecutive positions

| Input | Expected |
|-------|----------|
| `[(0,0,0), (1,0,0), (1,1,0)]` | `[1, 1]` |
| `[(0,0,0), (1,1,1)]` | `[sqrt(3)]` |

### fabrikTotalReach

@provenance structural

| Input | Expected |
|-------|----------|
| `[1, 0.5, 0.3]` | `1.8` |
| `[]` | `0` |

### fabrikSolve: reachable targets

@provenance Aristidou & Lasenby 2011 (algorithm behavior)

| Test | Setup | Expected |
|------|-------|----------|
| Converges to target | positions=[(0,0,0),(1,0,0),(2,0,0)], target=(1.5,0.5,0) | converged=true, error < 1e-4, end-effector within 1e-4 of target |
| Preserves link lengths | same setup, target=(1,1,0) | output link lengths match input link lengths to 4 decimals |
| Preserves base position | same setup, target=(1.5,0.5,0) | positions[0] == (0,0,0) |
| Correct position count | same setup, target=(1,1,0) | positions.length === 3 |

### fabrikSolve: unreachable targets

@provenance Aristidou & Lasenby 2011 (unreachable case)

| Test | Setup | Expected |
|------|-------|----------|
| Stretches toward target | positions=[(0,0,0),(1,0,0),(2,0,0)], target=(5,0,0) | converged=false, chain stretched toward target |
| Preserves link lengths | same setup, target=(0,0,10) | output link lengths match input to 4 decimals |
| Zero iterations | same setup, target=(100,0,0) | iterations === 0 |

### fabrikSolve: 3D targets

@provenance structural -- validates 3D workspace coverage

| Test | Setup | Expected |
|------|-------|----------|
| Reaches 3D target | 4-position chain along X, target=(1,1,1) | converged=true, end-effector within 1e-4 of target |
| Target directly above base | same chain, target=(0,0,2.5) | converged=true, end-effector z within 1e-3 of 2.5 |

### fabrikSolve: edge cases

@provenance structural

| Test | Expected |
|------|----------|
| Fewer than 2 positions | throws "at least 2" |
| Single link: [(0,0,0),(1,0,0)], target=(0,1,0) | converged=true, end-effector within 1e-4 of target |
| Already at target: [(0,0,0),(1,0,0),(2,0,0)], target=(2,0,0) | converged=true, iterations <= 1 |

### fabrikSolve: custom config

@provenance structural

| Test | Expected |
|------|----------|
| maxIterations=5, tolerance=1e-10 | iterations <= 5 |
| Loose tolerance converges in fewer iterations than tight | loose.iterations <= tight.iterations |

### fabrikSolveAngles

@provenance structural -- angle extraction from position-based solver

| Test | Setup | Expected |
|------|-------|----------|
| Correct angle count | linkLengths=[1,1], target=(1.5,0.5,0) | jointAngles.length === 2 |
| Converges for reachable target | linkLengths=[1,1], target=(1,1,0) | converged=true, positionError < 1e-4 |
| Does not converge for unreachable | linkLengths=[1,1], target=(5,0,0) | converged=false |
| Angle reconstruction | linkLengths=[1,1], target=(1,1,0) | Reconstructing positions from cumulative joint angles recovers target to 2 decimals |
| 3-link chain | linkLengths=[1,0.5,0.3], target=(1.2,0.5,0) | converged=true, jointAngles.length === 3 |
