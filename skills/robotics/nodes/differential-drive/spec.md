# differential-drive — Spec

Depends on: `drivetrain-types`

## Purpose

Forward/inverse kinematics and odometry for a two-wheeled differential drive robot.
Converts between wheel speeds (rad/s) and body-frame twist, integrates pose over time
using exact arc integration (with Euler fallback for near-zero angular velocity), and
provides turning radius and arc length utilities.

## Conventions

@provenance Siegwart & Nourbakhsh "Introduction to Autonomous Mobile Robots" 2nd ed.
2011, PythonRobotics (cross-validation)

- **Body frame**: Positive `vx` = forward, positive `omega` = counter-clockwise (CCW).
- **Wheel speeds**: Angular velocity in rad/s. `left` and `right` refer to the left and
  right wheels respectively.
- **Odometry**: Exact arc integration when `|omega| >= 1e-10`; Euler (straight-line)
  integration otherwise.
- **Turning radius**: `R = (trackWidth/2) * (right + left) / (right - left)`. Returns
  `Infinity` for straight-line motion (`|right - left| < 1e-10`).

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `diffDriveForwardKinematics` | `(geometry, wheelSpeeds) -> Twist2D` | Wheel speeds to body twist: `v = (r/2)(left+right)`, `omega = (r/trackWidth)(right-left)` |
| `diffDriveInverseKinematics` | `(geometry, twist) -> DifferentialWheelSpeeds` | Body twist to wheel speeds: `left = (vx - omega*trackWidth/2) / r`, `right = (vx + omega*trackWidth/2) / r` |
| `diffDriveOdometry` | `(pose, twist, dt) -> Pose2D` | Integrate twist over dt to update pose (exact arc or Euler) |
| `diffDriveOdometryFromWheels` | `(pose, geometry, wheelSpeeds, dt) -> Pose2D` | Convenience: FK then odometry in one call |
| `diffDriveArcLength` | `(geometry, wheelSpeeds, dt) -> number` | Arc length traveled: `|v| * dt` |
| `diffDriveRadius` | `(geometry, wheelSpeeds) -> number` | Instantaneous turning radius (Infinity for straight) |

## Test Vectors

### Forward kinematics

@provenance Siegwart & Nourbakhsh 2011 Ch. 3, verified manually

Geometry: trackWidth=0.5m, wheelRadius=0.1m

| Wheel speeds (left, right) | Expected twist (vx, vy, omega) |
|-----------------------------|-------------------------------|
| `(10, 10)` | `(1.0, 0, 0)` |
| `(5, 0)` | `(0.25, 0, -1.0)` |
| `(0, 5)` | `(0.25, 0, 1.0)` |
| `(-5, 5)` | `(0, 0, 2.0)` |
| `(0, 0)` | `(0, 0, 0)` |

### Inverse kinematics

@provenance Siegwart & Nourbakhsh 2011 Ch. 3, verified manually

| Twist (vx, vy, omega) | Expected wheel speeds (left, right) |
|------------------------|-------------------------------------|
| `(1.0, 0, 0)` | `(10, 10)` |
| `(0, 0, 2.0)` | `(-5, 5)` |

### Round-trip FK(IK(twist))

| Original twist (vx, vy, omega) | Recovered |
|-------------------------------|-----------|
| `(0.7, 0, 1.3)` | `(0.7, 0, 1.3)` (exact recovery) |

### Odometry

@provenance PythonRobotics (cross-validation), mathematical definition (exact arc)

| Pose | Twist (vx, vy, omega) | dt | Expected new pose |
|------|-----------------------|-----|-------------------|
| `(0, 0, 0)` | `(1.0, 0, 0)` | 1.0 | `(1.0, 0, 0)` |
| `(0, 0, 0)` | `(0, 0, pi/2)` | 1.0 | `(0, 0, pi/2)` |
| `(0, 0, 0)` | `(1.0, 0, pi/2)` | 1.0 | `(2/pi, 2/pi, pi/2)` — arc with R = 2/pi |
| `(1, 2, 0.5)` | `(5, 0, 3)` | 0 | `(1, 2, 0.5)` — zero dt, no change |
| `(0, 0, pi/4)` | `(1.0, 0, 0)` | 1.0 | `(cos(pi/4), sin(pi/4), pi/4)` |

### Full circle returns near start

| Test | Expected |
|------|----------|
| `v=1.0, omega=2*pi`, 1000 steps over 1s | `(x, y) ~ (0, 0)`, `theta ~ 2*pi` (tol 1e-3) |

### Multiple steps accumulate

| Test | Expected |
|------|----------|
| `v=1.0, omega=0`, 10 steps of dt=0.1 | `(1.0, 0, 0)` (tol 1e-8) |

### Cross-validation (PythonRobotics geometry)

@provenance PythonRobotics, verified manually

Geometry: trackWidth=0.3m, wheelRadius=0.05m

| Wheel speeds (left, right) | Expected twist (vx, omega) |
|-----------------------------|---------------------------|
| `(10, 12)` | `(0.55, 1/3)` |

### Arc length

@provenance mathematical definition

| Wheel speeds (left, right) | dt | Expected arc length |
|-----------------------------|-----|---------------------|
| `(10, 10)` | 2.0 | `2.0` |
| `(0, 0)` | 1.0 | `0` |

### Turning radius

@provenance Siegwart & Nourbakhsh 2011 Ch. 3, verified manually

| Wheel speeds (left, right) | Expected radius |
|-----------------------------|----------------|
| `(10, 10)` | `Infinity` |
| `(5, -5)` | `0` |
| `(8, 12)` | `1.25` |
| `(10, 0)` | `-0.25` |
