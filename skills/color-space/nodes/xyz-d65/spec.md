# xyz-d65 — Spec

Depends on: color-types, srgb-linear

## Purpose

Convert between linear RGB and CIE XYZ under the D65 illuminant using the standard
3x3 matrix derived from the sRGB primaries and D65 white point. This is the central
hub space connecting sRGB to all CIE-based and perceptual color spaces.

## Parameters

@provenance: IEC 61966-2-1:1999, derived from sRGB primaries and D65 white point; CIE 15:2004

| Parameter | Value | Description |
|-----------|-------|-------------|
| D65 white point | `[0.95047, 1.0, 1.08883]` | CIE standard illuminant D65 |

**Forward matrix M (linear sRGB -> XYZ D65, row-major):**

| | R | G | B |
|---|---|---|---|
| X | 0.4123907992659595 | 0.357584339383878 | 0.1804807884018343 |
| Y | 0.21263900587151027 | 0.715168678767756 | 0.07219231536073371 |
| Z | 0.01933081871559182 | 0.11919477979462598 | 0.9505321522496607 |

**Inverse matrix M_INV (XYZ D65 -> linear sRGB, row-major):**

| | X | Y | Z |
|---|---|---|---|
| R | 3.2409699419045226 | -1.5373831775700939 | -0.4986107602930034 |
| G | -0.9692436362808796 | 1.8759675015077202 | 0.04155505740717559 |
| B | 0.05563007969699366 | -0.20397696064091520 | 1.0569715142428786 |

## Algorithm

@provenance: IEC 61966-2-1:1999

**Linear RGB to XYZ D65:**
1. Multiply the [R, G, B] vector by matrix M:
   - `X = M[0][0]*R + M[0][1]*G + M[0][2]*B`
   - `Y = M[1][0]*R + M[1][1]*G + M[1][2]*B`
   - `Z = M[2][0]*R + M[2][1]*G + M[2][2]*B`

**XYZ D65 to linear RGB:**
1. Multiply the [X, Y, Z] vector by matrix M_INV (same structure as above)

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `linearRgbToXyzD65` | `(color: LinearRgb) -> XyzD65` | Convert linear RGB to CIE XYZ D65 |
| `xyzD65ToLinearRgb` | `(color: XyzD65) -> LinearRgb` | Convert CIE XYZ D65 to linear RGB |

## Test Vectors

@provenance: IEC 61966-2-1:1999, mathematical definition; CIE 15:2004

| Input | Expected |
|-------|----------|
| `linearRgb(0, 0, 0)` -> XYZ | `xyzD65(0, 0, 0)` — black (origin) |
| `linearRgb(1, 1, 1)` -> XYZ | `xyzD65(~0.95047, ~1.0, ~1.08883)` — D65 white point |
| `linearRgb(1, 0, 0)` -> XYZ | `xyzD65(~0.4124, ~0.2126, ~0.0193)` — red primary |
| `linearRgb(0, 1, 0)` -> XYZ | `xyzD65(~0.3576, ~0.7152, ~0.1192)` — green primary |
| `linearRgb(0, 0, 1)` -> XYZ | `xyzD65(~0.1805, ~0.0722, ~0.9505)` — blue primary |
| `xyzD65(0, 0, 0)` -> linear | `linearRgb(0, 0, 0)` — origin to black |
| `xyzD65(0.95047, 1.0, 1.08883)` -> linear | `linearRgb(~1, ~1, ~1)` — D65 white to white |

## Edge Cases

- Black (all zeros) maps to origin exactly (no floating-point drift from multiplication)
- D65 white point `[0.95047, 1.0, 1.08883]` is the sum of all three matrix columns
- Y component of the matrix second row gives standard luminance weights: R=0.2126, G=0.7152, B=0.0722
- Round-trip `linear RGB -> XYZ D65 -> linear RGB` preserves values to at least 8 decimal places
- Out-of-gamut XYZ values will produce negative or >1 linear RGB values (no clamping)

## Error Cases

- None. The matrix multiplication is defined for all real-valued inputs.
