/**
 * CIELAB D65 ↔ LCH D65 (polar form) conversion.
 *
 * LCH is the cylindrical representation of CIELAB: Lightness, Chroma, Hue.
 * Achromatic colors (C ≈ 0) have H = 0 by convention.
 *
 * @node lch-d65
 * @depends-on color-types, lab-d65
 * @contract lch-d65.test.ts
 * @provenance CIE 15:2004
 */

import type { LabD65, LchD65 } from "./color-types.ts";
import { labD65, lchD65 } from "./color-types.ts";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/** Convert CIELAB D65 to LCH D65. */
export function labD65ToLchD65(color: LabD65): LchD65 {
  const c = Math.sqrt(color.a * color.a + color.b * color.b);

  if (c < 1e-10) {
    return lchD65(color.l, 0, 0);
  }

  let h = Math.atan2(color.b, color.a) * RAD_TO_DEG;
  if (h < 0) h += 360;

  return lchD65(color.l, c, h);
}

/** Convert LCH D65 to CIELAB D65. */
export function lchD65ToLabD65(color: LchD65): LabD65 {
  if (color.c < 1e-10) {
    return labD65(color.l, 0, 0);
  }

  const hRad = color.h * DEG_TO_RAD;
  return labD65(
    color.l,
    color.c * Math.cos(hRad),
    color.c * Math.sin(hRad),
  );
}
