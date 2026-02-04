# rotation-ops — Spec

Depends on: `mat-ops`

## Purpose

Rotation representations and conversions for 3D robotics. Supports rotation matrices
(3x3), quaternions (Hamilton w,x,y,z scalar-first), Euler angles (ZYX roll-pitch-yaw),
and axis-angle. All operations are pure.

## Conventions

@provenance Diebel "Representing Attitude" (2006), Shuster "Survey of Attitude
Representations" (1993)

- **Quaternion**: Hamilton convention `(w, x, y, z)`, scalar-first. Matches Drake,
  Corke, MATLAB, Eigen::Quaterniond. ROS 2 uses `(x, y, z, w)` — consumers must
  reorder at boundary.
- **Euler angles**: ZYX (yaw-pitch-roll), radians. `R = Rz(yaw) * Ry(pitch) * Rx(roll)`.
- **Canonical form**: `quaternionFromRotationMatrix` ensures `w >= 0`.

## Types

### Quaternion

| Field | Type | Description |
|-------|------|-------------|
| `w` | number | Scalar part |
| `x` | number | i component |
| `y` | number | j component |
| `z` | number | k component |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `quaternion` | `(w, x, y, z) → Quaternion` | Constructor |
| `identityQuaternion` | `() → Quaternion` | Returns (1, 0, 0, 0) |
| `identityRotation` | `() → Matrix` | 3x3 identity |
| `rotationMatrixFromAxisAngle` | `(axis, angle) → Matrix` | Rodrigues' formula |
| `rotationMatrixFromQuaternion` | `(q) → Matrix` | Quaternion to 3x3 rotation |
| `quaternionFromRotationMatrix` | `(R) → Quaternion` | Shepperd's method, w >= 0 |
| `rotationMatrixFromEulerZYX` | `(roll, pitch, yaw) → Matrix` | ZYX Euler to rotation |
| `eulerZYXFromRotationMatrix` | `(R) → {roll, pitch, yaw}` | Rotation to ZYX Euler |
| `quaternionFromEulerZYX` | `(roll, pitch, yaw) → Quaternion` | Half-angle formula |
| `eulerZYXFromQuaternion` | `(q) → {roll, pitch, yaw}` | Via rotation matrix |
| `quaternionFromAxisAngle` | `(axis, angle) → Quaternion` | Axis-angle to quaternion |
| `rotationCompose` | `(R1, R2) → Matrix` | R1 * R2 |
| `rotationInverse` | `(R) → Matrix` | R^T |
| `rotateVector` | `(R, v) → [x, y, z]` | R * v |
| `quaternionMultiply` | `(q1, q2) → Quaternion` | Hamilton product |
| `quaternionConjugate` | `(q) → Quaternion` | (w, -x, -y, -z) |
| `quaternionNorm` | `(q) → number` | Euclidean norm |
| `quaternionNormalize` | `(q) → Quaternion` | Normalize to unit |

## Test Vectors

### Axis-angle rotations

@provenance mathematical-definition (right-hand rule)

| Rotation | Vector | Expected result |
|----------|--------|----------------|
| 90° about X | [0,1,0] | [0,0,1] |
| 90° about Y | [0,0,1] | [1,0,0] |
| 90° about Z | [1,0,0] | [0,1,0] |
| 180° about [1,1,0]/sqrt(2) | [1,0,0] | [0,1,0] |

### Quaternion ↔ rotation matrix

@provenance mathematical-definition

| Test | Expected |
|------|----------|
| Identity quaternion → I_3 | identity |
| 90° about Z quaternion → R → rotate [1,0,0] | [0,1,0] |
| Round-trip q → R → q for q=(0.5,0.5,0.5,0.5)/norm | identical quaternion (up to sign) |
| All Shepperd branches (near-180° about X, Y, Z) | round-trip R → q → R |
| Canonical form: w >= 0 always | verified |

### Euler ZYX

@provenance Diebel "Representing Attitude" (2006), Eq. 125

| Test | Expected |
|------|----------|
| Pure roll(0.7) matches axis-angle [1,0,0] 0.7 | element-wise equal |
| Pure pitch(0.5) matches axis-angle [0,1,0] 0.5 | element-wise equal |
| Pure yaw(1.2) matches axis-angle [0,0,1] 1.2 | element-wise equal |
| Combined (0.3, 0.5, 0.7) = Rz(0.7)*Ry(0.5)*Rx(0.3) | verified via compose |
| Round-trip euler → R → euler | exact recovery |
| Gimbal lock pitch=π/2 | pitch correctly identified |

### Cross-validation: analytic matrix values

@provenance Diebel "Representing Attitude" (2006), Eq. 125, roll=0.3, pitch=0.5, yaw=0.7

| Element | Expected |
|---------|----------|
| R[0][0] | 0.6712121661589577 |
| R[0][1] | -0.5070818727544463 |
| R[0][2] | 0.5406867876359134 |
| R[1][0] | 0.5653542083811438 |
| R[1][1] | 0.8219543695041275 |
| R[1][2] | 0.06903356805788474 |
| R[2][0] | -0.479425538604203 |
| R[2][1] | 0.2593433800522308 |
| R[2][2] | 0.8383866435942036 |

### Cross-validation: quaternion from Euler

@provenance Diebel "Representing Attitude" (2006), Eq. 290 (ZYX half-angle formula)

| Euler (roll, pitch, yaw) | Quaternion (w, x, y, z) |
|--------------------------|------------------------|
| (0.3, 0.5, 0.7) | (0.9126271389863014, 0.052132410889548, 0.2794438940784743, 0.29377717233096856) |

### Quaternion operations

@provenance mathematical-definition (Hamilton product)

| Test | Expected |
|------|----------|
| Two 90°-about-Z composed | 180°-about-Z |
| q * conjugate(q) = identity | verified |
| normalize(3,4,0,0) | (0.6, 0.8, 0, 0), norm=1 |
| norm of unit quaternion = 1 | verified |

### Rotation properties

| Property | Verified |
|----------|----------|
| Compose is associative: (R1*R2)*R3 = R1*(R2*R3) | Yes |
| R * R^-1 = I | Yes |
| R^T * R = I | Yes |
| Rotation preserves vector norm | Yes |
| 180° about Z negates x,y, preserves z | Yes |
