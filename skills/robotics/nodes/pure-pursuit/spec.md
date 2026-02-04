# pure-pursuit — Spec

Depends on: `result-types`, `drivetrain-types`

## Purpose

Pure pursuit path tracking controller. Computes a circular arc from the robot to a
lookahead point on the path, producing a curvature command that steers the robot toward
the path. Includes lookahead point search (circle-segment intersection), curvature
computation, a full control step, and adaptive (speed-proportional) lookahead distance.

## Conventions

@provenance Coulter "Implementation of the Pure Pursuit Path Tracking Algorithm" 1992,
PythonRobotics (cross-validation)

- **Lookahead point**: Furthest intersection of a circle (centered at robot, radius =
  lookahead distance) with path segments. Falls back to the nearest point on the path
  if no intersection exists.
- **Curvature formula**: `kappa = 2 * sin(alpha) / L_d` where `alpha` = angle to the
  goal point in the robot's local frame and `L_d` = distance to the goal.
- **Sign convention**: Positive curvature = turn left (CCW).
- **Control output**: `linear = speed`, `angular = speed * curvature`.
- **Adaptive lookahead**: `L_d = clamp(gain * |speed|, min, max)`.

## Types

### LookaheadResult

| Field | Type | Description |
|-------|------|-------------|
| `point` | Point2D | The goal point on the path |
| `index` | number | Path segment index where the point was found |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `findLookaheadPoint` | `(pose, path, lookaheadDistance) -> LookaheadResult` | Find goal point at lookahead distance on path; prefers furthest intersection, falls back to nearest point |
| `purePursuitCurvature` | `(pose, goalPoint) -> number` | Curvature to reach goal: transform to local frame, `kappa = 2*sin(alpha)/L_d`. Returns 0 if goal is at robot position. |
| `purePursuitControl` | `(pose, path, speed, lookaheadDistance) -> ControlOutput` | Full control step: find lookahead, compute curvature, return `{linear: speed, angular: speed*curvature}` |
| `adaptiveLookahead` | `(speed, minLookahead, maxLookahead, gainLookahead?) -> number` | Speed-proportional lookahead: `clamp(gain*|speed|, min, max)`. Default gain=1.0. |

## Test Vectors

### findLookaheadPoint

@provenance Coulter 1992, geometric construction

| Pose | Path | Lookahead | Expected |
|------|------|-----------|----------|
| `(0, 0, 0)` | straight x=[0..10] | 3 | `(3, 0)` on segment 0 |
| `(10, 0, 0)` | `[(0,0), (5,0)]` | 2 | nearest = `(5, 0)`, index=0 (no intersection) |
| `(0, 0, 0)` | `[(0,-5), (0,5)]` along y-axis | 2 | `(0, 2)` at distance 2 (furthest intersection) |
| `(100, 100, 0)` | `[(0,0), (5,0)]` | 2 | nearest = `(5, 0)` (no intersection) |

### purePursuitCurvature

@provenance Coulter 1992, mathematical definition

| Pose | Goal | Expected curvature |
|------|------|--------------------|
| `(0, 0, 0)` | `(5, 0)` — straight ahead | `~ 0` |
| `(0, 0, 0)` | `(2, 2)` — left | `kappa > 0` |
| `(0, 0, 0)` | `(2, -2)` — right | `kappa < 0` |
| `(0, 0, 0)` | `(0, 2)` — directly left | `kappa = 2*sin(pi/2)/2 = 1.0` |
| `(3, 4, 1.0)` | `(3, 4)` — same position | `kappa = 0` |
| `(0, 0, pi/2)` | `(0, 5)` — straight ahead at 90 deg heading | `~ 0` |

### Cross-validation: known geometry

@provenance PythonRobotics, Coulter 1992

| Pose | Goal | Expected |
|------|------|----------|
| `(0, 0, 0)` | `(2, 1)` | `alpha = atan2(1, 2) ~ 0.4636`, `L_d = sqrt(5) ~ 2.236`, `kappa = 2*sin(0.4636)/2.236 ~ 0.4` |

### Symmetry

| Pose | Goals | Expected |
|------|-------|----------|
| `(0, 0, 0)` | `(3, 2)` and `(3, -2)` | `kappa_left = -kappa_right`, `kappa_left > 0` |

### purePursuitControl

@provenance Coulter 1992

| Pose | Path | Speed | Lookahead | Expected |
|------|------|-------|-----------|----------|
| `(0, 0, 0)` | straight x=[0..10] | 2.0 | 3.0 | `linear=2.0, angular ~ 0` |
| `(0, 0, 0)` | curved `[(0,0),(2,0),(4,2),(6,4)]` | 1.5 | 3.0 | `linear=1.5, angular != 0` |

### adaptiveLookahead

@provenance mathematical definition

| Speed | Min | Max | Gain | Expected |
|-------|-----|-----|------|----------|
| `0.1` | 1.0 | 5.0 | 1.0 | `1.0` — clamped to min |
| `10` | 1.0 | 5.0 | 1.0 | `5.0` — clamped to max |
| `3.0` | 1.0 | 5.0 | 1.0 | `3.0` — proportional |
| `1.5` | 1.0 | 5.0 | 2.0 | `3.0` — custom gain |
| `-3.0` | 1.0 | 5.0 | 1.0 | `3.0` — absolute value |

### Integration: convergence from offset

@provenance PythonRobotics (trajectory tracking convergence)

| Test | Expected |
|------|----------|
| Start at `(0, 1, 0)` offset from straight path along x, speed=1, lookahead=2, 200 steps at dt=0.1 | `|y| < 0.1` — converges to path |
| Start on circle (radius=5) at `(5, 0, pi/2)`, track circular path, 300 steps at dt=0.05 | distance from center ~ 5 (tol 1.0) |

### Edge cases

| Test | Expected |
|------|----------|
| Path with zero-length segment `[(0,0),(0,0),(5,0)]` | returns a valid point |
