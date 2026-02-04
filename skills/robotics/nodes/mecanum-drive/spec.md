# mecanum-drive — Spec

Depends on: `drivetrain-types`

## Purpose

Forward/inverse kinematics, odometry, and speed normalization for a 4-wheel mecanum
(omnidirectional) drive. Mecanum wheels have rollers at 45 degrees to the wheel axis,
enabling holonomic motion (independent control of vx, vy, omega).

## Conventions

@provenance Siegwart & Nourbakhsh "Introduction to Autonomous Mobile Robots" 2nd ed. 2011

- **Wheel numbering**: Front-Left (FL), Front-Right (FR), Rear-Left (RL), Rear-Right (RR).
- **Roller orientation**: X-pattern (most common in FRC, REV, educational robots).
  FL and RR rollers at +45 degrees, FR and RL at -45 degrees.
- **Body frame**: Positive `vx` = forward, positive `vy` = left, positive `omega` = CCW.
- **Odometry**: Exact integration for `|omega| >= 1e-10`; Euler for near-zero omega.
- **Speed normalization**: Scales all four wheel speeds proportionally so the maximum
  absolute speed does not exceed `maxSpeed`. Returns unchanged if already within limits.

## Types

### MecanumWheelSpeeds

| Field | Type | Description |
|-------|------|-------------|
| `frontLeft` | number | FL wheel angular velocity (rad/s) |
| `frontRight` | number | FR wheel angular velocity (rad/s) |
| `rearLeft` | number | RL wheel angular velocity (rad/s) |
| `rearRight` | number | RR wheel angular velocity (rad/s) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `mecanumInverseKinematics` | `(geometry, twist) -> MecanumWheelSpeeds` | Body twist to wheel speeds. FL=(vx-vy-k*omega)/r, FR=(vx+vy+k*omega)/r, RL=(vx+vy-k*omega)/r, RR=(vx-vy+k*omega)/r where k=(wheelBase+trackWidth)/2 |
| `mecanumForwardKinematics` | `(geometry, wheelSpeeds) -> Twist2D` | Wheel speeds to body twist: vx=(r/4)*(FL+FR+RL+RR), vy=(r/4)*(-FL+FR+RL-RR), omega=(r/4)*(-FL+FR-RL+RR)/k |
| `mecanumOdometry` | `(pose, twist, dt) -> Pose2D` | Integrate twist over dt (exact arc or Euler for holonomic body) |
| `mecanumNormalizeSpeeds` | `(speeds, maxSpeed) -> MecanumWheelSpeeds` | Scale speeds proportionally if any exceeds maxSpeed |

## Test Vectors

### Inverse kinematics

@provenance Siegwart & Nourbakhsh 2011, verified manually

Geometry: wheelBase=0.5, trackWidth=0.4, wheelRadius=0.05

| Twist (vx, vy, omega) | Expected pattern |
|------------------------|-----------------|
| `(1, 0, 0)` — pure forward | All wheels equal: `1/0.05 = 20` |
| `(0, 1, 0)` — pure strafe left | FL=-20, FR=20, RL=20, RR=-20 |
| `(0, 0, 1)` — pure rotation | FL=-k/r, FR=k/r, RL=-k/r, RR=k/r where k=(0.5+0.4)/2=0.45, so FL=-9, FR=9, RL=-9, RR=9 |
| `(0, 0, 0)` — zero twist | All wheels 0 |

### Forward kinematics round-trip

@provenance mathematical definition (FK and IK are matrix inverses)

| Twist (vx, vy, omega) | Round-trip FK(IK(twist)) |
|------------------------|-------------------------|
| `(1, 0, 0)` | exact recovery |
| `(0, 1, 0)` | exact recovery |
| `(0, 0, 1)` | exact recovery |
| `(1, 0.5, 0.3)` | exact recovery |
| `(-0.5, 0.2, -0.1)` | exact recovery |

### Forward kinematics specific cases

| Wheel speeds (FL, FR, RL, RR) | Expected twist |
|-------------------------------|---------------|
| `(10, 10, 10, 10)` — all equal | `(vx=0.5, vy=0, omega=0)` — pure forward (vx = 10*0.05 = 0.5) |
| `(-10, 10, 10, -10)` — opposite diagonals | `(vx=0, vy>0, omega=0)` — pure strafe |

### Odometry

@provenance mathematical definition

| Pose | Twist (vx, vy, omega) | dt | Expected new pose |
|------|-----------------------|-----|-------------------|
| `(0, 0, 0)` | `(1, 0, 0)` | 1.0 | `(1, 0, 0)` |
| `(0, 0, 0)` | `(0, 1, 0)` | 1.0 | `(0, 1, 0)` |
| `(0, 0, pi/2)` | `(1, 0, 0)` | 1.0 | `(~0, ~1, pi/2)` — forward at 90 deg heading |
| `(5, 5, 0)` | `(0, 0, pi/2)` | 1.0 | `(5, 5, pi/2)` — pure rotation |
| `(0, 0, 0)` | `(1, 0, pi/4)` | 1.0 | `(theta=pi/4, x>0, y>0)` — combined |

### Normalize speeds

@provenance mathematical definition

| Input speeds (FL, FR, RL, RR) | maxSpeed | Expected |
|-------------------------------|----------|----------|
| `(5, -3, 4, -2)` | 10 | unchanged |
| `(20, 10, -10, -20)` | 10 | `(10, 5, -5, -10)` — scaled by 0.5 |
| `(-30, 10, 20, -15)` | 10 | signs preserved, max abs = 10 |
| `(0, 0, 0, 0)` | 10 | unchanged (all zero) |
