/**
 * Inverse kinematics dispatcher.
 *
 * Provides a unified interface for solving position-only IK using one of
 * three methods: jacobian (damped least squares), ccd, or fabrik.
 *
 * @node solve-ik
 * @depends-on result-types, any-of(jacobian-ik, ccd, fabrik)
 * @contract solve-ik.test.ts
 * @hint dispatcher: Thin routing layer — all real logic lives in downstream nodes.
 * @hint default: Uses 'jacobian' if no method specified.
 */

import type { DHJoint } from './dh-parameters.ts';
import type { IKResult } from './result-types.ts';
import { jacobianIK, type JacobianIKConfig, DEFAULT_JACOBIAN_IK_CONFIG } from './jacobian-ik.ts';
import { ccdSolve, type CCDConfig, DEFAULT_CCD_CONFIG } from './ccd.ts';
import { fabrikSolveAngles, type FabrikConfig, DEFAULT_FABRIK_CONFIG } from './fabrik.ts';

/** Available IK solver methods */
export type IKMethod = 'jacobian' | 'ccd' | 'fabrik';

/** Unified IK solver options */
export interface SolveIKOptions {
  /** IK method to use (default: 'jacobian') */
  method?: IKMethod;
  /** Maximum iterations (passed to underlying solver) */
  maxIterations?: number;
  /** Position error tolerance in meters (passed to underlying solver) */
  tolerance?: number;
  /** Damping factor (jacobian method only) */
  damping?: number;
  /** Step size scaling (jacobian method only) */
  stepSize?: number;
}

/**
 * Solve position-only IK using the specified method.
 *
 * All methods accept DH joints, a target [x, y, z], and initial joint angles.
 * FABRIK internally converts from DH to link lengths and back.
 *
 * @param joints  DH chain definition
 * @param target  Target end-effector position [x, y, z]
 * @param initialAngles  Starting joint angles (radians)
 * @param options  Solver options including method selection
 * @returns IKResult with joint angles, convergence flag, error, and iterations
 */
export function solveIK(
  joints: DHJoint[],
  target: [number, number, number],
  initialAngles: number[],
  options: SolveIKOptions = {},
): IKResult {
  const method = options.method ?? 'jacobian';

  if (method === 'jacobian') {
    const config: JacobianIKConfig = {
      ...DEFAULT_JACOBIAN_IK_CONFIG,
      ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
      ...(options.tolerance !== undefined && { tolerance: options.tolerance }),
      ...(options.damping !== undefined && { damping: options.damping }),
      ...(options.stepSize !== undefined && { stepSize: options.stepSize }),
    };
    return jacobianIK(joints, target, initialAngles, config);
  }

  if (method === 'ccd') {
    const config: CCDConfig = {
      ...DEFAULT_CCD_CONFIG,
      ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
      ...(options.tolerance !== undefined && { tolerance: options.tolerance }),
    };
    return ccdSolve(joints, target, initialAngles, config);
  }

  // FABRIK works with link lengths, not DH. Extract lengths from DH a/d parameters.
  const linkLengths = joints.map((j) => {
    const a = j.params.a;
    const d = j.params.d;
    return Math.sqrt(a * a + d * d);
  });
  const config: FabrikConfig = {
    ...DEFAULT_FABRIK_CONFIG,
    ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
    ...(options.tolerance !== undefined && { tolerance: options.tolerance }),
  };
  return fabrikSolveAngles(linkLengths, { x: target[0], y: target[1], z: target[2] }, config);
}
