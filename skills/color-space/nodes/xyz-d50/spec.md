# xyz-d50 — Spec

Depends on: color-types, xyz-d65

## Purpose

Convert between CIE XYZ D65 and CIE XYZ D50 using the Bradford chromatic adaptation
transform. This enables interoperability with ICC profiles and color workflows that
use the D50 illuminant.

## Parameters

@provenance: ICC specification, Bradford chromatic adaptation

| Parameter | Value | Description |
|-----------|-------|-------------|
| D65 white point | `[0.95047, 1.0, 1.08883]` | CIE standard illuminant D65 |
| D50 white point | `[0.96422, 1.0, 0.82521]` | ICC profile connection space illuminant |

**Forward matrix M (XYZ D65 -> XYZ D50, row-major, Bradford):**

| | X | Y | Z |
|---|---|---|---|
| X' | 1.0479298208405488 | 0.022946793341019088 | -0.05019222954313557 |
| Y' | 0.029627815688159344 | 0.990434429065321 | -0.01707382502938514 |
| Z' | -0.009243058152591178 | 0.015055144896577895 | 0.7521316354461029 |

**Inverse matrix M_INV (XYZ D50 -> XYZ D65, row-major):**

| | X | Y | Z |
|---|---|---|---|
| X' | 0.9554734527042182 | -0.023098536874261423 | 0.0632593086610217 |
| Y' | -0.028369706963208136 | 1.0099954580106629 | 0.021041398966943008 |
| Z' | 0.012314001688319899 | -0.020507696433477912 | 1.3303659366080753 |

## Algorithm

@provenance: ICC specification, Bradford chromatic adaptation

**XYZ D65 to XYZ D50:**
1. Multiply the [X, Y, Z] vector by the Bradford forward matrix M

**XYZ D50 to XYZ D65:**
1. Multiply the [X, Y, Z] vector by the Bradford inverse matrix M_INV

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `xyzD65ToXyzD50` | `(color: XyzD65) -> XyzD50` | Convert CIE XYZ D65 to CIE XYZ D50 |
| `xyzD50ToXyzD65` | `(color: XyzD50) -> XyzD65` | Convert CIE XYZ D50 to CIE XYZ D65 |

## Test Vectors

@provenance: CIE 15:2004 (white points); ICC specification (Bradford matrix)

| Input | Expected |
|-------|----------|
| `xyzD65(0, 0, 0)` -> D50 | `xyzD50(0, 0, 0)` — origin preserved |
| `xyzD65(0.95047, 1.0, 1.08883)` -> D50 | `xyzD50(~0.96422, ~1.0, ~0.82521)` — D65 white to D50 white |
| `xyzD50(0, 0, 0)` -> D65 | `xyzD65(0, 0, 0)` — origin preserved |
| `xyzD50(0.96422, 1.0, 0.82521)` -> D65 | `xyzD65(~0.95047, ~1.0, ~1.08883)` — D50 white to D65 white |

### Round-trip vectors

| Input | Round-trip Expected |
|-------|---------------------|
| `xyzD65(0.95047, 1.0, 1.08883)` | D65 -> D50 -> D65 preserves to 3+ decimal places |
| `xyzD65(0.4124, 0.2126, 0.0193)` | D65 -> D50 -> D65 preserves to 3+ decimal places |
| `xyzD65(0.3576, 0.7152, 0.1192)` | D65 -> D50 -> D65 preserves to 3+ decimal places |
| `xyzD65(0.1805, 0.0722, 0.9505)` | D65 -> D50 -> D65 preserves to 3+ decimal places |
| `xyzD65(0.5, 0.3, 0.7)` | D65 -> D50 -> D65 preserves to 3+ decimal places |

## Edge Cases

- Black (origin) maps to origin exactly in both directions
- The Bradford transform is a linear map, so it preserves the origin and linearity
- The Z component changes most dramatically between D65 and D50 (D65 Z is ~1.089, D50 Z is ~0.825)
  because D65 is a bluer illuminant than D50
- Round-trip precision is limited to ~3 decimal places due to the precision of the published
  white point values used as test references

## Error Cases

- None. The matrix multiplication is defined for all real-valued inputs.
