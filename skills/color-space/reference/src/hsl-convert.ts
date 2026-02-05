/**
 * sRGB ↔ HSL conversion.
 *
 * Implements the standard HSL model with correct handling of the
 * achromatic case (S=0 → hue is 0) and hue modulo 360.
 *
 * @node hsl-convert
 * @depends-on color-types
 * @contract hsl-convert.test.ts
 * @provenance CSS Color Level 4, §5; W3C algorithm
 */

import type { SRgb, Hsl } from "./color-types.ts";
import { srgb, hsl } from "./color-types.ts";

/** Convert an sRGB color to HSL. */
export function srgbToHsl(color: SRgb): Hsl {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) {
    return hsl(0, 0, l);
  }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }

  return hsl(h % 360, s, l);
}

/** Convert an HSL color to sRGB. */
export function hslToSrgb(color: Hsl): SRgb {
  const h = color.h;
  const s = color.s;
  const l = color.l;

  if (s === 0) {
    return srgb(l, l, l);
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return srgb(
    hueToRgb(p, q, h + 120),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 120),
  );
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 360;
  if (t > 360) t -= 360;
  if (t < 60) return p + (q - p) * t / 60;
  if (t < 180) return q;
  if (t < 240) return p + (q - p) * (240 - t) / 60;
  return p;
}
