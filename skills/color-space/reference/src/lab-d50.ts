/**
 * CIE XYZ D50 ↔ CIELAB D50 conversion.
 *
 * Same formula as lab-d65 but with the D50 reference white point.
 * Used for ICC profile workflows.
 *
 * @node lab-d50
 * @depends-on color-types, xyz-d50
 * @contract lab-d50.test.ts
 * @provenance CIE 15:2004, ICC specification, D50 illuminant
 */

import type { XyzD50, LabD50 } from "./color-types.ts";
import { xyzD50, labD50 } from "./color-types.ts";

/** D50 reference white. */
const D50_WHITE = { x: 0.96422, y: 1.0, z: 0.82521 };

/** CIE epsilon: 216/24389. */
const EPSILON = 216 / 24389;

/** CIE kappa: 24389/27. */
const KAPPA = 24389 / 27;

function labF(t: number): number {
  if (t > EPSILON) {
    return Math.cbrt(t);
  }
  return (KAPPA * t + 16) / 116;
}

function labFInv(t: number): number {
  const t3 = t * t * t;
  if (t3 > EPSILON) {
    return t3;
  }
  return (116 * t - 16) / KAPPA;
}

/** Convert CIE XYZ D50 to CIELAB D50. */
export function xyzD50ToLabD50(color: XyzD50): LabD50 {
  const fx = labF(color.x / D50_WHITE.x);
  const fy = labF(color.y / D50_WHITE.y);
  const fz = labF(color.z / D50_WHITE.z);

  return labD50(
    116 * fy - 16,
    500 * (fx - fy),
    200 * (fy - fz),
  );
}

/** Convert CIELAB D50 to CIE XYZ D50. */
export function labD50ToXyzD50(color: LabD50): XyzD50 {
  const fy = (color.l + 16) / 116;
  const fx = color.a / 500 + fy;
  const fz = fy - color.b / 200;

  return xyzD50(
    labFInv(fx) * D50_WHITE.x,
    labFInv(fy) * D50_WHITE.y,
    labFInv(fz) * D50_WHITE.z,
  );
}
