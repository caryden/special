/**
 * Typed color value → CSS color string serializer.
 *
 * Converts any Color type to its CSS string representation.
 *
 * @node serialize-color
 * @depends-on color-types
 * @contract serialize-color.test.ts
 * @provenance CSS Color Level 4
 */

import type { Color } from "./color-types.ts";

/**
 * Serialize a typed color value to a CSS color string.
 *
 * Output formats:
 * - sRGB: `rgb(R, G, B)` with 0-255 integer values
 * - linear-rgb: `color(srgb-linear R G B)` with decimal values
 * - HSL: `hsl(H, S%, L%)`
 * - HWB: `hwb(H W% B%)`
 * - XYZ D65: `color(xyz-d65 X Y Z)`
 * - XYZ D50: `color(xyz-d50 X Y Z)`
 * - Lab D65: `lab(L a b)`
 * - Lab D50: `lab(L a b)` (CSS lab() uses D50)
 * - LCH D65: `lch(L C H)`
 * - Oklab: `oklab(L a b)`
 * - Oklch: `oklch(L C H)`
 */
export function serializeColor(color: Color): string {
  switch (color.space) {
    case "srgb":
      return `rgb(${round255(color.r)}, ${round255(color.g)}, ${round255(color.b)})`;
    case "linear-rgb":
      return `color(srgb-linear ${roundN(color.r)} ${roundN(color.g)} ${roundN(color.b)})`;
    case "hsl":
      return `hsl(${roundN(color.h)}, ${roundPct(color.s)}%, ${roundPct(color.l)}%)`;
    case "hwb":
      return `hwb(${roundN(color.h)} ${roundPct(color.w)}% ${roundPct(color.b)}%)`;
    case "xyz-d65":
      return `color(xyz-d65 ${roundN(color.x)} ${roundN(color.y)} ${roundN(color.z)})`;
    case "xyz-d50":
      return `color(xyz-d50 ${roundN(color.x)} ${roundN(color.y)} ${roundN(color.z)})`;
    case "lab-d65":
      return `lab(${roundN(color.l)} ${roundN(color.a)} ${roundN(color.b)})`;
    case "lab-d50":
      return `lab(${roundN(color.l)} ${roundN(color.a)} ${roundN(color.b)})`;
    case "lch-d65":
      return `lch(${roundN(color.l)} ${roundN(color.c)} ${roundN(color.h)})`;
    case "oklab":
      return `oklab(${roundN(color.l)} ${roundN(color.a)} ${roundN(color.b)})`;
    case "oklch":
      return `oklch(${roundN(color.l)} ${roundN(color.c)} ${roundN(color.h)})`;
  }
}

/** Round to 0-255 integer for sRGB output. */
function round255(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

/** Round to 4 decimal places. */
function roundN(value: number): string {
  return parseFloat(value.toFixed(4)).toString();
}

/** Round percentage to 2 decimal places. */
function roundPct(value: number): string {
  return parseFloat((value * 100).toFixed(2)).toString();
}
