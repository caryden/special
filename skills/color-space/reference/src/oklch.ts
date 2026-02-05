/**
 * Oklab ↔ Oklch (polar form) conversion.
 *
 * Oklch is the cylindrical representation of Oklab, using lightness (L),
 * chroma (C), and hue (H in degrees). Achromatic colors (C ≈ 0) have H = 0.
 *
 * @node oklch
 * @depends-on color-types, oklab
 * @contract oklch.test.ts
 * @provenance Björn Ottosson, https://bottosson.github.io/posts/oklab/
 */

import type { Oklab, Oklch } from "./color-types.ts";
import { oklab, oklch } from "./color-types.ts";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/** Convert Oklab to Oklch. */
export function oklabToOklch(color: Oklab): Oklch {
  const c = Math.sqrt(color.a * color.a + color.b * color.b);

  // Achromatic: when chroma is near zero, hue is undefined → 0
  if (c < 1e-10) {
    return oklch(color.l, 0, 0);
  }

  let h = Math.atan2(color.b, color.a) * RAD_TO_DEG;
  if (h < 0) h += 360;

  return oklch(color.l, c, h);
}

/** Convert Oklch to Oklab. */
export function oklchToOklab(color: Oklch): Oklab {
  if (color.c < 1e-10) {
    return oklab(color.l, 0, 0);
  }

  const hRad = color.h * DEG_TO_RAD;
  return oklab(
    color.l,
    color.c * Math.cos(hRad),
    color.c * Math.sin(hRad),
  );
}
