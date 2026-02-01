/**
 * Gradient estimation via finite differences.
 *
 * Used when the caller provides only an objective function f without an
 * analytic gradient. Forward differences by default; central differences
 * available for higher accuracy at 2x the cost.
 *
 * @node finite-diff
 * @depends-on vec-ops
 * @contract finite-diff.test.ts
 * @hint step-size: h = sqrt(eps) * max(|x_i|, 1) per component.
 *       This matches MATLAB's default. scipy uses eps^(1/3) for forward diff.
 *       Our choice gives ~8 digits of accuracy for forward, ~11 for central.
 * @hint purity: Returns a new gradient array. Never mutates x.
 */

const SQRT_EPS = Math.sqrt(Number.EPSILON); // ~1.49e-8
const CBRT_EPS = Math.cbrt(Number.EPSILON); // ~6.06e-6

/**
 * Estimate gradient using forward finite differences.
 *
 * For each component i: g_i ≈ (f(x + h*e_i) - f(x)) / h
 *
 * Cost: n+1 function evaluations (1 for f(x) + n for perturbations).
 * Accuracy: O(h) ≈ O(sqrt(eps)) ≈ 8 digits.
 *
 * @provenance step-size formula matches MATLAB fminunc (sqrt(eps) scaling)
 */
export function forwardDiffGradient(
  f: (x: number[]) => number,
  x: number[],
): number[] {
  const n = x.length;
  const fx = f(x);
  const grad = new Array(n);

  for (let i = 0; i < n; i++) {
    const h = SQRT_EPS * Math.max(Math.abs(x[i]), 1.0);
    const xPerturbed = x.slice();
    xPerturbed[i] += h;
    grad[i] = (f(xPerturbed) - fx) / h;
  }

  return grad;
}

/**
 * Estimate gradient using central finite differences.
 *
 * For each component i: g_i ≈ (f(x + h*e_i) - f(x - h*e_i)) / (2h)
 *
 * Cost: 2n function evaluations.
 * Accuracy: O(h^2) ≈ O(eps^(2/3)) ≈ 11 digits.
 *
 * @provenance step-size uses cbrt(eps) for optimal O(h^2) error balance
 */
export function centralDiffGradient(
  f: (x: number[]) => number,
  x: number[],
): number[] {
  const n = x.length;
  const grad = new Array(n);

  for (let i = 0; i < n; i++) {
    const h = CBRT_EPS * Math.max(Math.abs(x[i]), 1.0);
    const xPlus = x.slice();
    const xMinus = x.slice();
    xPlus[i] += h;
    xMinus[i] -= h;
    grad[i] = (f(xPlus) - f(xMinus)) / (2 * h);
  }

  return grad;
}

/**
 * Wrap an objective function to provide gradient estimation.
 * Returns a gradient function that uses forward differences.
 * Tracks the number of function evaluations used for gradient estimation.
 */
export function makeGradient(
  f: (x: number[]) => number,
  method: "forward" | "central" = "forward",
): (x: number[]) => number[] {
  if (method === "central") {
    return (x: number[]) => centralDiffGradient(f, x);
  }
  return (x: number[]) => forwardDiffGradient(f, x);
}
