/**
 * CSS color string → typed color value parser.
 *
 * Supports hex (#RGB, #RRGGBB, #RGBA, #RRGGBBAA), named colors,
 * rgb()/rgba(), hsl()/hsla(), and the oklch()/oklab() CSS functions.
 *
 * @node parse-color
 * @depends-on color-types
 * @contract parse-color.test.ts
 * @provenance CSS Color Level 4, §4-§8
 */

import type { Color } from "./color-types.ts";
import { srgb, hsl, hwb, oklab, oklch } from "./color-types.ts";

/** CSS named colors (lowercase). Subset of the 148 CSS named colors. */
const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  maroon: [128, 0, 0],
  olive: [128, 128, 0],
  lime: [0, 255, 0],
  aqua: [0, 255, 255],
  teal: [0, 128, 128],
  navy: [0, 0, 128],
  fuchsia: [255, 0, 255],
  purple: [128, 0, 128],
  orange: [255, 165, 0],
  pink: [255, 192, 203],
  brown: [165, 42, 42],
  coral: [255, 127, 80],
  crimson: [220, 20, 60],
  gold: [255, 215, 0],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  plum: [221, 160, 221],
  salmon: [250, 128, 114],
  sienna: [160, 82, 45],
  tan: [210, 180, 140],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
};

/**
 * Parse a CSS color string into a typed color value.
 * Throws on unparseable input.
 */
export function parseColor(input: string): Color {
  const s = input.trim().toLowerCase();

  // Named colors
  if (NAMED_COLORS[s]) {
    const [r, g, b] = NAMED_COLORS[s];
    return srgb(r / 255, g / 255, b / 255);
  }

  // Hex
  if (s.startsWith("#")) {
    return parseHex(s);
  }

  // Functional notation
  if (s.startsWith("rgb")) return parseRgb(s);
  if (s.startsWith("hsl")) return parseHsl(s);
  if (s.startsWith("hwb")) return parseHwb(s);
  if (s.startsWith("oklab")) return parseOklab(s);
  if (s.startsWith("oklch")) return parseOklch(s);

  throw new Error(`Cannot parse color: "${input}"`);
}

function parseHex(s: string): Color {
  const hex = s.slice(1);
  let r: number, g: number, b: number;

  if (hex.length === 3 || hex.length === 4) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6 || hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    throw new Error(`Invalid hex color: "${s}"`);
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Invalid hex color: "${s}"`);
  }

  return srgb(r / 255, g / 255, b / 255);
}

function parseRgb(s: string): Color {
  const match = s.match(
    /^rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/,
  );
  if (!match) throw new Error(`Invalid rgb() color: "${s}"`);

  const r = parseComponent(match[1], 255);
  const g = parseComponent(match[2], 255);
  const b = parseComponent(match[3], 255);

  return srgb(r, g, b);
}

function parseHsl(s: string): Color {
  const match = s.match(
    /^hsla?\(\s*([\d.]+)(deg|rad|turn)?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/,
  );
  if (!match) throw new Error(`Invalid hsl() color: "${s}"`);

  const h = parseAngle(match[1], match[2]);
  const sat = parseFloat(match[3]) / 100;
  const lig = parseFloat(match[4]) / 100;

  return hsl(h, sat, lig);
}

function parseHwb(s: string): Color {
  const match = s.match(
    /^hwb\(\s*([\d.]+)(deg|rad|turn)?\s+(\d+(?:\.\d+)?)%?\s+(\d+(?:\.\d+)?)%?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/,
  );
  if (!match) throw new Error(`Invalid hwb() color: "${s}"`);

  const h = parseAngle(match[1], match[2]);
  const w = parseFloat(match[3]) / 100;
  const b = parseFloat(match[4]) / 100;

  return hwb(h, w, b);
}

function parseOklab(s: string): Color {
  const match = s.match(
    /^oklab\(\s*([\d.]+%?)\s+([\d.e+-]+%?)\s+([\d.e+-]+%?)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/,
  );
  if (!match) throw new Error(`Invalid oklab() color: "${s}"`);

  const l = parseComponent(match[1], 1);
  const a = parseFloat(match[2]);
  const b = parseFloat(match[3]);

  return oklab(l, a, b);
}

function parseOklch(s: string): Color {
  const match = s.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(deg|rad|turn)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/,
  );
  if (!match) throw new Error(`Invalid oklch() color: "${s}"`);

  const l = parseComponent(match[1], 1);
  const c = parseFloat(match[2]);
  const h = parseAngle(match[3], match[4]);

  return oklch(l, c, h);
}

function parseComponent(value: string, maxVal: number): number {
  if (value.endsWith("%")) {
    return parseFloat(value) / 100;
  }
  return parseFloat(value) / maxVal;
}

function parseAngle(value: string, unit?: string): number {
  const num = parseFloat(value);
  switch (unit) {
    case "rad":
      return (num * 180) / Math.PI;
    case "turn":
      return num * 360;
    default:
      return num; // deg or no unit
  }
}
