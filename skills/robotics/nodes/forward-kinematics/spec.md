# forward-kinematics — Spec

Depends on: `mat-ops`, `rotation-ops`, `transform-ops`, `dh-parameters`

## Purpose

Forward kinematics for serial manipulators. Computes end-effector pose and all
intermediate frame transforms from a DH joint chain and joint values.

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023, OROCOS KDL v1.5.3

## Types

### FKResult

| Field | Type | Description |
|-------|------|-------------|
| `endEffector` | Matrix (4x4) | Homogeneous transform of end-effector frame |
| `frames` | Matrix[] | n+1 transforms; `frames[0]` = identity (base), `frames[n]` = endEffector |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `forwardKinematics` | `(joints: DHJoint[], jointValues: number[]) -> FKResult` | FK with all intermediate frames |
| `fkPosition` | `(joints: DHJoint[], jointValues: number[]) -> [x, y, z]` | End-effector position only |
| `fkRotation` | `(joints: DHJoint[], jointValues: number[]) -> Matrix` | End-effector 3x3 rotation only |

## Test Vectors

### Basic properties

@provenance mathematical-definition

| Test | Expected |
|------|----------|
| `endEffector` matches `dhChainTransform` for 2-link planar | exact match |
| `endEffector` matches `dhChainTransform` for PUMA 560 | exact match |
| n-joint chain returns n+1 frames (PUMA 560: 7 frames) | `frames.length === 7` |
| `frames[0]` is identity | `I_4` |
| `frames[n]` equals `endEffector` | exact match |
| Joint count mismatch | throws dimension mismatch |

### Intermediate frames

@provenance verified by manual matrix multiplication

| Test | Expected |
|------|----------|
| `frames[k]` = product of DH transforms 1..k | sequential products verified |
| All frames have bottom row `[0 0 0 1]` | always |
| All frame rotations are proper (det = +1) | always |

### 2-link planar cross-validation

@provenance analytic: x = l1*cos(q1) + l2*cos(q1+q2), y = l1*sin(q1) + l2*sin(q1+q2)

| Joint values `[q1, q2]` | Expected position |
|--------------------------|-------------------|
| `[0, 0]` | `(l1+l2, 0, 0)` |
| `[pi/2, 0]` | `(0, l1+l2, 0)` |
| `[pi/4, -pi/4]` | `(l1*cos(pi/4) + l2*cos(0), l1*sin(pi/4) + l2*sin(0), 0)` |
| `[0, pi]` | `(l1-l2, 0, 0)` |

### 3-link spatial

@provenance analytic verification with d1 offset and two link lengths

| Joint values `[q1, q2, q3]` | Expected position |
|------------------------------|-------------------|
| `[0, 0, 0]` | `(l2+l3, 0, d1)` |
| `[pi/2, 0, 0]` | `(0, l2+l3, d1)` |

### SCARA cross-validation

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023

| Test | Expected |
|------|----------|
| `[0, 0, 0, 0]` at home position | valid 4x4 transform |
| All frames orthogonal rotation matrices | `det(R) = +1` for each frame |

### PUMA 560 cross-validation

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023

| Test | Expected |
|------|----------|
| All zeros configuration | valid 4x4 transform |
| Returns 7 frames for 6 joints | `frames.length === 7` |
| All frames are valid transforms | bottom row `[0 0 0 1]`, `det(R) = +1` |

### Stanford arm (prismatic joint)

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023

| Test | Expected |
|------|----------|
| Prismatic extension changes position | extending d3 by 1.0m shifts end-effector by 1.0m along joint axis |
| Valid transforms throughout | bottom row `[0 0 0 1]`, `det(R) = +1` |

### fkPosition

@provenance derived from forwardKinematics

| Test | Expected |
|------|----------|
| 2-link planar `[0, 0]` | `[l1+l2, 0, 0]` |
| Returns `[x, y, z]` tuple | 3-element array |

### fkRotation

@provenance derived from forwardKinematics

| Test | Expected |
|------|----------|
| 2-link planar `[0, 0]` | identity 3x3 rotation |
| Returns 3x3 matrix | `3 x 3` dimensions |
