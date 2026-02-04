# test-chains — Spec

Depends on: `dh-parameters`

## Purpose

Standard kinematic chain definitions for testing forward kinematics, Jacobians,
and inverse kinematics. Provides well-known robot configurations with analytically
verifiable forward kinematics, used as ground truth for cross-validation.

**Note:** This is a test-only node. It provides test fixtures and is not intended
for translation into target languages.

## Conventions

@provenance Corke "Robotics, Vision and Control" 3rd ed. 2023 (DH tables, PUMA 560
RTB model dimensions)

@provenance Craig "Introduction to Robotics" 4th ed. 2018 (PUMA 560 DH convention)

- All chains use standard DH parameters via `dhCreateJoint`.
- Joint types are `'revolute'` or `'prismatic'`.
- Default dimensions come from published sources; all functions accept optional
  overrides for custom configurations.
- FK results are validated against analytic formulas (2-link planar) and
  structural properties (orthogonality, det(R) = +1).

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `testChain2Link` | `(l1?, l2?) -> DHJoint[]` | 2-link planar arm (2-DOF, RR). Default l1=1, l2=1. Both alpha=0, d=0. |
| `testChain3Link` | `(d1?, l2?, l3?) -> DHJoint[]` | 3-link spatial arm (3-DOF, RRR). Joint 1 alpha=pi/2. Default d1=0.5, l2=1, l3=0.5. |
| `testChainPuma560` | `(a2?, a3?, d3?, d4?) -> DHJoint[]` | PUMA 560 (6-DOF, all revolute). Default a2=0.4318, a3=0.0203, d3=0.15005, d4=0.4318. |
| `testChainStanford` | `(d1?, d2?) -> DHJoint[]` | Stanford arm (6-DOF, RRP+RRR spherical wrist). Default d1=0.4120, d2=0.1540. |

## Test Vectors

### 2-link planar arm

@provenance mathematical-definition (planar 2R kinematics: x = l1*cos(q1) + l2*cos(q1+q2))

| Test | Expected |
|------|----------|
| Chain has 2 revolute joints | jointType='revolute' for both |
| Default link lengths | a=1 for both joints |
| Custom link lengths (2.0, 1.5) | a=2.0, a=1.5 |
| All alpha = 0 (planar) | verified |
| All d = 0 (planar) | verified |
| FK at q=[0,0], l1=1, l2=0.5 | position = (1.5, 0, 0) |
| FK at q=[pi/2, 0], l1=1, l2=0.5 | position = (0, 1.5, 0) |
| FK at q=[pi/4, -pi/4], l1=1, l2=1 | x = cos(pi/4) + cos(0) = 1.7071, y = sin(pi/4) + sin(0) = 0.7071 |
| FK at q=[pi, 0], l1=1, l2=1 | position = (-2, 0, 0) |
| FK at q=[0, pi], l1=2, l2=1 | position = (1, 0, 0) (folds back) |
| Fully extended reach (l1=1.5, l2=0.8) at q=[0,0] | reach = l1+l2 = 2.3 |

### 3-link spatial arm

@provenance Corke 2023 (standard DH with alpha1=pi/2 base rotation)

| Test | Expected |
|------|----------|
| Chain has 3 revolute joints | jointType='revolute' for all |
| Joint 1 alpha = pi/2 | spatial configuration |
| Joints 2, 3 alpha = 0 | planar sub-chain |
| Default dimensions | d1=0.5, a2=1, a3=0.5 |
| Custom dimensions (0.3, 0.8, 0.4) | d=0.3, a=0.8, a=0.4 |
| FK at q=[0,0,0]: d1=0.5, l2=1, l3=0.5 | position = (1.5, 0, 0.5) |
| FK at q=[pi/2, 0, 0] | position = (0, 1.5, 0.5) |
| FK at q=[0, pi/2, 0] | position = (0, 0, 2.0) (d1 + l2 + l3 = 0.5 + 1 + 0.5) |

### PUMA 560

@provenance Corke RTB puma560 model (standard DH parameters, meters)

| Test | Expected |
|------|----------|
| Chain has 6 revolute joints | jointType='revolute' for all |
| Default DH: joint 1 d=0, a=0, alpha=pi/2 | verified |
| Default DH: joint 2 a=0.4318, alpha=0 | verified |
| Default DH: joint 3 d=0.15005, a=0.0203, alpha=pi/2 | verified |
| Default DH: joint 4 d=0.4318, alpha=-pi/2 | verified |
| Default DH: joint 5 alpha=pi/2 | verified |
| Default DH: joint 6 alpha=0 | verified |
| Custom dimensions (0.5, 0.03, 0.2, 0.5) | a2=0.5, a3=0.03, d3=0.2, d4=0.5 |
| FK at q=[0,0,0,0,0,0] bottom row | [0, 0, 0, 1] |
| FK at home: reach > 0 and < sum of all link lengths | bounded position |
| FK rotation orthogonal at home | R*R^T = I (tol 1e-8) |
| FK det(R) = +1 at q=[0,0,0,0,0,0] | proper rotation |
| FK det(R) = +1 at q=[pi/4,-pi/6,pi/3,0,pi/4,0] | proper rotation |
| FK det(R) = +1 at q=[pi/2,pi/2,0,-pi/4,pi/6,pi] | proper rotation |

### Stanford arm

@provenance Craig 2018 (Stanford arm RRP configuration)

| Test | Expected |
|------|----------|
| Chain has 6 joints: R, R, P, R, R, R | joint types verified |
| Default DH: joint 1 d=0.4120, alpha=-pi/2 | verified |
| Default DH: joint 2 d=0.1540, alpha=pi/2 | verified |
| Default DH: joint 3 alpha=0 (prismatic) | verified |
| Custom dimensions (0.5, 0.2) | d1=0.5, d2=0.2 |
| FK at q=[0,0,0,0,0,0] bottom row | [0, 0, 0, 1] |
| Prismatic joint 3 at q3=1.0 vs q3=0: position displacement | distance = 1.0 |
| FK det(R) = +1 at q=[pi/3,-pi/4,0.5,pi/6,0,0] | proper rotation |
