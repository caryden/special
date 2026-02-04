# jacobian-ik — Spec

Depends on: mat-ops, rotation-ops, transform-ops, forward-kinematics, jacobian, result-types

## Purpose

Damped least-squares (Levenberg-Marquardt) inverse kinematics for serial manipulators.
Position-only (3D target). Computes joint updates via:

```
dq = J^T (J J^T + lambda^2 I)^{-1} e
```

where `J` is the 3×n linear Jacobian, `e` is the position error vector, and `lambda`
is the damping factor. Damping ensures numerical stability near singularities.

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023, OROCOS KDL v1.5.3

## Types

### JacobianIKConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxIterations` | number | 100 | Maximum solver iterations |
| `tolerance` | number | 1e-4 | Position error convergence threshold (meters) |
| `damping` | number | 0.01 | Damping factor (lambda) |
| `stepSize` | number | 1.0 | Step size multiplier for joint updates |

### DEFAULT_JACOBIAN_IK_CONFIG

```
{ maxIterations: 100, tolerance: 1e-4, damping: 0.01, stepSize: 1.0 }
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `jacobianIK` | `(joints: DHJoint[], target: number[3], initialAngles: number[], config?: Partial<JacobianIKConfig>) → IKResult` | Damped least-squares IK, position-only |
| `jacobianIKWithLimits` | `(joints: DHJoint[], target: number[3], initialAngles: number[], jointLimits: [number,number][], config?: Partial<JacobianIKConfig>) → IKResult` | Same with per-joint angle limits; angles clamped after each iteration |

Returns `IKResult` from result-types: `{ jointAngles, converged, positionError, iterations }`.

## Test Vectors

### 2-link planar

@provenance analytic FK cross-validation: x = l1*cos(q1) + l2*cos(q1+q2), y = l1*sin(q1) + l2*sin(q1+q2)

For `twoLinkPlanar(l1=1.0, l2=0.5)`, `initialAngles=[0.1, 0.1]`:

| Target | Expected |
|--------|----------|
| `[1.5, 0.5, 0]` (reachable interior) | `converged=true`, FK(jointAngles) matches target within tolerance |
| `[1.9, 0, 0]` (near full extension) | `converged=true`, FK(jointAngles) matches target within tolerance |
| `[-0.5, -1.0, 0]` (negative quadrant) | `converged=true`, FK(jointAngles) matches target within tolerance |
| `[3.0, 0, 0]` (unreachable, beyond l1+l2) | `converged=false`, `positionError > tolerance` |

### Convergence from various initial guesses

@provenance solver robustness tests

For `twoLinkPlanar(l1=1.0, l2=0.5)`, target `[1.0, 0.8, 0]`:

| Initial angles | Expected |
|----------------|----------|
| `[0, 0]` | `converged=true` |
| `[pi/2, pi/2]` | `converged=true` |
| `[-pi/4, pi/3]` | `converged=true` |

All converged results must satisfy: FK(jointAngles) position error < tolerance.

### 3-link spatial

@provenance numerical FK cross-validation

For a 3-link arm with mixed joint parameters, `initialAngles=[0.1, 0.1, 0.1]`:

| Target | Expected |
|--------|----------|
| `[0.5, 0.5, 0.8]` (3D reachable) | `converged=true`, FK(jointAngles) matches target within tolerance |

### Config variations

@provenance solver parameter sensitivity tests

For `twoLinkPlanar(l1=1.0, l2=0.5)`, target `[1.0, 0.8, 0]`:

| Config override | Expected |
|-----------------|----------|
| `{ damping: 0.5 }` (higher damping) | `converged=true`, may need more iterations than default |
| `{ stepSize: 0.1 }` (smaller step) | `converged=true`, `iterations > default_iterations` |
| `{ tolerance: 1e-8 }` (tighter tolerance) | `converged=true`, `iterations > default_iterations`, `positionError < 1e-8` |
| `{ maxIterations: 2 }` (too few) | `converged=false` (insufficient iterations) |

### Joint limits

@provenance OROCOS KDL v1.5.3 clamping behavior

For `twoLinkPlanar(l1=1.0, l2=0.5)`:

| Test | Joint limits | Expected |
|------|-------------|----------|
| Reachable with wide limits | `[[-pi, pi], [-pi, pi]]` | `converged=true`, angles within limits |
| Reachable with tight limits | `[[-0.5, 0.5], [-0.5, 0.5]]` | all joint angles within `[-0.5, 0.5]` |
| Clamps initial angles | limits `[[0, pi], [0, pi]]`, initial `[-1, -1]` | initial angles clamped to `[0, 0]` before iteration |

### FK round-trip

@provenance verified by forward-then-inverse consistency

| Test | Expected |
|------|----------|
| Compute FK at known `q_orig`, use position as IK target, solve IK | `converged=true`, FK(recovered_q) matches original position within tolerance |
| 2-link at `q_orig=[0.5, -0.3]` | position error < 1e-4 |
| 3-link at `q_orig=[0.3, 0.7, -0.5]` | position error < 1e-4 |

Note: recovered joint angles may differ from `q_orig` (non-unique solutions), but
FK position must match.

### Error conditions

| Test | Expected |
|------|----------|
| `initialAngles.length !== joints.length` | throws dimension mismatch |
| `jointLimits.length !== joints.length` (withLimits variant) | throws dimension mismatch |
