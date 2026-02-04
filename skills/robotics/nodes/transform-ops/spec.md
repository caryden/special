# transform-ops — Spec

Depends on: `mat-ops`, `rotation-ops`

## Purpose

SE(3) rigid body transformations using 4x4 homogeneous matrices `[R t; 0 1]`.
All operations are pure.

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `transformFromRotationAndTranslation` | `(R, [x,y,z]) → Matrix` | Build 4x4 from 3x3 R and translation |
| `identityTransform` | `() → Matrix` | 4x4 identity |
| `transformGetRotation` | `(T) → Matrix` | Extract 3x3 rotation from 4x4 |
| `transformGetTranslation` | `(T) → [x,y,z]` | Extract translation from 4x4 |
| `transformCompose` | `(T1, T2) → Matrix` | T1 * T2 (4x4 multiply) |
| `transformInverse` | `(T) → Matrix` | T^{-1} = [R^T -R^T*t; 0 1] |
| `transformPoint` | `(T, [x,y,z]) → [x,y,z]` | R*p + t |
| `transformFromEulerXYZ` | `(roll, pitch, yaw, x, y, z) → Matrix` | Convenience: Euler ZYX + translation |
| `transformToEulerXYZ` | `(T) → {roll, pitch, yaw, x, y, z}` | Extract Euler + translation |

## Test Vectors

### Identity and basic transforms

@provenance mathematical-definition

| Test | Input | Expected |
|------|-------|----------|
| Identity preserves point | (3, -2, 7) | (3, -2, 7) |
| Pure translation | translate(1,2,3) applied to (0,0,0) | (1, 2, 3) |
| Pure translation | translate(1,2,3) applied to (4,5,6) | (5, 7, 9) |
| Pure 90° Z rotation | applied to (1,0,0) | (0, 1, 0) |
| Combined 90° Z + translate(10,0,0) | applied to (1,0,0) | (10, 1, 0) |

### Composition

| Test | Expected |
|------|----------|
| T1*T2 applied to p = T1(T2(p)) | sequential application matches |
| (T1*T2)*T3 = T1*(T2*T3) | associativity |
| T * identity = T | identity is neutral element |

### Inverse

| Test | Expected |
|------|----------|
| T * T^{-1} = I | verified |
| T^{-1} * T = I | verified |
| Identity inverse = identity | verified |
| Pure translation inverse negates translation | translate(5,-3,8)^{-1} → translate(-5,3,-8) |
| Pure rotation inverse = rotation transpose | verified |

### Round-trip

| Test | Expected |
|------|----------|
| euler+translation → T → euler+translation | exact recovery (roll=0.3, pitch=-0.4, yaw=1.1) |
| Gimbal lock (pitch=π/2) | pitch correct, translation preserved |
| Chain of transforms then inverse chain recovers point | verified |

### Structure

| Test | Expected |
|------|----------|
| Bottom row is [0 0 0 1] | always |
| Inverse bottom row is [0 0 0 1] | always |
| All-zero euler+translation gives identity | verified |

### Cross-validation

@provenance mathematical-definition

| Test | Expected |
|------|----------|
| 90° Z rotation + translate(5,10,15) applied to (1,0,0) | (5, 11, 15) |
| 90° Z rotation + translate(5,10,15) applied to (0,1,0) | (4, 10, 15) |
| 180° X rotation applied to (0,1,1) | (0, -1, -1) |
| Pure rotation preserves distances between points | verified |
