/**
 * sRGB ↔ HWB conversion.
 *
 * HWB (Hue, Whiteness, Blackness) is an alternative to HSL designed for
 * human color selection. When whiteness + blackness ≥ 1, the color is
 * achromatic and must be normalized.
 *
 * @node hwb-convert
 * @depends-on color-types
 * @contract hwb-convert.test.ts
 * @provenance CSS Color Level 4, §7.2
 */

import type { SRgb, Hwb } from "./color-types.ts";
import { srgb, hwb } from "./color-types.ts";

/** Convert an sRGB color to HWB. */
export function srgbToHwb(color: SRgb): Hwb {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const w = min;
  const bl = 1 - max;

  let h: number;
  if (d === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }

  return hwb(h % 360, w, bl);
}

/** Convert an HWB color to sRGB. */
export function hwbToSrgb(color: Hwb): SRgb {
  const w = color.w;
  const bl = color.b;

  // Normalize when whiteness + blackness >= 1
  const sum = w + bl;
  if (sum >= 1) {
    const gray = w / sum;
    return srgb(gray, gray, gray);
  }

  // Convert via hue to RGB, then scale by whiteness and blackness
  const h = color.h;
  const ratio = 1 - w - bl;

  // Compute pure hue RGB component
  const rgb = hueToRgb(h);

  return srgb(
    rgb[0] * ratio + w,
    rgb[1] * ratio + w,
    rgb[2] * ratio + w,
  );
}

/** Convert a hue angle (0-360) to an RGB triplet for a fully saturated color. */
function hueToRgb(h: number): [number, number, number] {
  const hNorm = ((h % 360) + 360) % 360;
  const sector = hNorm / 60;
  const f = sector - Math.floor(sector);
  const i = Math.floor(sector) % 6;

  switch (i) {
    case 0: return [1, f, 0];
    case 1: return [1 - f, 1, 0];
    case 2: return [0, 1, f];
    case 3: return [0, 1 - f, 1];
    case 4: return [f, 0, 1];
    default: return [1, 0, 1 - f];
  }
}
