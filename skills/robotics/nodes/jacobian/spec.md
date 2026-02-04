# jacobian — Spec

Depends on: mat-ops, rotation-ops, transform-ops, dh-parameters, forward-kinematics

## Purpose

Geometric Jacobian for serial manipulators. Maps joint velocities to 6D spatial
velocity (linear + angular) at the end-effector. Each column corresponds to one
joint: revolute joints contribute `z_i × (p_e - p_i)` (linear) and `z_i` (angular);
prismatic joints contribute `z_i` (linear) and `[0,0,0]` (angular).

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023, Siciliano et al. "Robotics: Modelling, Planning and Control" 2009

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `geometricJacobian` | `(joints: DHJoint[], jointValues: number[]) → Matrix` | 6×n geometric Jacobian (rows 0-2: linear, rows 3-5: angular) |
| `linearJacobian` | `(joints: DHJoint[], jointValues: number[]) → Matrix` | 3×n top half of geometric Jacobian (linear velocity) |
| `angularJacobian` | `(joints: DHJoint[], jointValues: number[]) → Matrix` | 3×n bottom half of geometric Jacobian (angular velocity) |

## Test Vectors

### Dimensions

@provenance structural tests

| Robot | Expected Jacobian size |
|-------|------------------------|
| 2-link planar | 6×2 |
| 3-link planar | 6×3 |
| PUMA 560 (6R) | 6×6 |
| Stanford arm (RRP) | 6×3 (3-joint subset) |

### 2-link planar analytic cross-validation

@provenance analytic Jacobian formula: J_lin = d(FK)/dq, J_ang = [0,0,1] per revolute

For `twoLinkPlanar(l1=1.0, l2=0.5)`:

| Joint values `[q1, q2]` | Expected linear Jacobian (3×2) | Expected angular Jacobian (3×2) |
|--------------------------|-------------------------------|--------------------------------|
| `[0, 0]` | `[[0, 0], [l1+l2, l2], [0, 0]]` (dx/dq=[0,0], dy/dq=[1.5,0.5], dz/dq=[0,0]) | `[[0, 0], [0, 0], [1, 1]]` |
| `[pi/2, 0]` | `[[-(l1+l2), -l2], [0, 0], [0, 0]]` (dx/dq1 = -(l1+l2)) | `[[0, 0], [0, 0], [1, 1]]` |
| `[0, pi/2]` | `[[-l2, -l2], [l1, 0], [0, 0]]` | `[[0, 0], [0, 0], [1, 1]]` |
| `[pi, 0]` | `[[0, 0], [-(l1+l2), -l2], [0, 0]]` | `[[0, 0], [0, 0], [1, 1]]` |

### Numerical cross-validation (finite differences)

@provenance finite difference cross-validation, delta=1e-7

Each Jacobian column is verified against `(FK(q + delta*e_i) - FK(q)) / delta` for
both the position (linear Jacobian) and orientation (angular Jacobian) components.

| Robot | Joint values | Tolerance |
|-------|-------------|-----------|
| 2-link planar (l1=1.0, l2=0.5) | `[pi/4, -pi/6]` | 1e-5 |
| 3-link planar (l1=1.0, l2=0.8, l3=0.5) | `[pi/6, pi/3, -pi/4]` | 1e-5 |
| PUMA 560 | `[0.3, -0.5, 0.7, -0.1, 0.4, -0.2]` | 1e-5 |
| Stanford arm (RRP) | `[0.5, -0.3, 0.8]` | 1e-5 |

### Prismatic joint columns

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023

| Test | Expected |
|------|----------|
| Prismatic joint: linear column | `z_i` axis of frame i (pure translation along joint axis) |
| Prismatic joint: angular column | `[0, 0, 0]` (no rotation contribution) |
| Stanford arm joint 3 (prismatic) | angular row for column 3 is all zeros |

### Singularity detection

@provenance Siciliano et al. "Robotics: Modelling, Planning and Control" 2009

| Test | Expected |
|------|----------|
| 2-link fully extended `[0, 0]` | columns 1 and 2 are parallel (rank deficient); det(J*J^T) ≈ 0 for 2×2 linear sub-block |
| 2-link folded `[0, pi]` | columns are anti-parallel; singular configuration |

### Velocity mapping verification

@provenance verified by FK finite difference: J*dq ≈ dp/dt

| Test | Expected |
|------|----------|
| 2-link at `q=[pi/4, -pi/6]`, `dq=[0.1, -0.05]` | `J * dq` matches `(FK(q+dq*dt) - FK(q)) / dt` for small dt=1e-6, tolerance 1e-4 |
| 3-link at `q=[pi/6, pi/3, -pi/4]`, `dq=[0.05, -0.1, 0.08]` | `J * dq` matches FK finite difference, tolerance 1e-4 |

### linearJacobian and angularJacobian consistency

@provenance structural tests

| Test | Expected |
|------|----------|
| `linearJacobian(joints, q)` | equals rows 0-2 of `geometricJacobian(joints, q)` |
| `angularJacobian(joints, q)` | equals rows 3-5 of `geometricJacobian(joints, q)` |
| Stacking `linearJacobian` over `angularJacobian` | equals full `geometricJacobian` |

### Error conditions

| Test | Expected |
|------|----------|
| `jointValues.length !== joints.length` | throws dimension mismatch |
