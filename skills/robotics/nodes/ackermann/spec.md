# ackermann — Spec

Depends on: `drivetrain-types`

## Purpose

Ackermann (bicycle model) steering geometry: forward/inverse kinematics, turning radius,
individual front wheel angles (full Ackermann), odometry, and steering clamp. The bicycle
model approximates a four-wheeled front-steered vehicle as a two-wheeled vehicle with
front and rear axles collapsed to centerline points. Reference point is the rear axle.

## Conventions

@provenance Rajamani "Vehicle Dynamics and Control" 2nd ed. 2012, PythonRobotics
(cross-validation)

- **Bicycle model**: `vx = speed` (rear-axle reference), `omega = speed * tan(delta) / L`
  where `delta` = steering angle and `L` = wheelBase.
- **Sign convention**: Positive steering angle = left turn, positive omega = CCW.
- **Odometry**: Exact arc integration when `|omega| >= 1e-10`; Euler for straight-line.
- **Steering clamp**: Steering angle is clamped to `[-maxSteeringAngle, maxSteeringAngle]`.
- **Full Ackermann wheel angles**: Inner wheel turns more sharply than outer wheel.
  `inner = atan(L / (R - W/2))`, `outer = atan(L / (R + W/2))` where `R = L / tan(|delta|)`.

## Types

### AckermannGeometry

| Field | Type | Description |
|-------|------|-------------|
| `wheelBase` | number | Distance between front and rear axles (meters) |
| `trackWidth` | number | Distance between left and right steering pivots (meters) |
| `maxSteeringAngle` | number | Maximum steering angle (radians) |

### AckermannCommand

| Field | Type | Description |
|-------|------|-------------|
| `speed` | number | Vehicle speed (m/s) |
| `steeringAngle` | number | Steering angle (radians, positive = left) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ackermannForwardKinematics` | `(geometry, command) -> Twist2D` | Steering command to body twist: `vx = speed`, `omega = speed * tan(delta) / L` |
| `ackermannInverseKinematics` | `(geometry, twist) -> AckermannCommand` | Body twist to steering command: `delta = atan(omega * L / vx)`, clamped to max. Returns zero command for near-zero speed. |
| `ackermannTurningRadius` | `(geometry, steeringAngle) -> number` | `R = L / tan(delta)`. Returns Infinity for zero steering. |
| `ackermannWheelAngles` | `(geometry, steeringAngle) -> {inner, outer}` | Full Ackermann front wheel angles. Inner > outer in magnitude. Signs match steering direction. |
| `ackermannOdometry` | `(pose, command, geometry, dt) -> Pose2D` | Integrate bicycle model over dt (exact arc or Euler) |
| `ackermannClampSteering` | `(geometry, steeringAngle) -> number` | Clamp to `[-maxSteeringAngle, maxSteeringAngle]` |

## Test Vectors

### Forward kinematics

@provenance Rajamani 2012, verified manually

Geometry: wheelBase=2.5, trackWidth=1.5, maxSteeringAngle=pi/4

| Command (speed, steeringAngle) | Expected twist (vx, vy, omega) |
|-------------------------------|-------------------------------|
| `(1, 0)` — straight | `(1, 0, 0)` |
| `(1, 0.1)` — left turn | `omega > 0` |
| `(1, -0.1)` — right turn | `omega < 0` |
| `(3.0, 0.2)` | `omega = 3.0 * tan(0.2) / 2.5 = 0.24486...` |
| `(0, 0.3)` — zero speed | `omega = 0` |
| `(-1, 0.2)` — reverse with left steering | `omega < 0` |

### Inverse kinematics

@provenance Rajamani 2012, verified manually

| Command (speed, delta) | FK -> IK round-trip |
|------------------------|---------------------|
| `(1, 0)` | exact recovery |
| `(2, 0.1)` | exact recovery |
| `(0.5, -0.2)` | exact recovery |

### Inverse kinematics edge cases

| Twist | Expected command |
|-------|-----------------|
| `(0, 0, 0)` — zero speed | `(speed=0, steeringAngle=0)` |
| `(1, 0, 100)` — extreme omega | steering clamped to maxSteeringAngle |

### Turning radius

@provenance Rajamani 2012, mathematical definition

| Steering angle | Expected radius |
|----------------|----------------|
| `0` | `Infinity` |
| `0.2` | `2.5 / tan(0.2) = 12.2358...` |
| `0.3` | `R < R(0.1)` — larger angle gives smaller radius |
| `-0.2` | `R < 0` — negative |

### Wheel angles (full Ackermann)

@provenance Rajamani 2012 Ch. 2

| Steering angle | Expected |
|----------------|----------|
| `0` | `inner=0, outer=0` |
| `0.2` (left) | `|inner| > |outer|`, both positive |
| `-0.2` (right) | `|inner| > |outer|`, both negative |
| `0.15` | `avg(inner, outer) ~ 0.15` (rough approximation) |

### Odometry

@provenance PythonRobotics, mathematical definition

| Pose | Command (speed, delta) | dt | Expected new pose |
|------|-----------------------|-----|-------------------|
| `(0, 0, 0)` | `(1, 0)` | 1.0 | `(1, 0, 0)` |
| `(0, 0, pi/2)` | `(1, 0)` | 1.0 | `(~0, ~1, pi/2)` |
| `(0, 0, 0)` | `(1, 0.3)` | 1.0 | `theta > 0` — left turn |
| `(0, 0, 0)` | `(-1, 0)` | 1.0 | `(-1, 0, 0)` — reverse |

### Full circle returns near start

@provenance mathematical definition (circular arc integration)

| Test | Expected |
|------|----------|
| `delta=0.2, speed=1.0`, dt=0.01, steps=circumference/speed/dt | `(x, y) ~ (0, 0)`, `theta ~ 0` (tol 1e-0) |

### Steering clamp

@provenance mathematical definition

| Input | maxSteeringAngle=pi/4 | Expected |
|-------|----------------------|----------|
| `0.1` | `0.1` — within limits |
| `-0.1` | `-0.1` — within limits |
| `2.0` | `pi/4` — clamped positive |
| `-2.0` | `-pi/4` — clamped negative |
| `0` | `0` — pass-through |
