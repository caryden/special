# oklab — Spec

Depends on: color-types, srgb-linear

## Purpose

Convert between linear RGB and Oklab, a perceptual color space designed for uniform
perceptual lightness and hue linearity. Uses two matrix multiplications with a cube-root
nonlinearity in between.

## Parameters

@provenance: Bjorn Ottosson, 2020-12-24, https://bottosson.github.io/posts/oklab/

**M1: linear sRGB -> LMS (row-major):**

| | R | G | B |
|---|---|---|---|
| L | 0.4122214708 | 0.5363325363 | 0.0514459929 |
| M | 0.2119034982 | 0.6806995451 | 0.1073969566 |
| S | 0.0883024619 | 0.2817188376 | 0.6299787005 |

**M2: LMS^(1/3) -> Lab (row-major):**

| | l' | m' | s' |
|---|---|---|---|
| L | 0.2104542553 | 0.7936177850 | -0.0040720468 |
| a | 1.9779984951 | -2.4285922050 | 0.4505937099 |
| b | 0.0259040371 | 0.7827717662 | -0.8086757660 |

**M1_INV: LMS -> linear sRGB (row-major):**

| | L | M | S |
|---|---|---|---|
| R | 4.0767416621 | -3.3077115913 | 0.2309699292 |
| G | -1.2684380046 | 2.6097574011 | -0.3413193965 |
| B | -0.0041960863 | -0.7034186147 | 1.7076147010 |

**M2_INV: Lab -> LMS^(1/3) (row-major):**

| | L | a | b |
|---|---|---|---|
| l' | 1.0 | 0.3963377774 | 0.2158037573 |
| m' | 1.0 | -0.1055613458 | -0.0638541728 |
| s' | 1.0 | -0.0894841775 | -1.2914855480 |

## Algorithm

@provenance: Bjorn Ottosson, 2020-12-24

**Linear RGB to Oklab:**
1. Multiply [R, G, B] by M1 to get LMS cone responses [l, m, s]
2. Apply cube root to each: `l' = cbrt(l)`, `m' = cbrt(m)`, `s' = cbrt(s)`
3. Multiply [l', m', s'] by M2 to get [L, a, b]

**Oklab to linear RGB:**
1. Multiply [L, a, b] by M2_INV to get [l', m', s']
2. Cube each: `l = l'^3`, `m = m'^3`, `s = s'^3`
3. Multiply [l, m, s] by M1_INV to get [R, G, B]

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `linearRgbToOklab` | `(color: LinearRgb) -> Oklab` | Convert linear RGB to Oklab |
| `oklabToLinearRgb` | `(color: Oklab) -> LinearRgb` | Convert Oklab to linear RGB |

## Test Vectors

@provenance: Bjorn Ottosson reference values; mathematical definition

| Input | Expected |
|-------|----------|
| `linearRgb(0, 0, 0)` -> Oklab | `oklab(0, 0, 0)` — black |
| `linearRgb(1, 1, 1)` -> Oklab | `oklab(~1, ~0, ~0)` — white (achromatic) |
| `linearRgb(1, 0, 0)` -> Oklab | `oklab(~0.6279, ~0.2249, ~0.1258)` — red |
| `linearRgb(0, 1, 0)` -> Oklab | `oklab(~0.8664, ~-0.2339, ~0.1795)` — green |
| `linearRgb(0, 0, 1)` -> Oklab | `oklab(~0.4520, ~-0.0324, ~-0.3116)` — blue |
| `oklab(0, 0, 0)` -> linear | `linearRgb(0, 0, 0)` — black |
| `oklab(1, 0, 0)` -> linear | `linearRgb(~1, ~1, ~1)` — white |

### Round-trip vectors

| Input | Round-trip Expected |
|-------|---------------------|
| `linearRgb(1, 0, 0)` | linear -> Oklab -> linear preserves to 6+ decimal places |
| `linearRgb(0, 1, 0)` | linear -> Oklab -> linear preserves to 6+ decimal places |
| `linearRgb(0, 0, 1)` | linear -> Oklab -> linear preserves to 6+ decimal places |
| `linearRgb(1, 1, 1)` | linear -> Oklab -> linear preserves to 6+ decimal places |
| `linearRgb(0.5, 0.3, 0.7)` | linear -> Oklab -> linear preserves to 6+ decimal places |
| `linearRgb(0.1, 0.9, 0.4)` | linear -> Oklab -> linear preserves to 6+ decimal places |

## Edge Cases

- Black (all zeros) maps to Oklab origin exactly: `cbrt(0) = 0`, all matrix products are 0
- White maps to `L ~= 1, a ~= 0, b ~= 0` (achromatic axis)
- The cube root is defined for negative inputs in most languages (`cbrt(-x) = -cbrt(x)`);
  however, linear RGB inputs are typically non-negative within gamut
- Oklab L is in [0, 1] for in-gamut colors (unlike CIELAB which uses [0, 100])
- The M1 and M2 matrices have 10 significant digits; use all of them for precision

## Error Cases

- None. All operations (matrix multiply, cube root, cube) are defined for all real inputs.
  Out-of-gamut Oklab values may produce negative linear RGB components.
