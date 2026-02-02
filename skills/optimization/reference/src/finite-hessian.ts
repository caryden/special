/**
 * Hessian estimation via finite differences.
 *
 * Provides second-order derivative approximation for Newton-type methods.
 * Two approaches: full Hessian matrix (for Newton) and Hessian-vector
 * product (for Hessian-free / CG-Newton methods).
 *
 * @node finite-hessian
 * @depends-on vec-ops, finite-diff
 * @contract finite-hessian.test.ts
 * @hint step-size: h = eps^(1/4) * max(|x_i|, 1) for O(h^2) accuracy
 *       in the central difference Hessian formula.
 * @hint symmetry: Only upper triangle is computed; lower is filled by symmetry.
 * @provenance Central difference Hessian: Nocedal & Wright, Numerical Optimization, Ch. 8
 * @provenance Hessian-vector product: Nocedal & Wright, Section 8.1 (finite-diff of gradient)
 */

const FOURTH_ROOT_EPS = Math.pow(Number.EPSILON, 0.25); // ~1.22e-4

/**
 * Estimate the Hessian matrix using central finite differences.
 *
 * Diagonal: H_ii ≈ (f(x+h*e_i) - 2f(x) + f(x-h*e_i)) / h^2
 * Off-diag: H_ij ≈ (f(x+h*e_i+h*e_j) - f(x+h*e_i-h*e_j)
 *                   - f(x-h*e_i+h*e_j) + f(x-h*e_i-h*e_j)) / (4h^2)
 *
 * Cost: 1 + 2n + 2*n*(n-1)/2 = 1 + n^2 function evaluations.
 *
 * @param f - Objective function
 * @param x - Point at which to evaluate the Hessian
 * @returns n×n symmetric Hessian matrix (number[][])
 *
 * @provenance Nocedal & Wright, Numerical Optimization, Section 8.1
 * @provenance Step size eps^(1/4) for optimal O(h^2) error with central differences
 */
export function finiteDiffHessian(
  f: (x: number[]) => number,
  x: number[],
): number[][] {
  const n = x.length;
  const fx = f(x);
  const H: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  // Compute step sizes for each dimension
  const h: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    h[i] = FOURTH_ROOT_EPS * Math.max(Math.abs(x[i]), 1.0);
  }

  // Diagonal elements: (f(x+h*e_i) - 2*f(x) + f(x-h*e_i)) / h^2
  for (let i = 0; i < n; i++) {
    const xPlus = x.slice();
    const xMinus = x.slice();
    xPlus[i] += h[i];
    xMinus[i] -= h[i];
    H[i][i] = (f(xPlus) - 2 * fx + f(xMinus)) / (h[i] * h[i]);
  }

  // Off-diagonal elements (upper triangle, then mirror)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const xpp = x.slice(); xpp[i] += h[i]; xpp[j] += h[j];
      const xpm = x.slice(); xpm[i] += h[i]; xpm[j] -= h[j];
      const xmp = x.slice(); xmp[i] -= h[i]; xmp[j] += h[j];
      const xmm = x.slice(); xmm[i] -= h[i]; xmm[j] -= h[j];
      const val = (f(xpp) - f(xpm) - f(xmp) + f(xmm)) / (4 * h[i] * h[j]);
      H[i][j] = val;
      H[j][i] = val;
    }
  }

  return H;
}

/**
 * Estimate Hessian-vector product H*v using finite differences of the gradient.
 *
 * Hv ≈ (grad(x + h*v) - grad(x)) / h
 *
 * Cost: 1 gradient evaluation (plus the one at x that the caller already has).
 * This is much cheaper than forming the full Hessian for large n.
 *
 * @param grad - Gradient function
 * @param x - Current point
 * @param v - Direction vector
 * @param gx - grad(x), precomputed
 * @returns Approximate H*v vector
 *
 * @provenance Nocedal & Wright, Section 8.1 (Hessian-free approach)
 */
export function hessianVectorProduct(
  grad: (x: number[]) => number[],
  x: number[],
  v: number[],
  gx: number[],
): number[] {
  const n = x.length;

  // Step size based on norm of v
  let vNorm = 0;
  for (let i = 0; i < n; i++) vNorm += v[i] * v[i];
  vNorm = Math.sqrt(vNorm);

  const h = FOURTH_ROOT_EPS * Math.max(vNorm, 1.0);

  // Perturb x along v
  const xPlusHv = new Array(n);
  for (let i = 0; i < n; i++) {
    xPlusHv[i] = x[i] + h * v[i];
  }

  const gPerturbed = grad(xPlusHv);

  // Hv ≈ (g(x + h*v) - g(x)) / h
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = (gPerturbed[i] - gx[i]) / h;
  }

  return result;
}
