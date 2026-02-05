/**
 * Linear RGB ↔ Oklab conversion.
 *
 * Implements Björn Ottosson's Oklab perceptual color space using the exact
 * M1 (linear sRGB → LMS) and M2 (LMS^(1/3) → Lab) matrices.
 *
 * @node oklab
 * @depends-on color-types, srgb-linear
 * @contract oklab.test.ts
 * @provenance Björn Ottosson, 2020-12-24, https://bottosson.github.io/posts/oklab/
 * @hint precision: The M1 and M2 matrices have 10 significant digits. Use all of them.
 */

import type { LinearRgb, Oklab } from "./color-types.ts";
import { linearRgb, oklab } from "./color-types.ts";

/** M1: linear sRGB → LMS (row-major). */
const M1 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];

/** M2: LMS^(1/3) → Lab (row-major). */
const M2 = [
  [0.2104542553, 0.7936177850, -0.0040720468],
  [1.9779984951, -2.4285922050, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.8086757660],
];

/** M1 inverse: LMS → linear sRGB (row-major). */
const M1_INV = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.7076147010],
];

/** M2 inverse: Lab → LMS^(1/3) (row-major). */
const M2_INV = [
  [1.0, 0.3963377774, 0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.2914855480],
];

/** Convert linear RGB to Oklab. */
export function linearRgbToOklab(color: LinearRgb): Oklab {
  const r = color.r, g = color.g, b = color.b;

  // Linear sRGB → LMS
  const l = M1[0][0] * r + M1[0][1] * g + M1[0][2] * b;
  const m = M1[1][0] * r + M1[1][1] * g + M1[1][2] * b;
  const s = M1[2][0] * r + M1[2][1] * g + M1[2][2] * b;

  // Cube root
  const lc = Math.cbrt(l);
  const mc = Math.cbrt(m);
  const sc = Math.cbrt(s);

  // LMS^(1/3) → Lab
  return oklab(
    M2[0][0] * lc + M2[0][1] * mc + M2[0][2] * sc,
    M2[1][0] * lc + M2[1][1] * mc + M2[1][2] * sc,
    M2[2][0] * lc + M2[2][1] * mc + M2[2][2] * sc,
  );
}

/** Convert Oklab to linear RGB. */
export function oklabToLinearRgb(color: Oklab): LinearRgb {
  const L = color.l, a = color.a, b = color.b;

  // Lab → LMS^(1/3)
  const lc = M2_INV[0][0] * L + M2_INV[0][1] * a + M2_INV[0][2] * b;
  const mc = M2_INV[1][0] * L + M2_INV[1][1] * a + M2_INV[1][2] * b;
  const sc = M2_INV[2][0] * L + M2_INV[2][1] * a + M2_INV[2][2] * b;

  // Cube (undo cube root)
  const l = lc * lc * lc;
  const m = mc * mc * mc;
  const s = sc * sc * sc;

  // LMS → linear sRGB
  return linearRgb(
    M1_INV[0][0] * l + M1_INV[0][1] * m + M1_INV[0][2] * s,
    M1_INV[1][0] * l + M1_INV[1][1] * m + M1_INV[1][2] * s,
    M1_INV[2][0] * l + M1_INV[2][1] * m + M1_INV[2][2] * s,
  );
}
