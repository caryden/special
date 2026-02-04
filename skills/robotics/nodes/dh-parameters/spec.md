# dh-parameters — Spec

Depends on: mat-ops

## Purpose

Standard Denavit-Hartenberg (1955) parameters and transformation matrices. Uses
standard (NOT modified/Craig) convention: T = Rz(theta) * Tz(d) * Tx(a) * Rx(alpha).

@provenance Denavit & Hartenberg 1955, Corke "Robotics, Vision and Control" 3rd ed. 2023

## Conventions

- Standard DH convention (1955), NOT modified DH (Craig)
- T = Rz(theta) * Tz(d) * Tx(a) * Rx(alpha)
- Revolute joints: theta is the variable parameter
- Prismatic joints: d is the variable parameter

## Types

### DHParams

| Field | Type | Description |
|-------|------|-------------|
| `theta` | number | Joint angle (radians) |
| `d` | number | Link offset along z (meters) |
| `a` | number | Link length along x (meters) |
| `alpha` | number | Link twist about x (radians) |

### JointType

`'revolute' | 'prismatic'`

### DHJoint

| Field | Type | Description |
|-------|------|-------------|
| `params` | DHParams | DH parameters for this joint |
| `jointType` | JointType | Type of joint |

### DHChain

| Field | Type | Description |
|-------|------|-------------|
| `joints` | DHJoint[] | Ordered array of joints |
| `numJoints` | number | Number of joints in chain |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `dhTransform` | `(params: DHParams) -> Matrix` | 4x4 homogeneous transform from DH params |
| `dhChainTransform` | `(joints: DHJoint[], jointValues: number[]) -> Matrix` | End-effector transform for chain |
| `dhCreateJoint` | `(params: DHParams, jointType?: JointType) -> DHJoint` | Factory, defaults to `'revolute'` |
| `dhCreateChain` | `(joints: DHJoint[]) -> DHChain` | Create chain from joints array |
| `twoLinkPlanar` | `(l1: number, l2: number) -> DHJoint[]` | Standard 2-link planar arm |
| `scara` | `(l1: number, l2: number) -> DHJoint[]` | Standard SCARA robot |

## Test Vectors

### dhTransform

@provenance Denavit & Hartenberg 1955 (standard convention matrix)

| Input | Expected |
|-------|----------|
| `{theta:0, d:0, a:0, alpha:0}` | `I_4` (4x4 identity) |
| `{theta:pi/2, d:0, a:0, alpha:0}` | `Rz(pi/2)` — rotation about z by 90 deg |
| `{theta:0, d:1, a:0, alpha:0}` | `Tz(1)` — translation along z by 1 |
| `{theta:0, d:0, a:1, alpha:0}` | `Tx(1)` — translation along x by 1 |
| `{theta:0, d:0, a:0, alpha:pi/2}` | `Rx(pi/2)` — rotation about x by 90 deg |
| `{theta:pi/4, d:0.5, a:1.0, alpha:pi/6}` | element-wise verified against analytic expansion |
| `{theta:pi, d:0, a:0, alpha:0}` | `cos(theta)=-1` rotation: `[[-1,0,0,0],[0,-1,0,0],[0,0,1,0],[0,0,0,1]]` |

### Two-link planar cross-validation

@provenance analytic: x = l1*cos(q1) + l2*cos(q1+q2), y = l1*sin(q1) + l2*sin(q1+q2)

| Joint values `[q1, q2]` | Expected end-effector position |
|--------------------------|-------------------------------|
| `[0, 0]` | `(l1+l2, 0, 0)` |
| `[pi/2, 0]` | `(0, l1+l2, 0)` |
| `[pi/4, -pi/4]` | `(l1*cos(pi/4) + l2*cos(0), l1*sin(pi/4) + l2*sin(0), 0)` |
| `[pi, 0]` | `(-(l1+l2), 0, 0)` |

### Chain mechanics

@provenance verified by manual matrix multiplication

| Test | Expected |
|------|----------|
| Single revolute joint chain, `q=[theta]` | equals `dhTransform({theta, d:0, a:link_len, alpha:0})` |
| Two-joint chain | product of individual transforms: `T1 * T2` |
| Single prismatic joint, `q=[2.5]` | z-translation of 2.5 in resulting transform |

### Factory functions

@provenance structural tests

| Test | Expected |
|------|----------|
| `dhCreateJoint(params)` | `jointType === 'revolute'` (default) |
| `dhCreateJoint(params, 'prismatic')` | `jointType === 'prismatic'` |
| `dhCreateChain(joints)` | `joints` stored, `numJoints === joints.length` |
| `twoLinkPlanar(1.0, 0.5)` | 2 joints, both revolute, `a=[1.0, 0.5]`, `alpha=[0, 0]` |
| `scara(1.0, 0.5)` | 4 joints: `[R, R, P, R]`, joint 2 `alpha=pi` |

### SCARA cross-validation

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023

| Joint values `[q1, q2, q3, q4]` | Expected end-effector |
|----------------------------------|----------------------|
| `[0, 0, 0, 0]` | position `(l1+l2, 0, 0)` |
| `[0, 0, 0.3, 0]` | z = -0.3 (alpha=pi on joint 2 flips Z axis) |

### Error conditions

- `dhChainTransform` with `jointValues.length !== joints.length`: throws dimension mismatch
