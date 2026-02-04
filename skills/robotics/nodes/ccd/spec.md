# ccd -- Spec

Depends on: `rotation-ops`, `transform-ops`, `forward-kinematics`, `result-types`

## Purpose

Cyclic Coordinate Descent (CCD) inverse kinematics. An iterative IK solver that
optimizes one joint at a time, cycling from end-effector to base. Each joint
rotation minimizes the angle between the joint-to-end-effector vector and the
joint-to-target vector, projected onto the plane perpendicular to the joint axis.

### Key design decisions

- **End-to-base sweep order.** Each iteration processes joints from end-effector
  back to base. This converges faster than base-to-end because distal joints
  have the most direct effect on end-effector position.
- **Revolute-only.** Prismatic joints are skipped -- CCD only rotates revolute joints.
- **Position-only.** Solves for end-effector position; orientation is not constrained.
- **Plane projection.** For each joint, the vectors to end-effector and to target are
  projected onto the plane perpendicular to the joint's z-axis before computing
  the rotation angle. Sign is determined by the cross product dotted with the z-axis.

@provenance Wang & Chen "A Combined Optimization Method for Solving the Inverse
Kinematics Problem of Mechanical Manipulators" 1991

## Types

### CCDConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxIterations` | number | 100 | Maximum number of full cycles through all joints |
| `tolerance` | number | 1e-4 | Position error tolerance (meters) for convergence |

### DEFAULT_CCD_CONFIG

Constant: `{ maxIterations: 100, tolerance: 1e-4 }`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ccdSolve` | `(joints: DHJoint[], target: [number,number,number], initialAngles: number[], config?: CCDConfig) -> IKResult` | Solve position-only IK using CCD |

### ccdSolve behavior

1. Validate `initialAngles.length === joints.length`; throw on mismatch.
2. Copy `initialAngles` (do not mutate input).
3. For each iteration (up to `maxIterations`):
   a. Compute end-effector position via FK; if error < tolerance, return converged.
   b. For each joint from index `n-1` down to `0`:
      - Skip non-revolute joints.
      - Get joint origin and z-axis from the FK frame at index `i`.
      - Project joint-to-EE and joint-to-target vectors onto the plane
        perpendicular to the joint z-axis.
      - Compute angle between projections; determine sign via cross product.
      - Add angle to `q[i]`.
4. After loop exhaustion, compute final error and return result.

## Test Vectors

### 2-link planar: reachable target

@provenance structural -- verified against FK round-trip

| Input | Expected |
|-------|----------|
| joints=twoLinkPlanar(1,1), target=[1.5,0.5,0], initial=[0,0] | converged=true, positionError < 1e-4, FK matches target to 3 decimals |

### 2-link planar: negative quadrant

@provenance structural -- tests solver generality across workspace

| Input | Expected |
|-------|----------|
| joints=twoLinkPlanar(1,1), target=[-0.5,-1.0,0], initial=[pi/2,0] | converged=true, FK matches target to 2 decimals |

### 2-link planar: reach boundary

@provenance structural -- boundary of reachable workspace

| Input | Expected |
|-------|----------|
| joints=twoLinkPlanar(1,1), target=[1.9,0,0], initial=[0.1,-0.1] | converged=true, positionError < 1e-3 |

### 2-link planar: unreachable target

@provenance structural -- graceful failure outside workspace

| Input | Expected |
|-------|----------|
| joints=twoLinkPlanar(1,1), target=[3,0,0], initial=[0,0], maxIterations=50 | converged=false |

### Joint angles count

@provenance structural

| Input | Expected |
|-------|----------|
| 2-link chain, target=[1,1,0] | jointAngles.length === 2 |

### 3-link spatial: 3D target

@provenance structural -- validates 3D workspace coverage

| Input | Expected |
|-------|----------|
| 3-link spatial chain, target=[0.5,0.5,0.8], initial=[0,0.3,0.3] | converged=true, FK matches target to 2 decimals in x, y, z |

### 3-link spatial: convergence from zeros

@provenance structural -- validates convergence from cold start

| Input | Expected |
|-------|----------|
| 3-link spatial chain, target=[0.8,0.3,0.7], initial=[0,0,0] | converged=true |

### FK round-trip

@provenance structural -- recover a known configuration

| Test | Expected |
|------|----------|
| 2-link (l1=1, l2=0.5), compute targetPos=FK([pi/4, -pi/6]), then ccdSolve from [0,0] | converged=true, FK(result) matches targetPos to 3 decimals |

### Custom config: tighter tolerance

@provenance structural -- tolerance controls accuracy

| Test | Expected |
|------|----------|
| Same target, tolerance=1e-2 vs tolerance=1e-6 | both converge; tight.positionError <= loose.positionError |

### Custom config: maxIterations limits computation

@provenance structural

| Test | Expected |
|------|----------|
| target=[1,1,0], maxIterations=3, tolerance=1e-10 | result.iterations <= 3 |

### Error conditions

- `initialAngles.length !== joints.length`: throws dimension mismatch error
