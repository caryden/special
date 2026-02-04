/**
 * Standard kinematic chain definitions for testing FK, Jacobian, and IK.
 *
 * Provides well-known robot configurations with analytically verifiable
 * forward kinematics, used as ground truth for cross-validation.
 *
 * @node test-chains
 * @depends-on dh-parameters
 * @contract test-chains.test.ts
 * @hint test-only: This node is for testing only, not for translation.
 * @provenance Corke "Robotics, Vision and Control" 3rd ed. 2023 (DH tables)
 * @provenance Craig "Introduction to Robotics" 4th ed. 2018 (PUMA 560 DH)
 */

import { type DHJoint, dhCreateJoint } from './dh-parameters.ts';

/**
 * 2-link planar arm (2-DOF, revolute-revolute).
 *
 * Both joints rotate about Z in the XY plane.
 * End-effector position: x = l1*cos(q1) + l2*cos(q1+q2), y = l1*sin(q1) + l2*sin(q1+q2)
 *
 * Default link lengths: l1=1, l2=1
 */
export function testChain2Link(l1: number = 1, l2: number = 1): DHJoint[] {
  return [
    dhCreateJoint({ theta: 0, d: 0, a: l1, alpha: 0 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0, a: l2, alpha: 0 }, 'revolute'),
  ];
}

/**
 * 3-link spatial arm (3-DOF, revolute-revolute-revolute).
 *
 * Joint 1: rotates about Z (base rotation, alpha=π/2 to tilt next axis)
 * Joint 2: rotates about Z in the new frame (shoulder, planar link)
 * Joint 3: rotates about Z in the new frame (elbow, planar link)
 *
 * Default link lengths: l1=0 (pure rotation), l2=1 (upper arm), l3=0.5 (forearm)
 * Default d1=0.5 (base height offset)
 */
export function testChain3Link(
  d1: number = 0.5,
  l2: number = 1,
  l3: number = 0.5,
): DHJoint[] {
  return [
    dhCreateJoint({ theta: 0, d: d1, a: 0, alpha: Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0, a: l2, alpha: 0 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0, a: l3, alpha: 0 }, 'revolute'),
  ];
}

/**
 * PUMA 560 robot arm (6-DOF, standard DH parameters).
 *
 * Classic 6-DOF industrial manipulator. DH parameters follow Craig's convention
 * adapted to standard DH.
 *
 * Standard DH parameters (Corke RTB):
 *   Joint 1: theta=q1, d=0,     a=0,     alpha=π/2
 *   Joint 2: theta=q2, d=0,     a=a2,    alpha=0
 *   Joint 3: theta=q3, d=d3,    a=a3,    alpha=π/2   (a3 is short, often ~0.02m)
 *   Joint 4: theta=q4, d=d4,    a=0,     alpha=-π/2
 *   Joint 5: theta=q5, d=0,     a=0,     alpha=π/2
 *   Joint 6: theta=q6, d=0,     a=0,     alpha=0
 *
 * Default dimensions from Corke RTB puma560 model (meters):
 *   a2=0.4318, a3=0.0203, d3=0.15005, d4=0.4318
 */
export function testChainPuma560(
  a2: number = 0.4318,
  a3: number = 0.0203,
  d3: number = 0.15005,
  d4: number = 0.4318,
): DHJoint[] {
  return [
    dhCreateJoint({ theta: 0, d: 0,  a: 0,  alpha: Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0,  a: a2, alpha: 0 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: d3, a: a3, alpha: Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: d4, a: 0,  alpha: -Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0,  a: 0,  alpha: Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0,  a: 0,  alpha: 0 }, 'revolute'),
  ];
}

/**
 * Stanford arm (6-DOF with prismatic joint 3).
 *
 * Classic RRP spherical wrist configuration.
 *   Joint 1: revolute  (theta=q1, d=d1,  a=0, alpha=-π/2)
 *   Joint 2: revolute  (theta=q2, d=d2,  a=0, alpha=π/2)
 *   Joint 3: prismatic (theta=0,  d=q3,  a=0, alpha=0)
 *   Joint 4: revolute  (theta=q4, d=0,   a=0, alpha=-π/2)
 *   Joint 5: revolute  (theta=q5, d=0,   a=0, alpha=π/2)
 *   Joint 6: revolute  (theta=q6, d=0,   a=0, alpha=0)
 */
export function testChainStanford(
  d1: number = 0.4120,
  d2: number = 0.1540,
): DHJoint[] {
  return [
    dhCreateJoint({ theta: 0, d: d1, a: 0, alpha: -Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: d2, a: 0, alpha: Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0,  a: 0, alpha: 0 }, 'prismatic'),
    dhCreateJoint({ theta: 0, d: 0,  a: 0, alpha: -Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0,  a: 0, alpha: Math.PI / 2 }, 'revolute'),
    dhCreateJoint({ theta: 0, d: 0,  a: 0, alpha: 0 }, 'revolute'),
  ];
}
