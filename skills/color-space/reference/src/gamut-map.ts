/**
 * sRGB gamut mapping: detection and Oklch chroma reduction.
 *
 * Out-of-gamut colors (linear RGB components outside [0,1]) are mapped
 * back into gamut by reducing Oklch chroma while preserving lightness and hue.
 *
 * @node gamut-map
 * @depends-on color-types, srgb-linear, oklab, oklch
 * @contract gamut-map.test.ts
 * @provenance CSS Color Level 4, §13.2 (gamut mapping via Oklch chroma reduction)
 */

import type { SRgb, LinearRgb, Oklch } from "./color-types.ts";
import { srgb, oklch } from "./color-types.ts";
import { linearToSrgb, srgbToLinear } from "./srgb-linear.ts";
import { linearRgbToOklab, oklabToLinearRgb } from "./oklab.ts";
import { oklabToOklch, oklchToOklab } from "./oklch.ts";

const GAMUT_EPSILON = 0.001;
const MAX_ITERATIONS = 32;

/** Check whether a linear RGB color is within the sRGB gamut [0, 1]. */
export function isInGamut(color: LinearRgb): boolean {
  return (
    color.r >= -GAMUT_EPSILON &&
    color.r <= 1 + GAMUT_EPSILON &&
    color.g >= -GAMUT_EPSILON &&
    color.g <= 1 + GAMUT_EPSILON &&
    color.b >= -GAMUT_EPSILON &&
    color.b <= 1 + GAMUT_EPSILON
  );
}

/** Clamp a linear RGB color to sRGB gamut [0, 1]. */
export function clampToGamut(color: LinearRgb): SRgb {
  return linearToSrgb({
    space: "linear-rgb",
    r: Math.max(0, Math.min(1, color.r)),
    g: Math.max(0, Math.min(1, color.g)),
    b: Math.max(0, Math.min(1, color.b)),
  });
}

/**
 * Map an Oklch color into sRGB gamut by binary-search chroma reduction.
 *
 * Preserves lightness and hue while reducing chroma until the color
 * fits within sRGB [0,1]. Uses binary search for efficiency.
 */
export function gamutMapOklch(color: Oklch): SRgb {
  // Check if already in gamut
  const lab = oklchToOklab(color);
  const linear = oklabToLinearRgb(lab);
  if (isInGamut(linear)) {
    return clampToGamut(linear);
  }

  // Handle achromatic edge case
  if (color.c < GAMUT_EPSILON) {
    return clampToGamut(linear);
  }

  // Binary search on chroma
  let lo = 0;
  let hi = color.c;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const candidate = oklch(color.l, mid, color.h);
    const candidateLab = oklchToOklab(candidate);
    const candidateLinear = oklabToLinearRgb(candidateLab);

    if (isInGamut(candidateLinear)) {
      lo = mid;
    } else {
      hi = mid;
    }

    if (hi - lo < GAMUT_EPSILON) break;
  }

  const mapped = oklch(color.l, lo, color.h);
  const mappedLab = oklchToOklab(mapped);
  const mappedLinear = oklabToLinearRgb(mappedLab);
  return clampToGamut(mappedLinear);
}
