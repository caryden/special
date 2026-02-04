import { describe, expect, it } from 'bun:test';
import {
  mpcSimulate,
  mpcCost,
  mpcSolve,
  mpcFirstControl,
  DEFAULT_MPC_CONFIG,
  type MPCProblem,
  type MPCConfig,
} from './mpc.ts';

/** Simple 1D integrator: x_{k+1} = x + u */
function integrator1D(): MPCProblem {
  return {
    stateDim: 1,
    controlDim: 1,
    horizon: 5,
    dynamics: (x, u) => [x[0] + u[0]],
    stageCost: (x, u) => x[0] * x[0] + 0.1 * u[0] * u[0],
    terminalCost: (x) => 10 * x[0] * x[0],
  };
}

/** 2D double integrator: state = [pos, vel], control = [accel] */
function doubleIntegrator(): MPCProblem {
  const dt = 0.1;
  return {
    stateDim: 2,
    controlDim: 1,
    horizon: 10,
    dynamics: (x, u) => [x[0] + dt * x[1], x[1] + dt * u[0]],
    stageCost: (x, u) => x[0] * x[0] + x[1] * x[1] + 0.01 * u[0] * u[0],
    terminalCost: (x) => 100 * (x[0] * x[0] + x[1] * x[1]),
  };
}

/** 2D system with 2D control for multi-dimensional control testing */
function system2x2(): MPCProblem {
  return {
    stateDim: 2,
    controlDim: 2,
    horizon: 3,
    dynamics: (x, u) => [x[0] + u[0], x[1] + u[1]],
    stageCost: (x, u) => x[0] * x[0] + x[1] * x[1] + 0.1 * (u[0] * u[0] + u[1] * u[1]),
    terminalCost: (x) => 5 * (x[0] * x[0] + x[1] * x[1]),
  };
}

describe('mpcSimulate', () => {
  it('simulates 1D integrator trajectory', () => {
    const prob = integrator1D();
    const controls = [1, 1, 1, 1, 1]; // 5 steps, each adding 1
    const traj = mpcSimulate(prob, [0], controls);
    expect(traj.length).toBe(6); // horizon + 1
    expect(traj[0]).toEqual([0]);
    expect(traj[1]).toEqual([1]);
    expect(traj[5]).toEqual([5]);
  });

  it('simulates 2D system with 2D controls', () => {
    const prob = system2x2();
    const controls = [1, 2, 3, 4, 5, 6]; // 3 steps × 2 controls
    const traj = mpcSimulate(prob, [0, 0], controls);
    expect(traj.length).toBe(4);
    expect(traj[0]).toEqual([0, 0]);
    expect(traj[1]).toEqual([1, 2]);
    expect(traj[2]).toEqual([4, 6]);
    expect(traj[3]).toEqual([9, 12]);
  });

  it('preserves initial state', () => {
    const prob = integrator1D();
    const initial = [5];
    const controls = [0, 0, 0, 0, 0];
    const traj = mpcSimulate(prob, initial, controls);
    expect(traj[0]).toEqual([5]);
    expect(traj[5]).toEqual([5]);
  });
});

describe('mpcCost', () => {
  it('computes cost for zero controls', () => {
    const prob = integrator1D();
    const cost = mpcCost(prob, [0], [0, 0, 0, 0, 0]);
    expect(cost).toBe(0); // all states and controls are zero
  });

  it('computes nonzero cost for initial offset', () => {
    const prob = integrator1D();
    const cost = mpcCost(prob, [1], [0, 0, 0, 0, 0]);
    // stage: 5 × (1² + 0) = 5, terminal: 10 × 1² = 10 → total 15
    expect(cost).toBe(15);
  });

  it('includes control cost', () => {
    const prob = integrator1D();
    const cost = mpcCost(prob, [0], [1, 0, 0, 0, 0]);
    // stage0: 0 + 0.1*1 = 0.1, stage1: 1 + 0 = 1, ..., stage4: 1 + 0 = 1
    // terminal: 10 * 1 = 10
    expect(cost).toBeGreaterThan(0);
  });
});

describe('mpcSolve', () => {
  it('drives 1D integrator to zero from positive initial state', () => {
    const prob = integrator1D();
    const result = mpcSolve(prob, [3]);
    expect(result.converged).toBe(true);
    expect(result.cost).toBeLessThan(mpcCost(prob, [3], new Array(5).fill(0)));
    // First control should be negative (driving state toward zero)
    const u0 = mpcFirstControl(result, 1);
    expect(u0[0]).toBeLessThan(0);
  });

  it('drives 1D integrator to zero from negative initial state', () => {
    const prob = integrator1D();
    const result = mpcSolve(prob, [-3]);
    expect(result.converged).toBe(true);
    const u0 = mpcFirstControl(result, 1);
    expect(u0[0]).toBeGreaterThan(0);
  });

  it('returns near-zero controls when already at origin', () => {
    const prob = integrator1D();
    const result = mpcSolve(prob, [0]);
    // Finite-difference gradient has O(eps) residual at optimum,
    // so cost should be near-zero but convergence depends on gradTol vs eps
    expect(result.cost).toBeCloseTo(0, 4);
    for (const u of result.controlSequence) {
      expect(Math.abs(u)).toBeLessThan(1e-3);
    }
  });

  it('solves double integrator', () => {
    const prob = doubleIntegrator();
    const result = mpcSolve(prob, [5, 0]);
    expect(result.converged).toBe(true);
    // Should reduce cost vs. doing nothing
    const zeroCost = mpcCost(prob, [5, 0], new Array(10).fill(0));
    expect(result.cost).toBeLessThan(zeroCost);
  });

  it('solves 2D system with 2D control', () => {
    const prob = system2x2();
    const result = mpcSolve(prob, [3, -2]);
    expect(result.converged).toBe(true);
    expect(result.stateTrajectory.length).toBe(4);
    expect(result.controlSequence.length).toBe(6); // 3 steps × 2 controls
  });

  it('returns correct trajectory in result', () => {
    const prob = integrator1D();
    const result = mpcSolve(prob, [2]);
    expect(result.stateTrajectory.length).toBe(6);
    expect(result.stateTrajectory[0]).toEqual([2]);
    // Verify trajectory is consistent with controls
    const recomputed = mpcSimulate(prob, [2], result.controlSequence);
    for (let i = 0; i < recomputed.length; i++) {
      for (let d = 0; d < recomputed[i].length; d++) {
        expect(result.stateTrajectory[i][d]).toBeCloseTo(recomputed[i][d], 10);
      }
    }
  });

  it('uses warm start', () => {
    const prob = integrator1D();
    // Warm start with a reasonable guess
    const warmStart = [-0.5, -0.5, -0.5, -0.5, -0.5];
    const result = mpcSolve(prob, [3], warmStart);
    expect(result.converged).toBe(true);
    expect(result.cost).toBeLessThan(mpcCost(prob, [3], new Array(5).fill(0)));
  });

  it('respects control bounds', () => {
    const prob = integrator1D();
    const config: MPCConfig = {
      maxIterations: 100,
      gradTol: 1e-6,
      controlMin: [-0.5],
      controlMax: [0.5],
    };
    const result = mpcSolve(prob, [5], undefined, config);
    for (const u of result.controlSequence) {
      expect(u).toBeGreaterThanOrEqual(-0.5 - 1e-10);
      expect(u).toBeLessThanOrEqual(0.5 + 1e-10);
    }
  });

  it('respects control lower bounds only', () => {
    const prob = integrator1D();
    const config: MPCConfig = {
      maxIterations: 100,
      gradTol: 1e-6,
      controlMin: [-0.1],
    };
    const result = mpcSolve(prob, [5], undefined, config);
    for (const u of result.controlSequence) {
      expect(u).toBeGreaterThanOrEqual(-0.1 - 1e-10);
    }
  });

  it('respects control upper bounds only', () => {
    const prob = integrator1D();
    const config: MPCConfig = {
      maxIterations: 100,
      gradTol: 1e-6,
      controlMax: [0.1],
    };
    const result = mpcSolve(prob, [-5], undefined, config);
    for (const u of result.controlSequence) {
      expect(u).toBeLessThanOrEqual(0.1 + 1e-10);
    }
  });

  it('uses default config', () => {
    expect(DEFAULT_MPC_CONFIG.maxIterations).toBe(100);
    expect(DEFAULT_MPC_CONFIG.gradTol).toBe(1e-6);
    expect(DEFAULT_MPC_CONFIG.controlMin).toBeUndefined();
    expect(DEFAULT_MPC_CONFIG.controlMax).toBeUndefined();
  });

  it('handles tight gradient tolerance', () => {
    const prob = integrator1D();
    const config: MPCConfig = { maxIterations: 200, gradTol: 1e-10 };
    const result = mpcSolve(prob, [1], undefined, config);
    expect(result.converged).toBe(true);
  });

  it('reports iterations', () => {
    const prob = integrator1D();
    const result = mpcSolve(prob, [3]);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.iterations).toBeLessThanOrEqual(100);
  });

  it('handles max iterations reached', () => {
    const prob = integrator1D();
    const config: MPCConfig = { maxIterations: 1, gradTol: 1e-15 };
    const result = mpcSolve(prob, [10], undefined, config);
    // May not converge with only 1 iteration
    expect(result.iterations).toBe(1);
    expect(result.controlSequence.length).toBe(5);
  });
});

describe('mpcFirstControl', () => {
  it('extracts first control from 1D problem', () => {
    const prob = integrator1D();
    const result = mpcSolve(prob, [2]);
    const u0 = mpcFirstControl(result, 1);
    expect(u0.length).toBe(1);
    expect(u0[0]).toBe(result.controlSequence[0]);
  });

  it('extracts first control from 2D control problem', () => {
    const prob = system2x2();
    const result = mpcSolve(prob, [1, 1]);
    const u0 = mpcFirstControl(result, 2);
    expect(u0.length).toBe(2);
    expect(u0[0]).toBe(result.controlSequence[0]);
    expect(u0[1]).toBe(result.controlSequence[1]);
  });
});

describe('mpcSolve — BFGS internals', () => {
  it('handles case where sy <= threshold (skips BFGS update)', () => {
    // Use a problem where the gradient barely changes between iterations
    // to trigger sy <= 1e-14 branch
    const prob: MPCProblem = {
      stateDim: 1,
      controlDim: 1,
      horizon: 2,
      dynamics: (x, u) => [x[0] + u[0]],
      stageCost: (_x, _u) => 0, // flat cost — gradient won't change
      terminalCost: (_x) => 0,
    };
    const result = mpcSolve(prob, [0]);
    // Should converge immediately since cost is always 0
    expect(result.cost).toBe(0);
    expect(result.converged).toBe(true);
  });

  it('line search with Armijo condition', () => {
    // Verify the solver works when the line search needs multiple backtracks
    const prob: MPCProblem = {
      stateDim: 1,
      controlDim: 1,
      horizon: 3,
      dynamics: (x, u) => [x[0] + u[0]],
      stageCost: (x, u) => 100 * x[0] * x[0] + 0.001 * u[0] * u[0],
      terminalCost: (x) => 1000 * x[0] * x[0],
    };
    const result = mpcSolve(prob, [10]);
    expect(result.converged).toBe(true);
    expect(result.cost).toBeLessThan(mpcCost(prob, [10], new Array(3).fill(0)));
  });

  it('handles 2D control bounds clamping', () => {
    const prob = system2x2();
    const config: MPCConfig = {
      maxIterations: 50,
      gradTol: 1e-6,
      controlMin: [-1, -2],
      controlMax: [1, 2],
    };
    const result = mpcSolve(prob, [5, 5], undefined, config);
    for (let k = 0; k < prob.horizon; k++) {
      expect(result.controlSequence[k * 2]).toBeGreaterThanOrEqual(-1 - 1e-10);
      expect(result.controlSequence[k * 2]).toBeLessThanOrEqual(1 + 1e-10);
      expect(result.controlSequence[k * 2 + 1]).toBeGreaterThanOrEqual(-2 - 1e-10);
      expect(result.controlSequence[k * 2 + 1]).toBeLessThanOrEqual(2 + 1e-10);
    }
  });
});
