/**
 * CIE XYZ D65 ↔ CIE XYZ D50 chromatic adaptation.
 *
 * Uses the Bradford chromatic adaptation transform matrix from the ICC specification
 * to convert between D65 and D50 illuminants.
 *
 * @node xyz-d50
 * @depends-on color-types, xyz-d65
 * @contract xyz-d50.test.ts
 * @provenance ICC specification, Bradford chromatic adaptation
 */

import type { XyzD65, XyzD50 } from "./color-types.ts";
import { xyzD65, xyzD50 } from "./color-types.ts";

/** Bradford matrix: XYZ D65 → XYZ D50 (row-major). */
const M = [
  [1.0479298208405488, 0.022946793341019088, -0.05019222954313557],
  [0.029627815688159344, 0.990434429065321, -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895, 0.7521316354461029],
];

/** Inverse Bradford matrix: XYZ D50 → XYZ D65 (row-major). */
const M_INV = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580106629, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];

/** Convert CIE XYZ D65 to CIE XYZ D50. */
export function xyzD65ToXyzD50(color: XyzD65): XyzD50 {
  const x = color.x, y = color.y, z = color.z;
  return xyzD50(
    M[0][0] * x + M[0][1] * y + M[0][2] * z,
    M[1][0] * x + M[1][1] * y + M[1][2] * z,
    M[2][0] * x + M[2][1] * y + M[2][2] * z,
  );
}

/** Convert CIE XYZ D50 to CIE XYZ D65. */
export function xyzD50ToXyzD65(color: XyzD50): XyzD65 {
  const x = color.x, y = color.y, z = color.z;
  return xyzD65(
    M_INV[0][0] * x + M_INV[0][1] * y + M_INV[0][2] * z,
    M_INV[1][0] * x + M_INV[1][1] * y + M_INV[1][2] * z,
    M_INV[2][0] * x + M_INV[2][1] * y + M_INV[2][2] * z,
  );
}
