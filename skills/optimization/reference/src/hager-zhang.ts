/**
 * Hager-Zhang line search algorithm.
 *
 * An efficient line search that satisfies approximate Wolfe conditions,
 * combining secant-based interpolation with bisection fallback. This is
 * the default line search in Optim.jl and the CG_DESCENT conjugate
 * gradient implementation.
 *
 * The algorithm has two phases:
 * 1. Bracket: find an interval [a, b] containing a point satisfying
 *    approximate Wolfe conditions
 * 2. Secant/bisect: narrow the bracket to find the point
 *
 * @node hager-zhang
 * @depends-on vec-ops
 * @contract hager-zhang.test.ts
 * @hint params: Default parameters match Optim.jl's HagerZhang() constructor.
 * @hint approx-wolfe: Uses "approximate" Wolfe conditions which allow the
 *       function value to slightly exceed f(0) + delta*alpha*phi'(0), bounded
 *       by an epsilon-scaled term. This improves robustness.
 * @provenance Hager & Zhang, "Algorithm 851: CG_DESCENT", ACM TOMS 32(1), 2006
 * @provenance Hager & Zhang, "A new conjugate gradient method with guaranteed
 *            descent and an efficient line search", SIAM J. Optim. 16(1), 2005
 */

import { dot, addScaled } from "./vec-ops";
import type { LineSearchResult } from "./line-search";

export interface HagerZhangOptions {
  /** Sufficient decrease parameter (Wolfe c1). Default: 0.1 */
  delta?: number;
  /** Curvature condition parameter (Wolfe c2). Default: 0.9 */
  sigma?: number;
  /** Approximate Wolfe tolerance. Default: 1e-6 */
  epsilon?: number;
  /** Bisection ratio for bracket update. Default: 0.5 */
  theta?: number;
  /** Bracket shrink factor for secant failure. Default: 0.66 */
  gamma?: number;
  /** Initial bracket expansion factor. Default: 5.0 */
  rho?: number;
  /** Maximum iterations for bracket phase. Default: 50 */
  maxBracketIter?: number;
  /** Maximum iterations for secant/bisect phase. Default: 50 */
  maxSecantIter?: number;
}

/**
 * Hager-Zhang line search.
 *
 * Finds alpha > 0 satisfying approximate Wolfe conditions:
 *   1. Sufficient decrease: phi(alpha) <= phi(0) + delta*alpha*phi'(0)
 *   2. Curvature: sigma*phi'(0) <= phi'(alpha)
 *   OR approximate Wolfe when close to minimum:
 *   1'. phi(alpha) <= phi(0) + eps_k
 *   2'. sigma*phi'(0) <= phi'(alpha) <= (2*delta - 1)*phi'(0)
 *
 * @param f - Objective function
 * @param grad - Gradient function
 * @param x - Current position
 * @param d - Search direction (must be a descent direction: g'*d < 0)
 * @param fx - f(x) (precomputed)
 * @param gx - grad(x) (precomputed)
 * @param options - HagerZhang parameters
 *
 * @provenance Hager & Zhang 2006, Algorithm 851, Sections 2-3
 * @provenance Default parameters match Optim.jl HagerZhang() constructor
 */
export function hagerZhangLineSearch(
  f: (x: number[]) => number,
  grad: (x: number[]) => number[],
  x: number[],
  d: number[],
  fx: number,
  gx: number[],
  options?: HagerZhangOptions,
): LineSearchResult {
  const delta = options?.delta ?? 0.1;
  const sigma = options?.sigma ?? 0.9;
  const epsilon = options?.epsilon ?? 1e-6;
  const theta = options?.theta ?? 0.5;
  const gamma = options?.gamma ?? 0.66;
  const rho = options?.rho ?? 5.0;
  const maxBracketIter = options?.maxBracketIter ?? 50;
  const maxSecantIter = options?.maxSecantIter ?? 50;

  let functionCalls = 0;
  let gradientCalls = 0;

  const phi0 = fx;
  const dphi0 = dot(gx, d); // phi'(0) = g(x)' * d

  // Epsilon for approximate Wolfe (scaled by |f(x)|)
  const epsK = epsilon * Math.abs(phi0);

  // Helper: evaluate phi(alpha) = f(x + alpha*d)
  function evalPhi(alpha: number): number {
    functionCalls++;
    return f(addScaled(x, d, alpha));
  }

  // Helper: evaluate phi'(alpha) = grad(x + alpha*d)' * d
  function evalDphi(alpha: number): { val: number; gNew: number[] } {
    gradientCalls++;
    const gNew = grad(addScaled(x, d, alpha));
    return { val: dot(gNew, d), gNew };
  }

  // Check if alpha satisfies the (approximate) Wolfe conditions
  function satisfiesConditions(
    alpha: number, phiA: number, dphiA: number,
  ): boolean {
    const curvature = dphiA >= sigma * dphi0;
    if (!curvature) return false;

    // Standard Wolfe sufficient decrease
    if (phiA <= phi0 + delta * alpha * dphi0) return true;

    // Approximate Wolfe (for near-minimum regions)
    return phiA <= phi0 + epsK && dphiA <= (2 * delta - 1) * dphi0;
  }

  // --- Bracket phase ---
  // Find [aj, bj] where:
  //   phi(aj) <= phi(0) + epsK, phi'(aj) < 0
  //   phi(bj) >= phi(0) + epsK  OR  phi'(bj) >= 0
  let c = 1.0;
  let phiC = evalPhi(c);
  let dphiResult = evalDphi(c);
  let dphiC = dphiResult.val;
  let gNewC = dphiResult.gNew;

  // Quick check: does initial step satisfy conditions?
  if (satisfiesConditions(c, phiC, dphiC)) {
    return {
      alpha: c, fNew: phiC, gNew: gNewC,
      functionCalls, gradientCalls, success: true,
    };
  }

  let aj: number, bj: number;
  let phiAj: number, phiBj: number;
  let dphiAj: number, dphiBj: number;
  let bracketFound = true;

  if (phiC > phi0 + epsK || dphiC >= 0) {
    // Already have a bracket: [0, c]
    aj = 0; bj = c;
    phiAj = phi0; phiBj = phiC;
    dphiAj = dphi0; dphiBj = dphiC;
  } else {
    // Expand until we find a bracket
    aj = 0; bj = c;
    phiAj = phi0; phiBj = phiC;
    dphiAj = dphi0; dphiBj = dphiC;
    bracketFound = false;

    let cPrev = 0;
    let phiPrev = phi0;
    let dphiPrev = dphi0;

    for (let i = 0; i < maxBracketIter; i++) {
      cPrev = c;
      phiPrev = phiC;
      dphiPrev = dphiC;

      c = rho * c;
      phiC = evalPhi(c);
      dphiResult = evalDphi(c);
      dphiC = dphiResult.val;
      gNewC = dphiResult.gNew;

      if (satisfiesConditions(c, phiC, dphiC)) {
        return {
          alpha: c, fNew: phiC, gNew: gNewC,
          functionCalls, gradientCalls, success: true,
        };
      }

      if (phiC > phi0 + epsK || dphiC >= 0) {
        aj = cPrev; bj = c;
        phiAj = phiPrev; phiBj = phiC;
        dphiAj = dphiPrev; dphiBj = dphiC;
        bracketFound = true;
        break;
      }
    }

    if (!bracketFound) {
      // Bracket expansion exhausted — return best step found
      return {
        alpha: c, fNew: phiC, gNew: gNewC,
        functionCalls, gradientCalls, success: false,
      };
    }
  }

  // --- Secant/Bisection phase ---
  // Narrow [aj, bj] to find a point satisfying approximate Wolfe.
  let lastWidth = bj - aj;

  for (let i = 0; i < maxSecantIter; i++) {
    const width = bj - aj;

    // Bracket converged
    if (width < 1e-14) {
      const mid = (aj + bj) / 2;
      const phiMid = evalPhi(mid);
      const dphiMid = evalDphi(mid);
      return {
        alpha: mid, fNew: phiMid, gNew: dphiMid.gNew,
        functionCalls, gradientCalls, success: true,
      };
    }

    // Secant step: interpolate zero of phi' between aj and bj
    let cj: number;
    const denom = dphiBj - dphiAj;
    if (Math.abs(denom) > 1e-30) {
      cj = aj - dphiAj * (bj - aj) / denom;
      // Clamp to interior of bracket
      const margin = 1e-14 * width;
      cj = Math.max(aj + margin, Math.min(cj, bj - margin));
    } else {
      cj = aj + theta * (bj - aj);
    }

    const phiCj = evalPhi(cj);
    const dphiCjResult = evalDphi(cj);
    const dphiCj = dphiCjResult.val;

    if (satisfiesConditions(cj, phiCj, dphiCj)) {
      return {
        alpha: cj, fNew: phiCj, gNew: dphiCjResult.gNew,
        functionCalls, gradientCalls, success: true,
      };
    }

    // Update bracket based on where cj lands
    if (phiCj > phi0 + epsK || dphiCj >= 0) {
      bj = cj;
      phiBj = phiCj;
      dphiBj = dphiCj;
    } else {
      aj = cj;
      phiAj = phiCj;
      dphiAj = dphiCj;
    }

    // Bisection fallback if bracket didn't shrink enough
    const newWidth = bj - aj;
    if (newWidth > gamma * lastWidth) {
      const mid = aj + theta * (bj - aj);
      const phiMid = evalPhi(mid);
      const dphiMidResult = evalDphi(mid);
      const dphiMid = dphiMidResult.val;

      if (satisfiesConditions(mid, phiMid, dphiMid)) {
        return {
          alpha: mid, fNew: phiMid, gNew: dphiMidResult.gNew,
          functionCalls, gradientCalls, success: true,
        };
      }

      if (phiMid > phi0 + epsK || dphiMid >= 0) {
        bj = mid;
        phiBj = phiMid;
        dphiBj = dphiMid;
      } else {
        aj = mid;
        phiAj = phiMid;
        dphiAj = dphiMid;
      }
    }

    lastWidth = bj - aj;
  }

  // Secant phase exhausted — return best bound
  const bestPhi = evalPhi(aj);
  const bestDphi = evalDphi(aj);
  return {
    alpha: aj, fNew: bestPhi, gNew: bestDphi.gNew,
    functionCalls, gradientCalls, success: false,
  };
}
