# gamut-map — Spec

Depends on: color-types, srgb-linear, oklab, oklch

## Purpose

Detect whether colors are within the sRGB gamut and map out-of-gamut colors back into
gamut. Uses Oklch chroma reduction via binary search, preserving lightness and hue while
reducing saturation until the color fits within sRGB [0, 1].

## Parameters

@provenance: CSS Color Level 4, section 13.2 (gamut mapping via Oklch chroma reduction)

| Constant | Value | Description |
|----------|-------|-------------|
| `GAMUT_EPSILON` | `0.001` | Tolerance for gamut boundary checks and binary search convergence |
| `MAX_ITERATIONS` | `32` | Maximum binary search iterations |

## Algorithm

### isInGamut

Check whether a linear RGB color has all components within `[-GAMUT_EPSILON, 1 + GAMUT_EPSILON]`.
The epsilon tolerance accommodates floating-point rounding from color space conversions.

### clampToGamut

Hard-clamp each linear RGB component to `[0, 1]`, then apply sRGB gamma encoding.
Returns an sRGB color.

### gamutMapOklch

1. Convert the Oklch color to Oklab, then to linear RGB (using `linearRgbToOklab` and `oklabToLinearRgb` from the oklab node).
2. If already in gamut: clamp and return.
3. If achromatic (`C < GAMUT_EPSILON`): clamp and return.
4. Binary search on chroma `[0, original_C]`:
   - Midpoint candidate with same L and H, reduced C.
   - If candidate is in gamut: `lo = mid`, else `hi = mid`.
   - Stop when `hi - lo < GAMUT_EPSILON` or after `MAX_ITERATIONS`.
5. Use the `lo` chroma value (guaranteed in-gamut), convert to linear RGB, clamp, and return sRGB.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `isInGamut` | `(color: LinearRgb) -> boolean` | Check if linear RGB is within sRGB gamut |
| `clampToGamut` | `(color: LinearRgb) -> SRgb` | Hard-clamp to [0,1] and apply gamma |
| `gamutMapOklch` | `(color: Oklch) -> SRgb` | Map Oklch to sRGB via chroma reduction |

## Test Vectors

@provenance: CSS Color Level 4 section 13.2

### isInGamut

| Input | Expected |
|-------|----------|
| `linearRgb(0, 0, 0)` (black) | `true` |
| `linearRgb(1, 1, 1)` (white) | `true` |
| `linearRgb(0.5, 0.5, 0.5)` (mid gray) | `true` |
| `linearRgb(-0.0005, 0.5, 0.5)` (within epsilon) | `true` |
| `linearRgb(-0.1, 0.5, 0.5)` (clearly negative) | `false` |
| `linearRgb(0.5, 1.5, 0.5)` (above 1) | `false` |
| `linearRgb(0.5, 1.0005, 0.5)` (within epsilon above 1) | `true` |

### clampToGamut

| Input | Expected |
|-------|----------|
| `linearRgb(0.5, 0.3, 0.7)` | sRGB output (space = "srgb") |
| `linearRgb(-0.5, 0.3, 0.7)` | r clamped to 0 |
| `linearRgb(0.5, 1.5, 0.7)` | g clamped to 1 |

### gamutMapOklch

| Input | Expected |
|-------|----------|
| `oklch(0.6279, 0.2577, 29.23)` (in-gamut red) | Valid sRGB, all components in [0, 1] |
| `oklch(0.5, 0.5, 180)` (out-of-gamut high chroma) | Valid sRGB, all components in [0, 1] |
| `oklch(0.5, 0, 0)` (achromatic gray) | r ~= g ~= b (neutral) |
| `oklch(0.5, 0.8, 0/90/270)` (extreme chroma, various hues) | Valid sRGB for all |
| `oklch(1.5, 0.0001, 0)` (out-of-gamut lightness, near-achromatic) | Components <= 1 |
| `oklch(0, 0, 0)` (black) | `(~0, ~0, ~0)` |
| `oklch(1, 0, 0)` (white) | `(~1, ~1, ~1)` |

## Edge Cases

- **Epsilon tolerance**: The gamut boundary includes a small epsilon to handle floating-point imprecision from round-trip conversions.
- **Achromatic out-of-gamut**: Colors with near-zero chroma but out-of-gamut lightness (e.g., L > 1) are clamped rather than chroma-searched.
- **Binary search convergence**: Terminates when chroma bracket is within epsilon or after MAX_ITERATIONS, whichever comes first.

## Error Cases

None. All numeric inputs produce valid sRGB outputs.
