# stanley-controller — Spec

Depends on: `result-types`, `drivetrain-types`

## Purpose

Stanley path tracking controller. Uses front-axle position and crosstrack error to compute
a steering angle that combines heading error correction with crosstrack error correction
scaled by speed. The Stanley method was developed for Stanford's autonomous vehicle in the
DARPA Grand Challenge.

## Conventions

@provenance Hoffmann et al. "Autonomous Automobile Trajectory Tracking for Off-Road
Driving" 2007 (Stanford DARPA Grand Challenge), PythonRobotics (cross-validation)

- **Reference point**: Front axle (not rear axle like pure pursuit).
- **Steering law**: `delta = heading_error + atan2(-k * e, |v| + k_soft)` where
  `heading_error = path_heading - vehicle_heading`, `e` = signed crosstrack error,
  `v` = speed, `k` = crosstrack gain, `k_soft` = softening constant.
- **Crosstrack error sign**: Positive = left of path (path direction defines forward).
  Computed via cross product of path direction and point-to-nearest vectors.
- **Angle normalization**: All heading errors normalized to `[-pi, pi]`.
- **Steering clamp**: Output clamped to `[-maxSteering, maxSteering]`.

## Types

### StanleyConfig

| Field | Type | Description |
|-------|------|-------------|
| `k` | number | Crosstrack error gain |
| `kSoft` | number | Softening constant to prevent division by zero at low speeds |
| `maxSteering` | number | Maximum steering angle (radians) |

Default: `{ k: 1.0, kSoft: 1e-5, maxSteering: pi/4 }`

### NearestSegmentResult

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | Index of the nearest segment start point |
| `crosstrackError` | number | Signed crosstrack error (positive = left of path) |
| `pathHeading` | number | Path heading at the nearest point (radians) |
| `nearestPoint` | Point2D | Nearest point on the path |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `stanleyFindNearest` | `(position, path) -> NearestSegmentResult` | Find nearest path segment: returns index, signed crosstrack error, path heading, nearest point |
| `stanleyFrontAxle` | `(pose, wheelBase) -> Point2D` | Compute front axle position: `(x + L*cos(theta), y + L*sin(theta))` |
| `normalizeAngle` | `(angle) -> number` | Normalize angle to `[-pi, pi]` |
| `stanleySteeringAngle` | `(headingError, crosstrackError, speed, config?) -> number` | Compute clamped steering angle: `delta = heading_error + atan2(-k*e, |v|+k_soft)` |
| `stanleyControl` | `(pose, path, speed, wheelBase, config?) -> ControlOutput` | Full controller step: front axle, find nearest, compute steering. Returns `{linear: speed, angular: steeringAngle}` |

## Test Vectors

### normalizeAngle

@provenance mathematical definition

| Input | Expected |
|-------|----------|
| `0` | `0` |
| `1` | `1` |
| `-1` | `-1` |
| `pi` | `pi` |
| `2*pi` | `~ 0` |
| `3*pi` | `~ pi` |
| `-2*pi` | `~ 0` |
| `-3*pi` | `~ -pi` |

### stanleyFrontAxle

@provenance mathematical definition (rigid body kinematics)

| Pose | wheelBase | Expected front axle |
|------|-----------|---------------------|
| `(0, 0, 0)` | 2.0 | `(2, 0)` |
| `(1, 1, pi/2)` | 2.0 | `(1, 3)` |
| `(3, 4, 0.5)` | 2.5 | distance from pose = 2.5 |

### stanleyFindNearest

@provenance Hoffmann et al. 2007, verified manually

Path: `[(0,0), (5,0), (10,0)]`

| Position | Expected index | Crosstrack error | Path heading |
|----------|----------------|------------------|--------------|
| `(2, 0)` — on path | 0 | `~ 0` | `0` |
| `(2, 1)` — left of path | 0 | `> 0` | `0` |
| `(2, -1)` — right of path | 0 | `< 0` | `0` |
| `(7, 0.5)` — near segment 1 | 1 | — | `0` |
| `(3, 2)` | 0 | nearest point = `(3, 0)` | `0` |

### stanleyFindNearest edge cases

| Path | Position | Expected |
|------|----------|----------|
| `[(3,3), (3,3), (6,3)]` — zero-length segment | `(4, 3)` | nearest = `(4, 3)`, on segment 1 |

### stanleySteeringAngle

@provenance Hoffmann et al. 2007, mathematical definition

| Heading error | Crosstrack error | Speed | Expected |
|---------------|-----------------|-------|----------|
| `0` | `0` | 1 | `~ 0` |
| `0.1` | `0` | 1 | `~ 0.1` — heading error passes through |
| `0` | `1` (left) | 1 | `< 0` — steers right to correct |
| `1.0` | `5.0` | 0.1 | `|delta| <= maxSteering` — clamped |
| `0` | `1` | 1 (slow) vs 10 (fast) | `|fast| < |slow|` — higher speed reduces correction |
| `0` | `1` | 1 with k=0.5 vs k=5.0 | `|high_k| > |low_k|` — higher gain increases correction |

### stanleyControl

@provenance Hoffmann et al. 2007, PythonRobotics

Path: `[(0,0), (10,0), (20,0)]`, wheelBase=2.5

| Pose | Speed | Expected |
|------|-------|----------|
| `(0, 0, 0)` — on path, aligned | 1 | `linear=1, |angular| < 0.01` |
| `(5, 2, 0)` — off-path left | 1 | `angular != 0` — corrects toward path |
| `(5, 0, 0.3)` — heading error | 1 | `angular != 0` — corrects heading |
| `(0, 0, 0)` | 3.5 | `linear = 3.5` — speed preserved |

### Convergence

@provenance PythonRobotics (trajectory tracking convergence)

| Test | Expected |
|------|----------|
| Start at `(0, 3, 0.2)`, path `[(0,0), (100,0)]`, speed=2.0, k=2.0, wheelBase=2.5, 200 steps at dt=0.1 | `|y| < 0.5`, `|theta| < 0.1` |
