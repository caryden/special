/**
 * Universal color space converter.
 *
 * Converts between any two supported color spaces by routing through
 * intermediate representations. All conversions go through linear RGB
 * or XYZ D65 as the hub.
 *
 * @node convert
 * @depends-on color-types, srgb-linear, hsl-convert, hwb-convert, xyz-d65, xyz-d50, oklab, oklch, lab-d65, lab-d50, lch-d65
 * @contract convert.test.ts
 */

import type { Color, ColorSpace, LinearRgb, XyzD65 } from "./color-types.ts";
import * as T from "./color-types.ts";
import { srgbToLinear, linearToSrgb } from "./srgb-linear.ts";
import { srgbToHsl, hslToSrgb } from "./hsl-convert.ts";
import { srgbToHwb, hwbToSrgb } from "./hwb-convert.ts";
import { linearRgbToXyzD65, xyzD65ToLinearRgb } from "./xyz-d65.ts";
import { xyzD65ToXyzD50, xyzD50ToXyzD65 } from "./xyz-d50.ts";
import { linearRgbToOklab, oklabToLinearRgb } from "./oklab.ts";
import { oklabToOklch, oklchToOklab } from "./oklch.ts";
import { xyzD65ToLabD65, labD65ToXyzD65 } from "./lab-d65.ts";
import { xyzD50ToLabD50, labD50ToXyzD50 } from "./lab-d50.ts";
import { labD65ToLchD65, lchD65ToLabD65 } from "./lch-d65.ts";

/**
 * Convert a color from one space to another.
 *
 * Routing strategy:
 * - sRGB/HSL/HWB go through sRGB ↔ linear RGB
 * - Linear RGB is the hub for Oklab and XYZ D65
 * - XYZ D65 is the hub for Lab D65, LCH D65, XYZ D50, Lab D50
 */
export function convert<S extends ColorSpace>(color: Color, to: S): Extract<Color, { space: S }> {
  // Identity
  if (color.space === to) {
    return color as Extract<Color, { space: S }>;
  }

  // Convert to linear RGB first (the universal hub)
  const linear = toLinearRgb(color);

  // Convert from linear RGB to target
  return fromLinearRgb(linear, to);
}

/** Convert any color to linear RGB. */
function toLinearRgb(color: Color): LinearRgb {
  switch (color.space) {
    case "linear-rgb":
      return color;
    case "srgb":
      return srgbToLinear(color);
    case "hsl":
      return srgbToLinear(hslToSrgb(color));
    case "hwb":
      return srgbToLinear(hwbToSrgb(color));
    case "xyz-d65":
      return xyzD65ToLinearRgb(color);
    case "xyz-d50":
      return xyzD65ToLinearRgb(xyzD50ToXyzD65(color));
    case "oklab":
      return oklabToLinearRgb(color);
    case "oklch":
      return oklabToLinearRgb(oklchToOklab(color));
    case "lab-d65":
      return xyzD65ToLinearRgb(labD65ToXyzD65(color));
    case "lab-d50":
      return xyzD65ToLinearRgb(xyzD50ToXyzD65(labD50ToXyzD50(color)));
    case "lch-d65":
      return xyzD65ToLinearRgb(labD65ToXyzD65(lchD65ToLabD65(color)));
  }
}

/** Convert linear RGB to any target color space. */
function fromLinearRgb<S extends ColorSpace>(linear: LinearRgb, to: S): Extract<Color, { space: S }> {
  let result: Color;

  switch (to) {
    case "linear-rgb":
      result = linear;
      break;
    case "srgb":
      result = linearToSrgb(linear);
      break;
    case "hsl":
      result = srgbToHsl(linearToSrgb(linear));
      break;
    case "hwb":
      result = srgbToHwb(linearToSrgb(linear));
      break;
    case "xyz-d65":
      result = linearRgbToXyzD65(linear);
      break;
    case "xyz-d50":
      result = xyzD65ToXyzD50(linearRgbToXyzD65(linear));
      break;
    case "oklab":
      result = linearRgbToOklab(linear);
      break;
    case "oklch":
      result = oklabToOklch(linearRgbToOklab(linear));
      break;
    case "lab-d65":
      result = xyzD65ToLabD65(linearRgbToXyzD65(linear));
      break;
    case "lab-d50":
      result = xyzD50ToLabD50(xyzD65ToXyzD50(linearRgbToXyzD65(linear)));
      break;
    case "lch-d65":
      result = labD65ToLchD65(xyzD65ToLabD65(linearRgbToXyzD65(linear)));
      break;
    default:
      throw new Error(`Unsupported target color space: ${to}`);
  }

  return result as Extract<Color, { space: S }>;
}
