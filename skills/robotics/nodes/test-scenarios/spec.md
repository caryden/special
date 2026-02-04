# test-scenarios — Spec

Depends on: `result-types`

## Purpose

Standard test scenario factories for robotics algorithm validation. Provides
deterministic grid worlds, waypoint paths, measurement sequences, and control
error sequences used as test fixtures across multiple nodes.

**Note:** This is a test-only node. It provides test fixtures and is not intended
for translation into target languages.

## Types

### GridWorld

| Field | Type | Description |
|-------|------|-------------|
| `width` | number | Grid width |
| `height` | number | Grid height |
| `obstacles` | Set<string> | Set of `"x,y"` obstacle keys |
| `isBlocked` | `(x, y) -> boolean` | Returns true if cell is an obstacle or out of bounds |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `simpleGridWorld` | `(width, height, obstacleFraction?) -> GridWorld` | Create a 2D grid with deterministic obstacles. Hash: `(x*7 + y*13 + x*y*3) % 100 < fraction*100`. Default fraction=0. |
| `straightLinePath` | `(n?) -> Point2D[]` | Straight line from (0,0) to (10,0) with n waypoints. Default n=11. |
| `circularArcPath` | `(radius, startAngle, endAngle, n?) -> Point2D[]` | Circular arc centered at origin. Default n=20. |
| `figureEightPath` | `(radius, n?) -> Point2D[]` | Figure-eight: x=radius*sin(t), y=radius*sin(t)*cos(t). Default n=40. |
| `constantPositionMeasurements` | `(trueValue, noise[], count) -> number[]` | Constant position measurements with cyclic deterministic noise. |
| `linearRampMeasurements` | `(slope, intercept, noise[], count) -> number[]` | Linear ramp: value[i] = slope*i + intercept + noise[i % noise.length]. |
| `stepResponseErrors` | `(setpoint, plantGain, numSteps) -> number[]` | Step response errors for first-order plant: y[k+1] = y[k] + plantGain*error[k]. Returns error sequence. |

## Test Vectors

### simpleGridWorld

@provenance mathematical-definition (deterministic hash-based obstacle placement)

| Test | Expected |
|------|----------|
| `simpleGridWorld(10, 8)` | width=10, height=8 |
| `simpleGridWorld(10, 10, 0)` | obstacles.size = 0 |
| `simpleGridWorld(20, 20, 0.3)` | obstacle ratio roughly 0.3 (between 0.1 and 0.6) |
| `simpleGridWorld(15, 15, 0.25)` called twice | identical obstacle sets (deterministic) |
| `isBlocked(x, y)` on known obstacle | returns true |
| `isBlocked(-1, 0)`, `isBlocked(0, -1)`, `isBlocked(10, 0)`, `isBlocked(0, 10)` | all true (out of bounds) |
| `simpleGridWorld(10, 10, 0).isBlocked(5, 5)` | false (no obstacles, in bounds) |

### straightLinePath

@provenance mathematical-definition (uniform linear interpolation)

| Test | Expected |
|------|----------|
| `straightLinePath()` | 11 points |
| `straightLinePath(5)` | 5 points |
| First point | (0, 0) |
| Last point | (10, 0) |
| All y values (n=20) | y = 0 for all points |

### circularArcPath

@provenance mathematical-definition (parametric circle)

| Test | Expected |
|------|----------|
| `circularArcPath(5, 0, pi, 10)` | 10 points |
| `circularArcPath(5, 0, pi)` | 20 points (default) |
| All points at radius r=3 (15 points, 0 to pi) | sqrt(x^2 + y^2) = 3 for all |
| First point angle for startAngle=pi/4 | atan2(y, x) = pi/4 |
| Last point angle for endAngle=pi/2 | atan2(y, x) = pi/2 |

### figureEightPath

@provenance mathematical-definition (Lissajous parametric curve)

| Test | Expected |
|------|----------|
| `figureEightPath(5, 30)` | 30 points |
| `figureEightPath(5)` | 40 points (default) |
| Path passes through origin region (100 points, r=5) | at least one point with \|x\| < 0.5 and \|y\| < 0.5 |

### constantPositionMeasurements

@provenance mathematical-definition (additive cyclic noise)

| Test | Expected |
|------|----------|
| `constantPositionMeasurements(5, [0.1, -0.1], 10)` | length = 10 |
| trueValue=10, noise=[0.1, -0.2, 0.05], count=6 | all values within 1 of 10 |

### linearRampMeasurements

@provenance mathematical-definition (linear ramp with additive noise)

| Test | Expected |
|------|----------|
| `linearRampMeasurements(2, 1, [0], 5)` | length = 5 |
| slope=3, intercept=0, noise=[0], count=5 | m[i] = 3*i; consecutive differences = 3 |

### stepResponseErrors

@provenance mathematical-definition (first-order discrete plant simulation)

| Test | Expected |
|------|----------|
| `stepResponseErrors(1, 0.1, 20)` | length = 20 |
| setpoint=5, plantGain=0.1, 10 steps | errors[0] = 5 (initial error equals setpoint) |
| setpoint=1, plantGain=0.5, 20 steps | \|errors[19]\| < \|errors[0]\| (stable convergence) |
