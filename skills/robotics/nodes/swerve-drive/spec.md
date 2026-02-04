# swerve-drive — Spec

Depends on: `drivetrain-types`

## Purpose

Forward/inverse kinematics, module optimization, speed normalization, and odometry for
a 4-module swerve (coaxial) drive. Each module independently controls wheel steering
angle and drive speed. Supports holonomic motion.

## Conventions

@provenance Chief Delphi / FRC (standard swerve kinematics), Siegwart & Nourbakhsh
"Introduction to Autonomous Mobile Robots" 2nd ed. 2011

- **Module layout**: Front-Left (FL), Front-Right (FR), Rear-Left (RL), Rear-Right (RR).
- **Module positions** relative to center of rotation:
  FL=(+L/2, +W/2), FR=(+L/2, -W/2), RL=(-L/2, +W/2), RR=(-L/2, -W/2)
  where L=wheelBase, W=trackWidth.
- **Body frame**: Positive `vx` = forward, positive `vy` = left, positive `omega` = CCW.
- **Module angle**: 0 = forward (+x direction), measured in radians.
- **Module optimization**: If reversing the wheel direction results in less than 90
  degrees of steering rotation, the speed sign is flipped and angle adjusted by pi.
- **Odometry**: Exact integration for `|omega| >= 1e-10`; Euler for near-zero omega.

## Types

### SwerveModuleState

| Field | Type | Description |
|-------|------|-------------|
| `speed` | number | Wheel speed (m/s) |
| `angle` | number | Module steering angle (radians, 0 = forward) |

### SwerveState

| Field | Type | Description |
|-------|------|-------------|
| `frontLeft` | SwerveModuleState | FL module |
| `frontRight` | SwerveModuleState | FR module |
| `rearLeft` | SwerveModuleState | RL module |
| `rearRight` | SwerveModuleState | RR module |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `swerveInverseKinematics` | `(geometry, twist) -> SwerveState` | Body twist to module states. Per module at (mx, my): vx_m = vx - omega*my, vy_m = vy + omega*mx, speed = sqrt(vx_m^2+vy_m^2), angle = atan2(vy_m, vx_m) |
| `swerveForwardKinematics` | `(geometry, state) -> Twist2D` | Module states to body twist via least-squares average of four module contributions |
| `swerveOptimizeModule` | `(desired, currentAngle) -> SwerveModuleState` | Minimize steering rotation: flip speed and adjust angle by pi if diff > 90 degrees |
| `swerveNormalizeSpeeds` | `(state, maxSpeed) -> SwerveState` | Scale all module speeds proportionally if any exceeds maxSpeed; preserves angles |
| `swerveOdometry` | `(pose, twist, dt) -> Pose2D` | Integrate holonomic twist over dt (exact arc or Euler) |

## Test Vectors

### Inverse kinematics

@provenance Chief Delphi / FRC, verified manually

Geometry: wheelBase=0.6, trackWidth=0.5

| Twist (vx, vy, omega) | Expected pattern |
|------------------------|-----------------|
| `(1, 0, 0)` — pure forward | All modules: angle=0, speed=1 |
| `(0, 1, 0)` — pure strafe left | All modules: angle=pi/2, speed=1 |
| `(0, 0, 1)` — pure rotation | All module speeds equal magnitude, tangent angles |
| `(0, 0, 0)` — zero twist | All speeds ~ 0 |

### Forward kinematics round-trip

@provenance mathematical definition

| Twist (vx, vy, omega) | Round-trip FK(IK(twist)) |
|------------------------|-------------------------|
| `(1, 0, 0)` | recovery (tol 1e-4) |
| `(0, 1, 0)` | recovery (tol 1e-4) |
| `(0, 0, 1)` | recovery (tol 1e-4) |
| `(1, 0.5, 0.3)` | recovery (tol 1e-4) |
| `(-0.5, 0.2, -0.1)` | recovery (tol 1e-4) |

### Forward kinematics specific cases

| Module states (all modules) | Expected twist |
|-----------------------------|---------------|
| All `{speed: 1, angle: 0}` | `(vx=1, vy=0, omega=0)` |

### Module optimization

@provenance Chief Delphi / FRC conventions

| Desired state | Current angle | Expected |
|---------------|---------------|----------|
| `{speed: 1, angle: 0.1}` | 0 | `{speed: 1, angle: 0.1}` — no change needed |
| `{speed: 1, angle: pi}` | 0 | `{speed: -1, angle ~ 0}` — reversed, angle < pi/2 from current |
| `{speed: 2, angle: pi/4}` | 0 | `{speed: 2, angle: pi/4}` — within 90 deg, preserved |

### Normalize speeds

@provenance mathematical definition

| State (FL, FR, RL, RR speeds) | maxSpeed | Expected |
|-------------------------------|----------|----------|
| `(3, -2, 4, -1)` | 5 | unchanged |
| `(10, 5, -8, 6)` | 5 | max abs = 5, ratio preserved (FL.speed/FR.speed = 10/5) |
| Angles `(1.1, 2.2, 0.5, 3.0)` with speeds `(20, 15, -10, 5)` | 10 | angles preserved exactly |

### Odometry

@provenance mathematical definition

| Pose | Twist (vx, vy, omega) | dt | Expected new pose |
|------|-----------------------|-----|-------------------|
| `(0, 0, 0)` | `(1, 0, 0)` | 1.0 | `(1, 0, 0)` |
| `(0, 0, 0)` | `(0, 1, 0)` | 1.0 | `(0, 1, 0)` |
| `(0, 0, 0)` | `(0, 0, pi/2)` | 1.0 | `(0, 0, pi/2)` |
| `(0, 0, 0)` | `(1, 1, 0)` | 1.0 | `(1, 1, 0)` — diagonal motion |
