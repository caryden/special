# convert — Spec

Depends on: color-types, srgb-linear, hsl-convert, hwb-convert, xyz-d65, xyz-d50, oklab, oklch, lab-d65, lab-d50, lch-d65

## Purpose

@provenance: Structural — routes through linear RGB hub

Universal color space converter. Converts any Color value from its current space to any
of the 11 supported target spaces. Routes all conversions through linear RGB as the
central hub, with XYZ D65 as a secondary hub for CIE-family spaces.

## Supported Spaces

All 11 color spaces defined in color-types:

`srgb`, `linear-rgb`, `hsl`, `hwb`, `xyz-d65`, `xyz-d50`, `lab-d65`, `lab-d50`, `lch-d65`, `oklab`, `oklch`

## Algorithm

### Routing Strategy

All conversions follow a two-step pattern: *source -> linear RGB -> target*.

**Source to linear RGB** (`toLinearRgb`):

| Source Space | Route |
|-------------|-------|
| linear-rgb | identity |
| srgb | srgbToLinear |
| hsl | hslToSrgb -> srgbToLinear |
| hwb | hwbToSrgb -> srgbToLinear |
| xyz-d65 | xyzD65ToLinearRgb |
| xyz-d50 | xyzD50ToXyzD65 -> xyzD65ToLinearRgb |
| oklab | oklabToLinearRgb |
| oklch | oklchToOklab -> oklabToLinearRgb |
| lab-d65 | labD65ToXyzD65 -> xyzD65ToLinearRgb |
| lab-d50 | labD50ToXyzD50 -> xyzD50ToXyzD65 -> xyzD65ToLinearRgb |
| lch-d65 | lchD65ToLabD65 -> labD65ToXyzD65 -> xyzD65ToLinearRgb |

**Linear RGB to target** (`fromLinearRgb`):

| Target Space | Route |
|-------------|-------|
| linear-rgb | identity |
| srgb | linearToSrgb |
| hsl | linearToSrgb -> srgbToHsl |
| hwb | linearToSrgb -> srgbToHwb |
| xyz-d65 | linearRgbToXyzD65 |
| xyz-d50 | linearRgbToXyzD65 -> xyzD65ToXyzD50 |
| oklab | linearRgbToOklab |
| oklch | linearRgbToOklab -> oklabToOklch |
| lab-d65 | linearRgbToXyzD65 -> xyzD65ToLabD65 |
| lab-d50 | linearRgbToXyzD65 -> xyzD65ToXyzD50 -> xyzD50ToLabD50 |
| lch-d65 | linearRgbToXyzD65 -> xyzD65ToLabD65 -> labD65ToLchD65 |

### Identity Optimization

If `color.space === target`, the input color is returned unchanged (no conversion).

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `convert` | `(color: Color, to: ColorSpace) -> Color` | Convert a color to the specified target space |

## Test Vectors

### Identity

| Input | Target | Expected |
|-------|--------|----------|
| srgb `(1, 0, 0)` | `"srgb"` | Same object (identity) |
| oklab `(0.5, 0.1, -0.1)` | `"oklab"` | Same object (identity) |

### Round-Trip Accuracy

All round-trips (source -> target -> source) preserve values to the specified tolerance.

| Round-trip | Tolerance |
|------------|-----------|
| srgb -> hsl -> srgb | 6 decimal places |
| srgb -> hwb -> srgb | 6 decimal places |
| srgb -> linear-rgb -> srgb | 6 decimal places |
| srgb -> xyz-d50 -> srgb | 2 decimal places |
| srgb -> lab-d65 -> srgb | 3 decimal places |
| srgb -> lab-d50 -> srgb | 2 decimal places |
| srgb -> lch-d65 -> srgb | 3 decimal places |
| srgb -> oklab -> srgb | 3 decimal places |
| srgb -> oklch -> srgb | 3 decimal places |

### Known Conversions

| Input | Target | Expected |
|-------|--------|----------|
| srgb red `(1, 0, 0)` | `"xyz-d65"` | X ~0.4124, Y ~0.2126 |

### Cross-Space Conversions

These verify that arbitrary source-to-target pairs work via the hub:

| Source | Target |
|--------|--------|
| hsl `(120, 1, 0.5)` | oklab |
| hwb `(0, 0, 0)` | lab-d65 |
| oklch `(0.7, 0.15, 180)` | xyz-d50 |
| lch-d65 `(50, 30, 270)` | oklch |
| lab-d50 `(50, 20, -30)` | hsl |
| xyz-d65 `(0.4, 0.2, 0.1)` | hwb |
| xyz-d50 `(0.4, 0.3, 0.2)` | oklch |
| linear-rgb `(0.5, 0.3, 0.7)` | lch-d65 |

### Black and White Through All Spaces

sRGB white `(1, 1, 1)` and black `(0, 0, 0)` must convert to every space and back
to sRGB with all components within 0.1 of the original.

## Edge Cases

- **Identity**: Same-space conversion returns the input directly.
- **Multi-hop routes**: Some conversions require 3+ intermediate steps (e.g., lch-d65 -> lab-d65 -> xyz-d65 -> linear-rgb -> srgb -> hsl).
- **Achromatic through polar spaces**: Black/white through oklch and lch-d65 must handle zero-chroma hue conventions gracefully.

## Error Cases

| Input | Error |
|-------|-------|
| Unsupported target space string | Throws: unsupported target color space |
