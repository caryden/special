# drivetrain-types — Spec

Depends on: _(none — leaf node)_

## Purpose

Drivetrain configuration and velocity types for wheeled mobile robots.
Plain interfaces — no classes.

@provenance Siegwart & Nourbakhsh, "Introduction to Autonomous Mobile Robots" — standard drivetrain kinematic conventions (differential, mecanum, swerve, Ackermann)
@provenance FIRST Robotics Competition (FRC) WPILib conventions — field names, sign conventions, unit choices

## Types

### Twist2D

| Field | Type | Description |
|-------|------|-------------|
| `vx` | number | Forward velocity (m/s) |
| `vy` | number | Lateral velocity (m/s) — zero for differential drive |
| `omega` | number | Angular velocity (rad/s) — positive is counter-clockwise |

### DifferentialDriveGeometry

| Field | Type | Description |
|-------|------|-------------|
| `trackWidth` | number | Distance between wheel centers (meters) |
| `wheelRadius` | number | Wheel radius (meters) |

### DifferentialWheelSpeeds

| Field | Type | Description |
|-------|------|-------------|
| `left` | number | Left wheel angular velocity (rad/s) |
| `right` | number | Right wheel angular velocity (rad/s) |

### MecanumDriveGeometry

| Field | Type | Description |
|-------|------|-------------|
| `wheelBase` | number | Distance between front and rear axles (meters) |
| `trackWidth` | number | Distance between left and right wheels (meters) |
| `wheelRadius` | number | Wheel radius (meters) |

### MecanumWheelSpeeds

| Field | Type | Description |
|-------|------|-------------|
| `frontLeft` | number | Front-left wheel speed |
| `frontRight` | number | Front-right wheel speed |
| `rearLeft` | number | Rear-left wheel speed |
| `rearRight` | number | Rear-right wheel speed |

### SwerveModuleState

| Field | Type | Description |
|-------|------|-------------|
| `speed` | number | Wheel speed (m/s) |
| `angle` | number | Module angle (radians, 0 = forward) |

### SwerveDriveGeometry

| Field | Type | Description |
|-------|------|-------------|
| `wheelBase` | number | Front-to-rear axle distance (meters) |
| `trackWidth` | number | Left-to-right wheel distance (meters) |

### AckermannGeometry

| Field | Type | Description |
|-------|------|-------------|
| `wheelBase` | number | Front-to-rear axle distance (meters) |
| `trackWidth` | number | Steering pivot distance (meters) |
| `maxSteeringAngle` | number | Maximum steering angle (radians) |

### AckermannCommand

| Field | Type | Description |
|-------|------|-------------|
| `speed` | number | Vehicle speed (m/s) |
| `steeringAngle` | number | Steering angle (radians, positive = left) |

### Pose2D

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | X position (meters) |
| `y` | number | Y position (meters) |
| `theta` | number | Heading angle (radians) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `twist2d` | `(vx, vy, omega) → Twist2D` | Constructor |
| `zeroTwist` | `() → Twist2D` | All-zero twist |
| `differentialGeometry` | `(trackWidth, wheelRadius) → DifferentialDriveGeometry` | Constructor |
| `pose2d` | `(x, y, theta) → Pose2D` | Constructor |
| `zeroPose` | `() → Pose2D` | Origin pose |

## Test Vectors

### Factory functions

@provenance Structural — plain constructor round-trip verification

| Input | Expected |
|-------|----------|
| `twist2d(1.5, 0.3, -0.2)` | {vx:1.5, vy:0.3, omega:-0.2} |
| `zeroTwist()` | {vx:0, vy:0, omega:0} |
| `differentialGeometry(0.5, 0.05)` | {trackWidth:0.5, wheelRadius:0.05} |
| `pose2d(1.0, 2.0, π/2)` | {x:1.0, y:2.0, theta:π/2} |
| `zeroPose()` | {x:0, y:0, theta:0} |

### Type structure

@provenance Interface contract — field presence verification

| Type | Keys |
|------|------|
| Twist2D | vx, vy, omega |
| DifferentialDriveGeometry | trackWidth, wheelRadius |
| Pose2D | x, y, theta |
| MecanumDriveGeometry | wheelBase, trackWidth, wheelRadius |
| MecanumWheelSpeeds | frontLeft, frontRight, rearLeft, rearRight |
| SwerveModuleState | speed, angle |
| SwerveDriveGeometry | wheelBase, trackWidth |
| AckermannGeometry | wheelBase, trackWidth, maxSteeringAngle |
| AckermannCommand | speed, steeringAngle |
| DifferentialWheelSpeeds | left, right |
