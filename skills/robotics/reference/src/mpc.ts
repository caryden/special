/**
 * Model Predictive Control (MPC) using direct shooting.
 *
 * MPC solves a finite-horizon optimal control problem at each time step:
 *   min_{u_0..u_{N-1}} sum_{k=0}^{N-1} [stage_cost(x_k, u_k)] + terminal_cost(x_N)
 *   subject to: x_{k+1} = dynamics(x_k, u_k)
 *
 * The control sequence is optimized using BFGS, and only the first control
 * action is applied (receding horizon).
 *
 * @node mpc
 * @depends-on mat-ops, state-types, result-types, optimization:bfgs
 * @contract mpc.test.ts
 * @hint shooting: Direct (single) shooting — decision variables are the control
 *       sequence [u_0, ..., u_{N-1}]. States are computed by forward simulation.
 * @hint cross-skill: First cross-skill dependency. In translation, import bfgs
 *       from the optimization skill rather than reimplementing.
 * @hint receding-horizon: Only the first control action u_0 is applied.
 * @provenance ModelPredictiveControl.jl v1.15.0 (concept), Drake (concept)
 */

/** MPC problem definition */
export interface MPCProblem {
  /** State dimension */
  stateDim: number;
  /** Control dimension */
  controlDim: number;
  /** Prediction horizon (number of steps) */
  horizon: number;
  /** Discrete-time dynamics: x_{k+1} = dynamics(x_k, u_k) */
  dynamics: (state: number[], control: number[]) => number[];
  /** Stage cost: L(x_k, u_k) */
  stageCost: (state: number[], control: number[]) => number;
  /** Terminal cost: Phi(x_N) */
  terminalCost: (state: number[]) => number;
}

/** MPC solver configuration */
export interface MPCConfig {
  /** Maximum BFGS iterations */
  maxIterations: number;
  /** Gradient tolerance for convergence */
  gradTol: number;
  /** Control lower bounds (per dimension) */
  controlMin?: number[];
  /** Control upper bounds (per dimension) */
  controlMax?: number[];
}

/** Default MPC configuration */
export const DEFAULT_MPC_CONFIG: MPCConfig = {
  maxIterations: 100,
  gradTol: 1e-6,
};

/** MPC solve result */
export interface MPCResult {
  /** Optimal control sequence [u_0, ..., u_{N-1}] flattened */
  controlSequence: number[];
  /** Predicted state trajectory [x_0, ..., x_N] */
  stateTrajectory: number[][];
  /** Total cost of the optimal trajectory */
  cost: number;
  /** Whether the optimizer converged */
  converged: boolean;
  /** Number of optimizer iterations */
  iterations: number;
}

/**
 * Simulate the state trajectory given an initial state and control sequence.
 */
export function mpcSimulate(
  problem: MPCProblem,
  initialState: number[],
  controls: number[],
): number[][] {
  const trajectory: number[][] = [[...initialState]];
  let state = [...initialState];

  for (let k = 0; k < problem.horizon; k++) {
    const u = controls.slice(k * problem.controlDim, (k + 1) * problem.controlDim);
    state = problem.dynamics(state, u);
    trajectory.push([...state]);
  }

  return trajectory;
}

/**
 * Evaluate the total cost for a given control sequence.
 */
export function mpcCost(
  problem: MPCProblem,
  initialState: number[],
  controls: number[],
): number {
  const trajectory = mpcSimulate(problem, initialState, controls);
  let cost = 0;

  for (let k = 0; k < problem.horizon; k++) {
    const u = controls.slice(k * problem.controlDim, (k + 1) * problem.controlDim);
    cost += problem.stageCost(trajectory[k], u);
  }

  cost += problem.terminalCost(trajectory[problem.horizon]);
  return cost;
}

/**
 * Compute the gradient of the total cost w.r.t. the control sequence
 * using forward finite differences.
 */
function mpcGradient(
  problem: MPCProblem,
  initialState: number[],
  controls: number[],
  eps: number = 1e-7,
): number[] {
  const n = controls.length;
  const f0 = mpcCost(problem, initialState, controls);
  const grad = new Array(n);

  for (let i = 0; i < n; i++) {
    const perturbed = [...controls];
    perturbed[i] += eps;
    grad[i] = (mpcCost(problem, initialState, perturbed) - f0) / eps;
  }

  return grad;
}

/**
 * Clamp controls to bounds.
 */
function clampControls(
  controls: number[],
  controlDim: number,
  horizon: number,
  min?: number[],
  max?: number[],
): number[] {
  if (!min && !max) return controls;
  const clamped = [...controls];
  for (let k = 0; k < horizon; k++) {
    for (let d = 0; d < controlDim; d++) {
      const idx = k * controlDim + d;
      if (min) clamped[idx] = Math.max(clamped[idx], min[d]);
      if (max) clamped[idx] = Math.min(clamped[idx], max[d]);
    }
  }
  return clamped;
}

/**
 * Solve the MPC problem using BFGS optimization.
 *
 * This reference implementation includes a simple BFGS for self-containment.
 * In translation, replace with optimization:bfgs from the optimization skill.
 *
 * @param problem  MPC problem definition
 * @param initialState  Current state x_0
 * @param warmStart  Optional warm-start control sequence from previous solve
 * @param config  Solver configuration
 * @returns MPCResult with optimal controls, predicted trajectory, and diagnostics
 */
export function mpcSolve(
  problem: MPCProblem,
  initialState: number[],
  warmStart?: number[],
  config: MPCConfig = DEFAULT_MPC_CONFIG,
): MPCResult {
  const n = problem.horizon * problem.controlDim;

  // Initialize control sequence
  let u = warmStart ? [...warmStart] : new Array(n).fill(0);
  u = clampControls(u, problem.controlDim, problem.horizon, config.controlMin, config.controlMax);

  // BFGS optimization (embedded for reference self-containment)
  // In translation, this would be: bfgs(objective, u, gradient, options)
  const objective = (controls: number[]) => mpcCost(problem, initialState, controls);
  const gradient = (controls: number[]) => mpcGradient(problem, initialState, controls);

  let H = identityMatrix(n);
  let g = gradient(u);
  let fVal = objective(u);
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < config.maxIterations; iter++) {
    // Check convergence
    const gNorm = Math.max(...g.map(Math.abs));
    if (gNorm < config.gradTol) {
      converged = true;
      break;
    }

    // Search direction: p = -H * g
    const p = matVecMul(H, g.map((v) => -v));

    // Backtracking line search
    const alpha = lineSearch(objective, u, p, fVal, g);

    // Update
    const uNew = u.map((v, i) => v + alpha * p[i]);
    const uClamped = clampControls(uNew, problem.controlDim, problem.horizon, config.controlMin, config.controlMax);
    const gNew = gradient(uClamped);
    const fNew = objective(uClamped);

    // BFGS update
    const s = uClamped.map((v, i) => v - u[i]);
    const y = gNew.map((v, i) => v - g[i]);
    const sy = dotProduct(s, y);

    if (sy > 1e-14) {
      H = bfgsUpdate(H, s, y, sy);
    }

    u = uClamped;
    g = gNew;
    fVal = fNew;
  }

  const trajectory = mpcSimulate(problem, initialState, u);

  return {
    controlSequence: u,
    stateTrajectory: trajectory,
    cost: fVal,
    converged,
    iterations: iter,
  };
}

/**
 * Get the first control action from an MPC result (receding horizon).
 */
export function mpcFirstControl(result: MPCResult, controlDim: number): number[] {
  return result.controlSequence.slice(0, controlDim);
}

// ---------------------------------------------------------------------------
// Embedded BFGS helpers (in translation, replace with optimization:bfgs)
// ---------------------------------------------------------------------------

function identityMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

function matVecMul(A: number[][], x: number[]): number[] {
  return A.map((row) => dotProduct(row, x));
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function lineSearch(
  f: (x: number[]) => number,
  x: number[],
  p: number[],
  fCurr: number,
  g: number[],
): number {
  const c = 1e-4;
  const rho = 0.5;
  let alpha = 1.0;
  const dg = dotProduct(g, p);

  for (let i = 0; i < 30; i++) {
    const xNew = x.map((v, j) => v + alpha * p[j]);
    if (f(xNew) <= fCurr + c * alpha * dg) break;
    alpha *= rho;
  }

  return alpha;
}

function bfgsUpdate(
  H: number[][],
  s: number[],
  y: number[],
  sy: number,
): number[][] {
  const n = s.length;
  const rho = 1 / sy;

  // Hy = H * y
  const Hy = matVecMul(H, y);
  const yHy = dotProduct(y, Hy);

  // H_new = (I - rho*s*y^T) * H * (I - rho*y*s^T) + rho*s*s^T
  const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i][j] =
        H[i][j] -
        rho * (s[i] * Hy[j] + Hy[i] * s[j]) +
        rho * rho * yHy * s[i] * s[j] +
        rho * s[i] * s[j];
    }
  }

  return result;
}
