# srgb-linear — Spec

Depends on: color-types

## Purpose

Convert between sRGB (gamma-encoded) and linear RGB using the IEC 61966-2-1:1999
piecewise transfer function. This is the foundational gamma operation required by
all conversions that pass through linear RGB.

## Parameters

@provenance: IEC 61966-2-1:1999, clause 4.2

| Parameter | Value | Description |
|-----------|-------|-------------|
| sRGB threshold | `0.04045` | sRGB-side boundary between linear and gamma segments |
| Linear threshold | `0.0031308` | Linear-side boundary between linear and gamma segments |
| Linear slope | `12.92` | Slope of the linear segment |
| Gamma exponent | `2.4` | Exponent for the gamma curve |
| Gamma offset | `0.055` | Offset in the gamma curve formula |
| Gamma scale | `1.055` | Scale in the gamma curve formula |

## Algorithm

@provenance: IEC 61966-2-1:1999, clause 4.2

**sRGB to linear** (per component):
1. If `c <= 0.04045`, return `c / 12.92`
2. Otherwise, return `((c + 0.055) / 1.055) ^ 2.4`

**Linear to sRGB** (per component):
1. If `c <= 0.0031308`, return `c * 12.92`
2. Otherwise, return `1.055 * c^(1/2.4) - 0.055`

Full-color conversions apply the component function to each of R, G, B independently.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `srgbToLinearComponent` | `(c: number) -> number` | Convert a single sRGB component to linear |
| `linearToSrgbComponent` | `(c: number) -> number` | Convert a single linear component to sRGB |
| `srgbToLinear` | `(color: SRgb) -> LinearRgb` | Convert full sRGB color to linear RGB |
| `linearToSrgb` | `(color: LinearRgb) -> SRgb` | Convert full linear RGB color to sRGB |

## Test Vectors

@provenance: IEC 61966-2-1:1999, mathematical definition

| Input | Function | Expected |
|-------|----------|----------|
| `0` | `srgbToLinearComponent` | `0` (exact) |
| `1` | `srgbToLinearComponent` | `1` |
| `0.04` | `srgbToLinearComponent` | `0.04 / 12.92` (linear segment) |
| `0.04045` | `srgbToLinearComponent` | `0.04045 / 12.92` (at threshold, linear) |
| `0.5` | `srgbToLinearComponent` | `~0.214041` |
| `0` | `linearToSrgbComponent` | `0` (exact) |
| `1` | `linearToSrgbComponent` | `1` |
| `0.003` | `linearToSrgbComponent` | `0.003 * 12.92` (linear segment) |
| `0.0031308` | `linearToSrgbComponent` | `0.0031308 * 12.92` (at threshold, linear) |
| `srgb(0, 0, 0)` | `srgbToLinear` | `linearRgb(0, 0, 0)` |
| `srgb(1, 1, 1)` | `srgbToLinear` | `linearRgb(1, 1, 1)` |
| `srgb(1, 0, 0)` | `srgbToLinear` | `linearRgb(1, 0, 0)` |
| `linearRgb(0, 0, 0)` | `linearToSrgb` | `srgb(0, 0, 0)` |
| `linearRgb(1, 1, 1)` | `linearToSrgb` | `srgb(1, 1, 1)` |

## Edge Cases

- `0` maps to `0` exactly in both directions (no floating-point drift)
- `1` maps to `1` in both directions
- At the threshold boundary (0.04045 sRGB / 0.0031308 linear), both formula branches
  produce the same value -- the transfer function is continuous
- Round-trip `sRGB -> linear -> sRGB` preserves values to at least 6 decimal places
  for all values in [0, 1]

## Error Cases

- None. The transfer function is defined for all real numbers. Negative inputs or values
  above 1 will produce extrapolated results without error.
