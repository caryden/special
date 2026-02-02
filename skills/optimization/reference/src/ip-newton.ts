/**
 * IPNewton: interior-point Newton method for nonlinearly constrained optimization.
 *
 * Solves:
 *   minimize    f(x)
 *   subject to  c_eq(x) = 0            (equality constraints)
 *               c_ineq(x) >= 0          (inequality constraints)
 *               lower <= x <= upper     (box constraints)
 *
 * Uses a primal-dual log-barrier approach with Mehrotra predictor-corrector
 * updates for the barrier parameter mu. At each iteration, solves a condensed
 * KKT system (eliminating slacks via block elimination) using Cholesky
 * factorization with diagonal modification.
 *
 * @node ip-newton
 * @depends-on vec-ops, result-types, finite-diff, finite-hessian
 * @contract ip-newton.test.ts
 * @hint barrier: Inequality constraints are handled via log-barrier terms
 *       -mu * sum(log(s_i)). As mu -> 0, solutions approach the true optimum.
 * @hint kkt: The KKT system is condensed by eliminating slack/dual variables,
 *       yielding an (n + m_eq) x (n + m_eq) system solved via Schur complement.
 * @hint predictor-corrector: Mehrotra's heuristic sigma = (mu_aff/mu)^3 with
 *       floor mu/10 prevents overly aggressive barrier reduction.
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 19 (interior-point methods)
 * @provenance Mehrotra (1992), SIAM J. Optimization — predictor-corrector strategy
 * @provenance Optim.jl v2.0.0 IPNewton — primal-dual with backtracking line search
 */

import { dot, norm, normInf, add, sub, scale, zeros, addScaled } from "./vec-ops";
import {
  type OptimizeResult,
  type OptimizeOptions,
  defaultOptions,
} from "./result-types";
import { forwardDiffGradient } from "./finite-diff";
import { finiteDiffHessian } from "./finite-hessian";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Definition of nonlinear constraints for IPNewton. */
export interface ConstraintDef {
  /** Evaluate constraint values c(x). Returns array of length m. */
  c: (x: number[]) => number[];
  /** Evaluate constraint Jacobian J(x). Returns m x n matrix (row per constraint). */
  jacobian: (x: number[]) => number[][];
  /**
   * Lower bounds on constraints: c(x) >= lower.
   * Use -Infinity for unconstrained-below, same value as upper for equality.
   */
  lower: number[];
  /**
   * Upper bounds on constraints: c(x) <= upper.
   * Use +Infinity for unconstrained-above, same value as lower for equality.
   */
  upper: number[];
}

/** Options for IPNewton optimizer. */
export interface IPNewtonOptions extends Partial<OptimizeOptions> {
  /** Box lower bounds on x. Default: all -Infinity. */
  lower?: number[];
  /** Box upper bounds on x. Default: all +Infinity. */
  upper?: number[];
  /** Nonlinear constraints. Default: none. */
  constraints?: ConstraintDef;
  /** Initial barrier parameter. Default: auto. */
  mu0?: number;
  /** Convergence tolerance on KKT residual. Default: 1e-8 */
  kktTol?: number;
}

// ─── Classified constraints ─────────────────────────────────────────────────

/** A single inequality: sigma * (val - bound) >= 0 */
interface IneqEntry {
  idx: number;
  bound: number;
  sigma: number; // +1 for lower bound, -1 for upper bound
}

/** A single equality: val = target */
interface EqEntry {
  idx: number;
  target: number;
}

interface ClassifiedConstraints {
  boxIneq: IneqEntry[];
  boxEq: EqEntry[];
  conIneq: IneqEntry[];
  conEq: EqEntry[];
}

/**
 * Classify box and general constraints into equalities and inequalities.
 */
function classifyConstraints(
  n: number,
  boxLower: number[],
  boxUpper: number[],
  conDef?: ConstraintDef,
): ClassifiedConstraints {
  const boxIneq: IneqEntry[] = [];
  const boxEq: EqEntry[] = [];

  for (let i = 0; i < n; i++) {
    if (boxLower[i] === boxUpper[i]) {
      boxEq.push({ idx: i, target: boxLower[i] });
    } else {
      if (isFinite(boxLower[i])) {
        boxIneq.push({ idx: i, bound: boxLower[i], sigma: 1 });
      }
      if (isFinite(boxUpper[i])) {
        boxIneq.push({ idx: i, bound: boxUpper[i], sigma: -1 });
      }
    }
  }

  const conIneq: IneqEntry[] = [];
  const conEq: EqEntry[] = [];

  if (conDef) {
    const m = conDef.lower.length;
    for (let i = 0; i < m; i++) {
      if (conDef.lower[i] === conDef.upper[i]) {
        conEq.push({ idx: i, target: conDef.lower[i] });
      } else {
        if (isFinite(conDef.lower[i])) {
          conIneq.push({ idx: i, bound: conDef.lower[i], sigma: 1 });
        }
        if (isFinite(conDef.upper[i])) {
          conIneq.push({ idx: i, bound: conDef.upper[i], sigma: -1 });
        }
      }
    }
  }

  return { boxIneq, boxEq, conIneq, conEq };
}

// ─── Dense linear algebra ───────────────────────────────────────────────────

/**
 * Solve A*x = b using Cholesky factorization (A = L*L').
 * Returns null if A is not positive definite.
 */
function choleskySolve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = A[i][i] - sum;
        if (diag <= 0) return null;
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }

  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
    y[i] = (b[i] - sum) / L[i][i];
  }

  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += L[j][i] * x[j];
    x[i] = (y[i] - sum) / L[i][i];
  }

  return x;
}

/**
 * Solve A*x = b with diagonal modification if needed.
 */
function robustSolve(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (n === 0) return [];

  const sol = choleskySolve(A, b);
  if (sol) return sol;

  let tau = 1e-8;
  for (let attempt = 0; attempt < 25; attempt++) {
    const Areg = A.map((row, i) => {
      const r = row.slice();
      r[i] += tau;
      return r;
    });
    const regSol = choleskySolve(Areg, b);
    if (regSol) return regSol;
    tau *= 10;
  }

  // Fallback: return scaled b direction
  const bNorm = normInf(b);
  return bNorm > 0 ? b.map(bi => bi / bNorm) : zeros(n);
}

// ─── Matrix helpers ─────────────────────────────────────────────────────────

function matTvec(A: number[][], v: number[]): number[] {
  const n = A.length > 0 ? A[0].length : 0;
  const result = zeros(n);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < n; j++) {
      result[j] += A[i][j] * v[i];
    }
  }
  return result;
}

/** A^T * diag(d) * A, result is n x n. */
function matTDiagMat(A: number[][], d: number[]): number[][] {
  const n = A.length > 0 ? A[0].length : 0;
  const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < A.length; i++) {
    for (let p = 0; p < n; p++) {
      for (let q = p; q < n; q++) {
        result[p][q] += A[i][p] * d[i] * A[i][q];
      }
    }
  }
  for (let p = 0; p < n; p++) {
    for (let q = 0; q < p; q++) {
      result[p][q] = result[q][p];
    }
  }
  return result;
}

function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

// ─── Jacobian assembly ──────────────────────────────────────────────────────

/**
 * Build the inequality Jacobian J_I: rows correspond to each inequality.
 * Box inequalities have a single sigma at the variable index.
 * General constraint inequalities use sigma * J_c[idx] row.
 */
function buildIneqJacobian(
  n: number,
  cc: ClassifiedConstraints,
  Jc: number[][] | null,
): number[][] {
  const rows: number[][] = [];
  for (const e of cc.boxIneq) {
    const row = zeros(n);
    row[e.idx] = e.sigma;
    rows.push(row);
  }
  for (const e of cc.conIneq) {
    if (Jc) {
      rows.push(Jc[e.idx].map(v => v * e.sigma));
    }
  }
  return rows;
}

/**
 * Build the equality Jacobian J_E.
 */
function buildEqJacobian(
  n: number,
  cc: ClassifiedConstraints,
  Jc: number[][] | null,
): number[][] {
  const rows: number[][] = [];
  for (const e of cc.boxEq) {
    const row = zeros(n);
    row[e.idx] = 1;
    rows.push(row);
  }
  for (const e of cc.conEq) {
    if (Jc) {
      rows.push(Jc[e.idx].slice());
    }
  }
  return rows;
}

// ─── Slack and residual helpers ─────────────────────────────────────────────

/** Compute slacks for all inequalities from current x and c(x). */
function computeSlacks(
  x: number[],
  cx: number[],
  cc: ClassifiedConstraints,
): { slackBox: number[]; slackCon: number[] } {
  const slackBox = cc.boxIneq.map(e => {
    const s = e.sigma * (x[e.idx] - e.bound);
    return Math.max(s, 1e-10);
  });
  const slackCon = cc.conIneq.map(e => {
    const s = e.sigma * (cx[e.idx] - e.bound);
    return Math.max(s, 1e-10);
  });
  return { slackBox, slackCon };
}

/** Compute equality residual. */
function equalityResidual(
  x: number[],
  cx: number[],
  cc: ClassifiedConstraints,
): number[] {
  const res: number[] = [];
  for (const e of cc.boxEq) res.push(x[e.idx] - e.target);
  for (const e of cc.conEq) res.push(cx[e.idx] - e.target);
  return res;
}

// ─── KKT system ─────────────────────────────────────────────────────────────

interface KKTStep {
  dx: number[];
  dLambdaEq: number[];
  dSlackBox: number[];
  dSlackCon: number[];
  dLambdaBox: number[];
  dLambdaCon: number[];
}

/**
 * Solve the condensed KKT system.
 *
 * Eliminates slack/dual variables via block elimination:
 *   Htilde = H + J_I^T * Sigma * J_I  (Sigma = diag(lambda/slack))
 *   gtilde = g - J_I^T * (mu/slack) + J_I^T * lambda
 *
 * With equalities via Schur complement on the saddle-point system.
 */
function solveKKT(
  H: number[][],
  gx: number[],
  x: number[],
  cx: number[],
  cc: ClassifiedConstraints,
  slackBox: number[],
  slackCon: number[],
  lambdaBox: number[],
  lambdaCon: number[],
  lambdaBoxEq: number[],
  lambdaConEq: number[],
  Jc: number[][] | null,
  mu: number,
): KKTStep {
  const n = x.length;
  const nIneq = cc.boxIneq.length + cc.conIneq.length;
  const nEq = cc.boxEq.length + cc.conEq.length;

  const JI = buildIneqJacobian(n, cc, Jc);
  const allSlack = [...slackBox, ...slackCon];
  const allLambda = [...lambdaBox, ...lambdaCon];

  // Sigma = diag(lambda / slack)
  const sigmaVec = allSlack.map((s, i) => allLambda[i] / Math.max(s, 1e-20));

  // Htilde = H + J_I^T * Sigma * J_I
  let Htilde: number[][];
  if (nIneq > 0) {
    Htilde = matAdd(H, matTDiagMat(JI, sigmaVec));
  } else {
    Htilde = H.map(r => r.slice());
  }

  // Barrier correction: -mu/s_i (lambda terms cancel in block elimination)
  const correction = allSlack.map((s) => -mu / Math.max(s, 1e-20));

  // gtilde = g + J_I^T * correction
  let gtilde = gx.slice();
  if (nIneq > 0) {
    const JItCorr = matTvec(JI, correction);
    for (let i = 0; i < n; i++) gtilde[i] += JItCorr[i];
  }

  let dx: number[];
  let dLambdaEq: number[];

  if (nEq > 0) {
    const JE = buildEqJacobian(n, cc, Jc);
    const gEq = equalityResidual(x, cx, cc);

    // Subtract equality multiplier contributions (sign from KKT block elimination)
    const allLambdaEq = [...lambdaBoxEq, ...lambdaConEq];
    const JEtLambda = matTvec(JE, allLambdaEq);
    for (let i = 0; i < n; i++) gtilde[i] -= JEtLambda[i];

    // Solve via Schur complement:
    // v = Htilde^{-1} * (-gtilde)
    const v = robustSolve(Htilde, gtilde.map(g => -g));

    // Y[j] = Htilde^{-1} * JE[j]^T  (columns of J_E^T)
    const Y: number[][] = [];
    for (let j = 0; j < nEq; j++) {
      const col = JE[j].slice(); // row j of JE = column j of JE^T
      Y.push(robustSolve(Htilde, col));
    }

    // M = JE * Y (nEq x nEq Schur complement matrix)
    const M: number[][] = Array.from({ length: nEq }, (_, i) =>
      Y.map(yj => dot(JE[i], yj)),
    );

    // rhs = -(gEq + JE * v)
    const JEv = JE.map(row => dot(row, v));
    const rhs = gEq.map((ge, i) => -(ge + JEv[i]));

    dLambdaEq = robustSolve(M, rhs);

    // dx = v + sum(dLambdaEq[j] * Y[j])
    dx = v.slice();
    for (let j = 0; j < nEq; j++) {
      for (let i = 0; i < n; i++) {
        dx[i] += Y[j][i] * dLambdaEq[j];
      }
    }
  } else {
    dx = robustSolve(Htilde, gtilde.map(g => -g));
    dLambdaEq = [];
  }

  // Recover slack steps: d_s_i = sigma_i * (J_I_i . dx)  (for box: sigma * dx[idx])
  const dSlackBox = cc.boxIneq.map(e => e.sigma * dx[e.idx]);
  const dSlackCon = cc.conIneq.map((e, i) => {
    const rowIdx = cc.boxIneq.length + i;
    return dot(JI[rowIdx], dx);
  });

  // Recover dual steps: d_lambda_i = (mu/s_i - lambda_i) - (lambda_i/s_i) * d_s_i
  const dLambdaBox = slackBox.map((s, i) =>
    (mu / Math.max(s, 1e-20) - lambdaBox[i]) - (lambdaBox[i] / Math.max(s, 1e-20)) * dSlackBox[i],
  );
  const dLambdaCon = slackCon.map((s, i) =>
    (mu / Math.max(s, 1e-20) - lambdaCon[i]) - (lambdaCon[i] / Math.max(s, 1e-20)) * dSlackCon[i],
  );

  return { dx, dLambdaEq, dSlackBox, dSlackCon, dLambdaBox, dLambdaCon };
}

// ─── Step length ────────────────────────────────────────────────────────────

/**
 * Maximum step alpha in (0, 1] keeping vals[i] + alpha*dvals[i] >= 0.
 */
function maxFractionToBoundary(
  vals: number[],
  dvals: number[],
  tau: number = 0.995,
): number {
  let alpha = 1.0;
  for (let i = 0; i < vals.length; i++) {
    if (dvals[i] < -1e-20) {
      const a = -tau * vals[i] / dvals[i];
      if (a < alpha) alpha = a;
    }
  }
  return Math.max(alpha, 0);
}

// ─── Barrier parameter update ───────────────────────────────────────────────

/**
 * Mehrotra predictor-corrector barrier parameter update.
 */
function computeMuNext(
  allSlack: number[],
  allLambda: number[],
  dSlack: number[],
  dLambda: number[],
): number {
  const nIneq = allSlack.length;
  if (nIneq === 0) return 0;

  // Current complementarity measure
  let muCurrent = 0;
  for (let i = 0; i < nIneq; i++) muCurrent += allSlack[i] * allLambda[i];
  muCurrent /= nIneq;

  // Max step for slacks and duals
  const alphaS = maxFractionToBoundary(allSlack, dSlack);
  const alphaL = maxFractionToBoundary(allLambda, dLambda);

  // Affine complementarity
  let muAff = 0;
  for (let i = 0; i < nIneq; i++) {
    muAff += (allSlack[i] + alphaS * dSlack[i]) * (allLambda[i] + alphaL * dLambda[i]);
  }
  muAff /= nIneq;

  // Mehrotra centering
  const ratio = muAff / Math.max(muCurrent, 1e-25);
  const sigma = ratio * ratio * ratio;

  return Math.max(sigma * muCurrent, muCurrent / 10);
}

// ─── Merit function ─────────────────────────────────────────────────────────

/**
 * Evaluate the merit function: f(x) + penalty * ||eq_violation|| - mu * sum(log(s)).
 */
function meritFunction(
  fx: number,
  slackBox: number[],
  slackCon: number[],
  eqResidual: number[],
  mu: number,
  penalty: number,
): number {
  let val = fx;
  for (const s of slackBox) {
    if (s > 0) val -= mu * Math.log(s);
    else return Infinity;
  }
  for (const s of slackCon) {
    if (s > 0) val -= mu * Math.log(s);
    else return Infinity;
  }
  for (const r of eqResidual) {
    val += penalty * Math.abs(r);
  }
  return val;
}

// ─── Main algorithm ─────────────────────────────────────────────────────────

/**
 * Minimize a function subject to nonlinear equality and inequality constraints
 * and box constraints, using a primal-dual interior-point Newton method.
 *
 * @param f - Objective function
 * @param x0 - Starting point (should be strictly feasible for inequalities)
 * @param grad - Gradient function (uses finite differences if omitted)
 * @param hess - Hessian function (uses finite differences if omitted)
 * @param options - IPNewton options including constraints and bounds
 * @returns OptimizeResult
 *
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 19
 * @provenance Optim.jl v2.0.0 IPNewton
 */
export function ipNewton(
  f: (x: number[]) => number,
  x0: number[],
  grad?: (x: number[]) => number[],
  hess?: (x: number[]) => number[][],
  options?: IPNewtonOptions,
): OptimizeResult {
  const n = x0.length;
  const opts = defaultOptions(options);
  const kktTol = options?.kktTol ?? opts.gradTol;

  const boxLower = options?.lower ?? new Array(n).fill(-Infinity);
  const boxUpper = options?.upper ?? new Array(n).fill(Infinity);
  const conDef = options?.constraints;

  const gradFn = grad ?? ((x: number[]) => forwardDiffGradient(f, x));
  const hessFn = hess ?? ((x: number[]) => finiteDiffHessian(f, x));
  const conFn = conDef ? conDef.c : null;
  const jacFn = conDef ? conDef.jacobian : null;

  // Classify constraints
  const cc = classifyConstraints(n, boxLower, boxUpper, conDef);
  const nIneq = cc.boxIneq.length + cc.conIneq.length;
  const nEq = cc.boxEq.length + cc.conEq.length;
  const hasConstraints = nIneq + nEq > 0;

  // Initialize x strictly inside box bounds
  let x = x0.slice();
  for (let i = 0; i < n; i++) {
    const lo = boxLower[i];
    const hi = boxUpper[i];
    if (lo === hi) {
      x[i] = lo; // box equality
    } else if (isFinite(lo) && isFinite(hi)) {
      const margin = 0.01 * (hi - lo);
      x[i] = Math.max(lo + margin, Math.min(hi - margin, x[i]));
    } else if (isFinite(lo)) {
      x[i] = Math.max(lo + 0.01 * Math.max(1, Math.abs(lo)), x[i]);
    } else if (isFinite(hi)) {
      x[i] = Math.min(hi - 0.01 * Math.max(1, Math.abs(hi)), x[i]);
    }
  }

  let fx = f(x);
  let gx = gradFn(x);
  let cx = conFn ? conFn(x) : [];
  let Jc = jacFn ? jacFn(x) : null;
  let functionCalls = 1;
  let gradientCalls = 1;

  // Check initial convergence (unconstrained case)
  if (!hasConstraints && normInf(gx) < opts.gradTol) {
    return {
      x: x.slice(), fun: fx, gradient: gx.slice(),
      iterations: 0, functionCalls, gradientCalls,
      converged: true, message: "Converged: gradient norm below tolerance",
    };
  }

  // Initialize slacks from constraint values
  let { slackBox, slackCon } = computeSlacks(x, cx, cc);

  // Initialize barrier parameter mu using gradient ratio (matches Fminbox approach)
  let mu: number;
  if (options?.mu0 !== undefined) {
    mu = options.mu0;
  } else if (nIneq > 0) {
    // mu = factor * ||grad_f||_1 / ||grad_barrier||_1
    // This balances objective gradient against barrier gradient at the starting point
    const objGradL1 = gx.reduce((s, g) => s + Math.abs(g), 0);
    let barrierGradL1 = 0;
    for (let i = 0; i < slackBox.length; i++) {
      barrierGradL1 += 1 / Math.max(slackBox[i], 1e-14);
    }
    for (let i = 0; i < slackCon.length; i++) {
      barrierGradL1 += 1 / Math.max(slackCon[i], 1e-14);
    }
    mu = barrierGradL1 > 0 ? 0.001 * objGradL1 / barrierGradL1 : 1e-4;
    mu = Math.max(mu, 1e-10);
    mu = Math.min(mu, 1);
  } else {
    mu = 0;
  }

  // Initialize dual multipliers: lambda = mu / slack
  let lambdaBox = slackBox.map(s => mu / Math.max(s, 1e-14));
  let lambdaCon = slackCon.map(s => mu / Math.max(s, 1e-14));
  let lambdaBoxEq = new Array(cc.boxEq.length).fill(0);
  let lambdaConEq = new Array(cc.conEq.length).fill(0);

  // Penalty for equality violations in merit function
  const penalty = 10 * Math.max(normInf(gx), 1);

  let bestX = x.slice();
  let bestFx = fx;

  for (let iter = 1; iter <= opts.maxIterations; iter++) {
    // Compute Hessian
    const H = hessFn(x);

    // Solve KKT system
    const step = solveKKT(
      H, gx, x, cx, cc,
      slackBox, slackCon, lambdaBox, lambdaCon, lambdaBoxEq, lambdaConEq,
      Jc, mu,
    );

    // Compute max step lengths to maintain positivity (separate primal/dual)
    const allSlack = [...slackBox, ...slackCon];
    const allDSlack = [...step.dSlackBox, ...step.dSlackCon];
    const allLambda = [...lambdaBox, ...lambdaCon];
    const allDLambda = [...step.dLambdaBox, ...step.dLambdaCon];

    let alphaPMax = 1.0; // max primal step (for slacks)
    let alphaDMax = 1.0; // max dual step (for lambdas)
    if (nIneq > 0) {
      alphaPMax = maxFractionToBoundary(allSlack, allDSlack);
      alphaDMax = maxFractionToBoundary(allLambda, allDLambda);
    }

    // Current merit
    const eqRes0 = equalityResidual(x, cx, cc);
    const merit0 = meritFunction(fx, slackBox, slackCon, eqRes0, mu, penalty);

    // Backtracking line search on merit function (primal step only)
    let alphaP = alphaPMax;
    let xNew = x;
    let fNew = fx;
    let cxNew = cx;

    for (let bt = 0; bt < 40; bt++) {
      xNew = addScaled(x, step.dx, alphaP);

      // Enforce box bounds strictly
      for (let i = 0; i < n; i++) {
        const lo = boxLower[i];
        const hi = boxUpper[i];
        if (lo === hi) {
          xNew[i] = lo;
        } else {
          if (isFinite(lo)) xNew[i] = Math.max(lo + 1e-14, xNew[i]);
          if (isFinite(hi)) xNew[i] = Math.min(hi - 1e-14, xNew[i]);
        }
      }

      fNew = f(xNew);
      cxNew = conFn ? conFn(xNew) : [];
      functionCalls++;

      const { slackBox: sbNew, slackCon: scNew } = computeSlacks(xNew, cxNew, cc);
      const eqResNew = equalityResidual(xNew, cxNew, cc);
      const meritNew = meritFunction(fNew, sbNew, scNew, eqResNew, mu, penalty);

      if (isFinite(meritNew) && meritNew < merit0 + 1e-8) {
        break;
      }

      alphaP *= 0.5;
    }

    const xPrev = x;
    const fPrev = fx;

    x = xNew;
    fx = fNew;
    cx = cxNew;

    // Track best feasible point
    if (isFinite(fx) && fx < bestFx) {
      bestX = x.slice();
      bestFx = fx;
    }

    // Guard: bail out if NaN detected, return best point
    if (!isFinite(fx) || x.some(v => !isFinite(v))) {
      return {
        x: bestX.slice(), fun: bestFx, gradient: gx.slice(),
        iterations: iter, functionCalls, gradientCalls,
        converged: false, message: "Stopped: numerical instability (NaN detected)",
      };
    }

    // Update slacks from actual constraint values
    const newSlacks = computeSlacks(x, cx, cc);
    slackBox = newSlacks.slackBox;
    slackCon = newSlacks.slackCon;

    // Update dual multipliers using separate dual step size (alphaDMax)
    lambdaBox = lambdaBox.map((l, i) => {
      const lNew = Math.max(l + alphaDMax * step.dLambdaBox[i], 1e-20);
      return Math.min(lNew, 1e12);
    });
    lambdaCon = lambdaCon.map((l, i) => {
      const lNew = Math.max(l + alphaDMax * step.dLambdaCon[i], 1e-20);
      return Math.min(lNew, 1e12);
    });

    // Update equality multipliers using dual step size
    if (nEq > 0) {
      const allLambdaEqOld = [...lambdaBoxEq, ...lambdaConEq];
      const allLambdaEqNew = allLambdaEqOld.map((l, i) =>
        i < step.dLambdaEq.length ? l + alphaDMax * step.dLambdaEq[i] : l,
      );
      lambdaBoxEq = allLambdaEqNew.slice(0, cc.boxEq.length);
      lambdaConEq = allLambdaEqNew.slice(cc.boxEq.length);
    }

    gx = gradFn(x);
    gradientCalls++;
    Jc = jacFn ? jacFn(x) : null;

    // Update barrier parameter via Mehrotra predictor-corrector
    if (nIneq > 0) {
      const muNext = computeMuNext(
        [...slackBox, ...slackCon],
        [...lambdaBox, ...lambdaCon],
        [...step.dSlackBox, ...step.dSlackCon],
        [...step.dLambdaBox, ...step.dLambdaCon],
      );
      // Ensure mu decreases monotonically (with floor)
      mu = Math.max(Math.min(muNext, mu), 1e-20);
    }

    // Check convergence
    const stepNorm = normInf(sub(x, xPrev));
    const funcChange = Math.abs(fx - fPrev);

    if (hasConstraints) {
      // Check KKT conditions with mu close to zero
      const eqRes = equalityResidual(x, cx, cc);
      const eqViolation = eqRes.reduce((m, r) => Math.max(m, Math.abs(r)), 0);

      // Check complementarity and stationarity
      const gradLag = gx.slice();
      const JI = buildIneqJacobian(n, cc, Jc);
      const JE = buildEqJacobian(n, cc, Jc);

      for (let i = 0; i < JI.length; i++) {
        for (let j = 0; j < n; j++) {
          gradLag[j] -= JI[i][j] * [...lambdaBox, ...lambdaCon][i];
        }
      }
      const allLambdaEq = [...lambdaBoxEq, ...lambdaConEq];
      for (let i = 0; i < JE.length; i++) {
        for (let j = 0; j < n; j++) {
          gradLag[j] += JE[i][j] * allLambdaEq[i];
        }
      }
      const kktGrad = normInf(gradLag);
      const kktRes = Math.max(kktGrad, eqViolation);

      if (kktRes < kktTol && mu < 1e-4) {
        return {
          x: x.slice(), fun: fx, gradient: gx.slice(),
          iterations: iter, functionCalls, gradientCalls,
          converged: true, message: `Converged: KKT residual ${kktRes.toExponential(2)} below tolerance`,
        };
      }
    } else {
      if (normInf(gx) < opts.gradTol) {
        return {
          x: x.slice(), fun: fx, gradient: gx.slice(),
          iterations: iter, functionCalls, gradientCalls,
          converged: true, message: "Converged: gradient norm below tolerance",
        };
      }
    }

    if (stepNorm < opts.stepTol) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: iter, functionCalls, gradientCalls,
        converged: true, message: "Converged: step size below tolerance",
      };
    }

    if (funcChange < opts.funcTol && iter > 1) {
      return {
        x: x.slice(), fun: fx, gradient: gx.slice(),
        iterations: iter, functionCalls, gradientCalls,
        converged: true, message: "Converged: function change below tolerance",
      };
    }
  }

  return {
    x: x.slice(), fun: fx, gradient: gx.slice(),
    iterations: opts.maxIterations, functionCalls, gradientCalls,
    converged: false,
    message: `Stopped: reached maximum iterations (${opts.maxIterations})`,
  };
}
