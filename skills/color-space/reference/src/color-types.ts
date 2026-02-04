/**
 * Type definitions for all supported color spaces.
 *
 * Defines typed representations for sRGB, Linear RGB, HSL, HWB,
 * CIE XYZ (D65/D50), CIELAB (D65/D50), LCH (D65), Oklab, and Oklch.
 * Each color type carries a `space` discriminant for runtime dispatch.
 *
 * @node color-types
 * @contract color-types.test.ts
 * @hint types: These are plain data types with no behavior. Translate as
 *       structs/dataclasses/records in the target language.
 */

/** sRGB color with components in [0, 1]. */
export interface SRgb {
  space: "srgb";
  r: number;
  g: number;
  b: number;
}

/** Linear (gamma-decoded) RGB color with components in [0, 1]. */
export interface LinearRgb {
  space: "linear-rgb";
  r: number;
  g: number;
  b: number;
}

/** HSL color: hue in [0, 360), saturation and lightness in [0, 1]. */
export interface Hsl {
  space: "hsl";
  h: number;
  s: number;
  l: number;
}

/** HWB color: hue in [0, 360), whiteness and blackness in [0, 1]. */
export interface Hwb {
  space: "hwb";
  h: number;
  w: number;
  b: number;
}

/** CIE XYZ color under D65 illuminant. */
export interface XyzD65 {
  space: "xyz-d65";
  x: number;
  y: number;
  z: number;
}

/** CIE XYZ color under D50 illuminant. */
export interface XyzD50 {
  space: "xyz-d50";
  x: number;
  y: number;
  z: number;
}

/** CIELAB color under D65 illuminant. L in [0, 100], a and b unbounded. */
export interface LabD65 {
  space: "lab-d65";
  l: number;
  a: number;
  b: number;
}

/** CIELAB color under D50 illuminant. L in [0, 100], a and b unbounded. */
export interface LabD50 {
  space: "lab-d50";
  l: number;
  a: number;
  b: number;
}

/** CIE LCH color under D65 illuminant. L in [0, 100], C ≥ 0, H in [0, 360). */
export interface LchD65 {
  space: "lch-d65";
  l: number;
  c: number;
  h: number;
}

/** Oklab perceptual color space. L in [0, 1], a and b typically in [-0.5, 0.5]. */
export interface Oklab {
  space: "oklab";
  l: number;
  a: number;
  b: number;
}

/** Oklch (polar Oklab). L in [0, 1], C ≥ 0, H in [0, 360). */
export interface Oklch {
  space: "oklch";
  l: number;
  c: number;
  h: number;
}

/** Union of all supported color types. */
export type Color =
  | SRgb
  | LinearRgb
  | Hsl
  | Hwb
  | XyzD65
  | XyzD50
  | LabD65
  | LabD50
  | LchD65
  | Oklab
  | Oklch;

/** All supported color space identifiers. */
export type ColorSpace = Color["space"];

/** Factory for an sRGB color. */
export function srgb(r: number, g: number, b: number): SRgb {
  return { space: "srgb", r, g, b };
}

/** Factory for a linear RGB color. */
export function linearRgb(r: number, g: number, b: number): LinearRgb {
  return { space: "linear-rgb", r, g, b };
}

/** Factory for an HSL color. */
export function hsl(h: number, s: number, l: number): Hsl {
  return { space: "hsl", h, s, l };
}

/** Factory for an HWB color. */
export function hwb(h: number, w: number, b: number): Hwb {
  return { space: "hwb", h, w, b };
}

/** Factory for a CIE XYZ D65 color. */
export function xyzD65(x: number, y: number, z: number): XyzD65 {
  return { space: "xyz-d65", x, y, z };
}

/** Factory for a CIE XYZ D50 color. */
export function xyzD50(x: number, y: number, z: number): XyzD50 {
  return { space: "xyz-d50", x, y, z };
}

/** Factory for a CIELAB D65 color. */
export function labD65(l: number, a: number, b: number): LabD65 {
  return { space: "lab-d65", l, a, b };
}

/** Factory for a CIELAB D50 color. */
export function labD50(l: number, a: number, b: number): LabD50 {
  return { space: "lab-d50", l, a, b };
}

/** Factory for an LCH D65 color. */
export function lchD65(l: number, c: number, h: number): LchD65 {
  return { space: "lch-d65", l, c, h };
}

/** Factory for an Oklab color. */
export function oklab(l: number, a: number, b: number): Oklab {
  return { space: "oklab", l, a, b };
}

/** Factory for an Oklch color. */
export function oklch(l: number, c: number, h: number): Oklch {
  return { space: "oklch", l, c, h };
}
