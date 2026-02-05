/**
 * CIE XYZ D65 ↔ CIELAB D65 conversion.
 *
 * Uses the CIE 15:2004 cube root transfer function with exact ε and κ constants.
 * The D65 reference white is [0.95047, 1.0, 1.08883].
 *
 * @node lab-d65
 * @depends-on color-types, xyz-d65
 * @contract lab-d65.test.ts
 * @provenance CIE 15:2004, 2-degree standard observer, D65 illuminant
 */

import type { XyzD65, LabD65 } from "./color-types.ts";
import { xyzD65, labD65 } from "./color-types.ts";

/** D65 reference white (2-degree observer). */
const D65_WHITE = { x: 0.95047, y: 1.0, z: 1.08883 };

/** CIE epsilon: 216/24389. */
const EPSILON = 216 / 24389;

/** CIE kappa: 24389/27. */
const KAPPA = 24389 / 27;

/** Forward transfer function: f(t) for XYZ → Lab. */
function labF(t: number): number {
  if (t > EPSILON) {
    return Math.cbrt(t);
  }
  return (KAPPA * t + 16) / 116;
}

/** Inverse transfer function: f⁻¹(t) for Lab → XYZ. */
function labFInv(t: number): number {
  const t3 = t * t * t;
  if (t3 > EPSILON) {
    return t3;
  }
  return (116 * t - 16) / KAPPA;
}

/** Convert CIE XYZ D65 to CIELAB D65. */
export function xyzD65ToLabD65(color: XyzD65): LabD65 {
  const fx = labF(color.x / D65_WHITE.x);
  const fy = labF(color.y / D65_WHITE.y);
  const fz = labF(color.z / D65_WHITE.z);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return labD65(l, a, b);
}

/** Convert CIELAB D65 to CIE XYZ D65. */
export function labD65ToXyzD65(color: LabD65): XyzD65 {
  const fy = (color.l + 16) / 116;
  const fx = color.a / 500 + fy;
  const fz = fy - color.b / 200;

  return xyzD65(
    labFInv(fx) * D65_WHITE.x,
    labFInv(fy) * D65_WHITE.y,
    labFInv(fz) * D65_WHITE.z,
  );
}
