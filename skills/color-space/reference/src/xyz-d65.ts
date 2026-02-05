/**
 * Linear RGB ↔ CIE XYZ D65 conversion.
 *
 * Uses the exact 3×3 matrix derived from the sRGB primaries and D65 white point
 * per IEC 61966-2-1:1999.
 *
 * @node xyz-d65
 * @depends-on color-types, srgb-linear
 * @contract xyz-d65.test.ts
 * @provenance IEC 61966-2-1:1999, derived from sRGB primaries and D65 white point
 */

import type { LinearRgb, XyzD65 } from "./color-types.ts";
import { linearRgb, xyzD65 } from "./color-types.ts";

/** sRGB linear → XYZ D65 matrix (row-major). */
const M = [
  [0.4123907992659595, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];

/** XYZ D65 → sRGB linear matrix (inverse of M, row-major). */
const M_INV = [
  [3.2409699419045226, -1.5373831775700939, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397696064091520, 1.0569715142428786],
];

/** Convert linear RGB to CIE XYZ D65. */
export function linearRgbToXyzD65(color: LinearRgb): XyzD65 {
  const r = color.r, g = color.g, b = color.b;
  return xyzD65(
    M[0][0] * r + M[0][1] * g + M[0][2] * b,
    M[1][0] * r + M[1][1] * g + M[1][2] * b,
    M[2][0] * r + M[2][1] * g + M[2][2] * b,
  );
}

/** Convert CIE XYZ D65 to linear RGB. */
export function xyzD65ToLinearRgb(color: XyzD65): LinearRgb {
  const x = color.x, y = color.y, z = color.z;
  return linearRgb(
    M_INV[0][0] * x + M_INV[0][1] * y + M_INV[0][2] * z,
    M_INV[1][0] * x + M_INV[1][1] * y + M_INV[1][2] * z,
    M_INV[2][0] * x + M_INV[2][1] * y + M_INV[2][2] * z,
  );
}
