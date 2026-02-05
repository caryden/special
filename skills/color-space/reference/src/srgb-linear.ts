/**
 * sRGB ↔ Linear RGB gamma transfer function.
 *
 * Implements the IEC 61966-2-1:1999 transfer function with the exact
 * threshold of 0.04045 on the sRGB side (0.0031308 on the linear side).
 *
 * @node srgb-linear
 * @depends-on color-types
 * @contract srgb-linear.test.ts
 * @provenance IEC 61966-2-1:1999, clause 4.2
 * @hint precision: The threshold 0.04045 and slope 12.92 are exact per spec.
 *       Do not use 0.003130 as the sRGB-side threshold — that is the linear-side value.
 */

import type { SRgb, LinearRgb } from "./color-types.ts";
import { srgb, linearRgb } from "./color-types.ts";

/**
 * Convert a single sRGB component to linear.
 * Uses linear segment below 0.04045, gamma curve above.
 */
export function srgbToLinearComponent(c: number): number {
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert a single linear component to sRGB.
 * Uses linear segment below 0.0031308, gamma curve above.
 */
export function linearToSrgbComponent(c: number): number {
  if (c <= 0.0031308) {
    return c * 12.92;
  }
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Convert an sRGB color to linear RGB. */
export function srgbToLinear(color: SRgb): LinearRgb {
  return linearRgb(
    srgbToLinearComponent(color.r),
    srgbToLinearComponent(color.g),
    srgbToLinearComponent(color.b),
  );
}

/** Convert a linear RGB color to sRGB. */
export function linearToSrgb(color: LinearRgb): SRgb {
  return srgb(
    linearToSrgbComponent(color.r),
    linearToSrgbComponent(color.g),
    linearToSrgbComponent(color.b),
  );
}
