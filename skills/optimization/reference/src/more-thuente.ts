/**
 * More-Thuente line search algorithm.
 *
 * A robust line search that finds a step satisfying the strong Wolfe
 * conditions using safeguarded cubic/quadratic interpolation. The algorithm
 * maintains an interval of uncertainty [stx, sty] and narrows it using
 * the cstep procedure, which selects between cubic, quadratic, and secant
 * steps depending on function value and derivative comparisons.
 *
 * Two-stage approach:
 * 1. Modified function stage: seeks a step where the modified function
 *    (f - f_tol*alpha*dphi0) has a nonpositive value and nonneg derivative
 * 2. Standard stage: directly seeks the strong Wolfe conditions
 *
 * @node more-thuente
 * @depends-on vec-ops
 * @contract more-thuente.test.ts
 * @hint params: f_tol=1e-4 (c1), gtol=0.9 (c2) match scipy and Optim.jl defaults.
 *       Use gtol=0.1 for gradient descent, gtol=0.9 for Newton/quasi-Newton.
 * @hint interpolation: Uses cubic interpolation with overflow-safe normalization.
 *       Falls back to quadratic/secant when cubic is unreliable.
 * @provenance More & Thuente, "Line search algorithms with guaranteed sufficient
 *            decrease", ACM TOMS 20(3), 1994, pp. 286-307
 * @provenance LineSearches.jl MoreThuente() — Julia translation of MINPACK cvsrch
 */

import { dot, addScaled } from "./vec-ops";
import type { LineSearchResult } from "./line-search";

export interface MoreThuenteOptions {
  /** Sufficient decrease parameter (Wolfe c1). Default: 1e-4 */
  fTol?: number;
  /** Curvature condition parameter (Wolfe c2). Default: 0.9 */
  gtol?: number;
  /** Relative width tolerance for interval of uncertainty. Default: 1e-8 */
  xTol?: number;
  /** Minimum allowed step size. Default: 1e-16 */
  alphaMin?: number;
  /** Maximum allowed step size. Default: 65536.0 */
  alphaMax?: number;
  /** Maximum function evaluations. Default: 100 */
  maxFev?: number;
}

/**
 * More-Thuente line search.
 *
 * Finds alpha > 0 satisfying strong Wolfe conditions:
 *   1. Sufficient decrease: f(x + alpha*d) <= f(x) + fTol*alpha*f'(x)*d
 *   2. Curvature: |f'(x + alpha*d)*d| <= gtol*|f'(x)*d|
 *
 * @param f - Objective function
 * @param grad - Gradient function
 * @param x - Current position
 * @param d - Search direction (must be a descent direction)
 * @param fx - Function value at x
 * @param gx - Gradient at x
 * @param options - Algorithm parameters
 * @returns LineSearchResult with step, value, gradient, and call counts
 *
 * @provenance More & Thuente 1994, Algorithm cvsrch (MINPACK)
 */
export function moreThuente(
  f: (x: number[]) => number,
  grad: (x: number[]) => number[],
  x: number[],
  d: number[],
  fx: number,
  gx: number[],
  options?: MoreThuenteOptions,
): LineSearchResult {
  const fTol = options?.fTol ?? 1e-4;
  const gtol = options?.gtol ?? 0.9;
  const xTol = options?.xTol ?? 1e-8;
  const alphaMin = options?.alphaMin ?? 1e-16;
  const alphaMax = options?.alphaMax ?? 65536.0;
  const maxFev = options?.maxFev ?? 100;

  const dphi0 = dot(gx, d);

  let functionCalls = 0;
  let gradientCalls = 0;

  // Helper: evaluate phi(alpha) and phi'(alpha)
  function evalPhiDphi(alpha: number): { phi: number; dphi: number; g: number[] } {
    const xNew = addScaled(x, d, alpha);
    const phi = f(xNew);
    const g = grad(xNew);
    functionCalls++;
    gradientCalls++;
    return { phi, dphi: dot(g, d), g };
  }

  // Initialize interval of uncertainty
  let bracketed = false;
  let stage1 = true;

  const dgtest = fTol * dphi0;

  let stx = 0;
  let fstx = fx;
  let dgx = dphi0;
  let sty = 0;
  let fsty = fx;
  let dgy = dphi0;

  let width = alphaMax - alphaMin;
  let width1 = 2 * width;

  // Initial step and evaluation
  let alpha = Math.max(alphaMin, Math.min(1.0, alphaMax));
  let { phi: fAlpha, dphi: dgAlpha, g: gAlpha } = evalPhiDphi(alpha);

  // Handle non-finite initial evaluation by halving
  let iterFinite = 0;
  const iterFiniteMax = 50;
  while ((!isFinite(fAlpha) || !isFinite(dgAlpha)) && iterFinite < iterFiniteMax) {
    iterFinite++;
    alpha = alpha / 2;
    ({ phi: fAlpha, dphi: dgAlpha, g: gAlpha } = evalPhiDphi(alpha));
    stx = (7 / 8) * alpha;
  }

  let infoCstep = 1;

  let info = 0;

  for (let iter = 0; ; iter++) {
    // Set bounds for the interval
    let stmin: number;
    let stmax: number;
    if (bracketed) {
      stmin = Math.min(stx, sty);
      stmax = Math.max(stx, sty);
    } else {
      stmin = stx;
      stmax = alpha + 4 * (alpha - stx);
    }

    stmin = Math.max(alphaMin, stmin);
    stmax = Math.min(alphaMax, stmax);

    // Clamp alpha to bounds
    alpha = Math.max(alpha, alphaMin);
    alpha = Math.min(alpha, alphaMax);

    // Unusual termination — revert to best point
    if ((bracketed && (alpha <= stmin || alpha >= stmax)) ||
        functionCalls >= maxFev - 1 || infoCstep === 0 ||
        (bracketed && stmax - stmin <= xTol * stmax)) {
      alpha = stx;
    }

    // Evaluate at alpha
    ({ phi: fAlpha, dphi: dgAlpha, g: gAlpha } = evalPhiDphi(alpha));

    const ftest1 = fx + alpha * dgtest;

    // Test for convergence (info codes 1-6, later codes override earlier)
    if ((bracketed && (alpha <= stmin || alpha >= stmax)) || infoCstep === 0) {
      info = 6; // Rounding errors prevent progress
    }
    if (alpha === alphaMax && fAlpha <= ftest1 && dgAlpha <= dgtest) {
      info = 5; // Step at upper bound
    }
    if (alpha === alphaMin && (fAlpha > ftest1 || dgAlpha >= dgtest)) {
      info = 4; // Step at lower bound
    }
    if (functionCalls >= maxFev) {
      info = 3; // Max function evaluations
    }
    if (bracketed && stmax - stmin <= xTol * stmax) {
      info = 2; // Interval width below tolerance
    }
    if (fAlpha <= ftest1 && Math.abs(dgAlpha) <= -gtol * dphi0) {
      info = 1; // Strong Wolfe conditions satisfied
    }

    if (info !== 0) break;

    // Stage transition: from modified function to standard
    if (stage1 && fAlpha <= ftest1 && dgAlpha >= Math.min(fTol, gtol) * dphi0) {
      stage1 = false;
    }

    // Update interval using modified or standard function values
    let result: CstepResult;

    if (stage1 && fAlpha <= fstx && fAlpha > ftest1) {
      // Use modified function values
      const fm = fAlpha - alpha * dgtest;
      const fxm = fstx - stx * dgtest;
      const fym = fsty - sty * dgtest;
      const dgm = dgAlpha - dgtest;
      const dgxm = dgx - dgtest;
      const dgym = dgy - dgtest;

      result = cstep(stx, fxm, dgxm, sty, fym, dgym, alpha, fm, dgm, bracketed, stmin, stmax);

      // Restore unmodified values
      fstx = result.stx_f + result.stx_val * dgtest;
      fsty = result.sty_f + result.sty_val * dgtest;
      dgx = result.stx_dg + dgtest;
      dgy = result.sty_dg + dgtest;
      stx = result.stx_val;
      sty = result.sty_val;
    } else {
      result = cstep(stx, fstx, dgx, sty, fsty, dgy, alpha, fAlpha, dgAlpha, bracketed, stmin, stmax);
      stx = result.stx_val;
      fstx = result.stx_f;
      dgx = result.stx_dg;
      sty = result.sty_val;
      fsty = result.sty_f;
      dgy = result.sty_dg;
    }

    alpha = result.alpha;
    bracketed = result.bracketed;
    infoCstep = result.info;

    // Force sufficient decrease in interval width
    if (bracketed) {
      if (Math.abs(sty - stx) >= (2 / 3) * width1) {
        alpha = stx + (sty - stx) / 2;
      }
      width1 = width;
      width = Math.abs(sty - stx);
    }
  }

  return {
    alpha, fNew: fAlpha, gNew: gAlpha,
    functionCalls, gradientCalls,
    success: info === 1,
  };
}

/** Return type of the cstep helper. */
export interface CstepResult {
  stx_val: number; stx_f: number; stx_dg: number;
  sty_val: number; sty_f: number; sty_dg: number;
  alpha: number;
  bracketed: boolean;
  info: number;
}

/**
 * Update the interval of uncertainty and compute the next trial step.
 *
 * Implements the step computation from More & Thuente (1994), selecting
 * between cubic, quadratic, and secant interpolation based on the
 * relationship between function values and derivatives at the endpoints.
 *
 * Four cases:
 * 1. f > fx: higher value — cubic vs quadratic, take closer to stx
 * 2. f <= fx, opposite-sign derivatives — cubic vs secant, take closer to alpha
 * 3. f <= fx, same-sign, |dg| < |dgx| — cubic with safeguards
 * 4. f <= fx, same-sign, |dg| >= |dgx| — cubic if bracketed, else bounds
 *
 * @provenance More & Thuente 1994, Subroutine cstep
 */
export function cstep(
  stx: number, fstx: number, dgx: number,
  sty: number, fsty: number, dgy: number,
  alpha: number, f: number, dg: number,
  bracketed: boolean, stmin: number, stmax: number,
): CstepResult {
  let info = 0;
  let bound: boolean;

  const sgnd = dg * (dgx / Math.abs(dgx));

  let alphaf: number;

  // Case 1: Higher function value — minimum is bracketed
  if (f > fstx) {
    info = 1;
    bound = true;
    const theta = 3 * (fstx - f) / (alpha - stx) + dgx + dg;
    const s = Math.max(Math.abs(theta), Math.abs(dgx), Math.abs(dg));
    const gamma = (alpha < stx ? -1 : 1) * s * Math.sqrt((theta / s) ** 2 - (dgx / s) * (dg / s));
    const p = gamma - dgx + theta;
    const q = gamma - dgx + gamma + dg;
    const r = p / q;
    const alphac = stx + r * (alpha - stx);
    const alphaq = stx + (dgx / ((fstx - f) / (alpha - stx) + dgx)) / 2 * (alpha - stx);
    alphaf = Math.abs(alphac - stx) < Math.abs(alphaq - stx) ? alphac : (alphac + alphaq) / 2;
    bracketed = true;

  // Case 2: Lower value, opposite-sign derivatives — minimum is bracketed
  } else if (sgnd < 0) {
    info = 2;
    bound = false;
    const theta = 3 * (fstx - f) / (alpha - stx) + dgx + dg;
    const s = Math.max(Math.abs(theta), Math.abs(dgx), Math.abs(dg));
    const gamma = (alpha > stx ? -1 : 1) * s * Math.sqrt((theta / s) ** 2 - (dgx / s) * (dg / s));
    const p = gamma - dg + theta;
    const q = gamma - dg + gamma + dgx;
    const r = p / q;
    const alphac = alpha + r * (stx - alpha);
    const alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha);
    alphaf = Math.abs(alphac - alpha) > Math.abs(alphaq - alpha) ? alphac : alphaq;
    bracketed = true;

  // Case 3: Lower value, same-sign, decreasing derivative magnitude
  } else if (Math.abs(dg) < Math.abs(dgx)) {
    info = 3;
    bound = true;
    const theta = 3 * (fstx - f) / (alpha - stx) + dgx + dg;
    const s = Math.max(Math.abs(theta), Math.abs(dgx), Math.abs(dg));
    const gammaArg = Math.max(0, (theta / s) ** 2 - (dgx / s) * (dg / s));
    const gamma = (alpha > stx ? -1 : 1) * s * Math.sqrt(gammaArg);
    const p = gamma - dg + theta;
    const q = gamma + dgx - dg + gamma;
    const r = p / q;

    let alphac: number;
    if (r < 0 && gamma !== 0) {
      alphac = alpha + r * (stx - alpha);
    } else if (alpha > stx) {
      alphac = stmax;
    } else {
      alphac = stmin;
    }
    const alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha);

    if (bracketed) {
      alphaf = Math.abs(alpha - alphac) < Math.abs(alpha - alphaq) ? alphac : alphaq;
    } else {
      alphaf = Math.abs(alpha - alphac) > Math.abs(alpha - alphaq) ? alphac : alphaq;
    }

  // Case 4: Lower value, same-sign, non-decreasing derivative magnitude
  } else {
    info = 4;
    bound = false;
    if (bracketed) {
      const theta = 3 * (f - fsty) / (sty - alpha) + dgy + dg;
      const s = Math.max(Math.abs(theta), Math.abs(dgy), Math.abs(dg));
      const gamma = (alpha > sty ? -1 : 1) * s * Math.sqrt((theta / s) ** 2 - (dgy / s) * (dg / s));
      const p = gamma - dg + theta;
      const q = gamma - dg + gamma + dgy;
      const r = p / q;
      alphaf = alpha + r * (sty - alpha);
    } else if (alpha > stx) {
      alphaf = stmax;
    } else {
      alphaf = stmin;
    }
  }

  // Update the interval of uncertainty
  let newStx = stx, newFstx = fstx, newDgx = dgx;
  let newSty = sty, newFsty = fsty, newDgy = dgy;

  if (f > fstx) {
    newSty = alpha;
    newFsty = f;
    newDgy = dg;
  } else {
    if (sgnd < 0) {
      newSty = stx;
      newFsty = fstx;
      newDgy = dgx;
    }
    newStx = alpha;
    newFstx = f;
    newDgx = dg;
  }

  // Safeguard the step
  alphaf = Math.min(stmax, alphaf);
  alphaf = Math.max(stmin, alphaf);

  if (bracketed && bound) {
    if (newSty > newStx) {
      alphaf = Math.min(newStx + (2 / 3) * (newSty - newStx), alphaf);
    } else {
      alphaf = Math.max(newStx + (2 / 3) * (newSty - newStx), alphaf);
    }
  }

  return {
    stx_val: newStx, stx_f: newFstx, stx_dg: newDgx,
    sty_val: newSty, sty_f: newFsty, sty_dg: newDgy,
    alpha: alphaf,
    bracketed,
    info,
  };
}
