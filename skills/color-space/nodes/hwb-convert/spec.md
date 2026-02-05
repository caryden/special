# hwb-convert — Spec

Depends on: color-types

## Purpose

Convert between sRGB and HWB (Hue, Whiteness, Blackness). HWB is an alternative to
HSL designed for intuitive human color selection. When whiteness + blackness >= 1,
the color is achromatic and must be normalized.

## Parameters

@provenance: CSS Color Level 4, section 7.2

| Parameter | Value | Description |
|-----------|-------|-------------|
| Hue range | `[0, 360)` | Degrees, wraps via modulo 360 |
| Whiteness range | `[0, 1]` | Amount of white mixed in |
| Blackness range | `[0, 1]` | Amount of black mixed in |

## Algorithm

@provenance: CSS Color Level 4, section 7.2

**sRGB to HWB:**
1. Compute `max = max(r, g, b)`, `min = min(r, g, b)`, `d = max - min`
2. `W = min` (whiteness), `B = 1 - max` (blackness)
3. Compute hue using same sector logic as HSL:
   - If `d = 0`: `H = 0` (achromatic)
   - Red max: `H = ((g - b) / d + (g < b ? 6 : 0)) * 60`
   - Green max: `H = ((b - r) / d + 2) * 60`
   - Blue max: `H = ((r - g) / d + 4) * 60`
4. Return `H % 360, W, B`

**HWB to sRGB:**
1. If `W + B >= 1`, normalize to achromatic gray: `gray = W / (W + B)`, return `(gray, gray, gray)`
2. Compute pure-hue RGB from hue angle using sector decomposition (`hueToRgb` helper)
3. Scale by whiteness and blackness: `channel = pureHue * (1 - W - B) + W`

**hueToRgb(h)** (internal helper — returns [R, G, B] for fully saturated hue):
1. Normalize hue to [0, 360) via `((h % 360) + 360) % 360`
2. Compute sector `i = floor(hNorm / 60) % 6` and fractional `f = sector - floor(sector)`
3. Return RGB triple based on sector:
   - 0: `[1, f, 0]`
   - 1: `[1-f, 1, 0]`
   - 2: `[0, 1, f]`
   - 3: `[0, 1-f, 1]`
   - 4: `[f, 0, 1]`
   - 5: `[1, 0, 1-f]`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `srgbToHwb` | `(color: SRgb) -> Hwb` | Convert sRGB to HWB |
| `hwbToSrgb` | `(color: Hwb) -> SRgb` | Convert HWB to sRGB |

## Test Vectors

@provenance: CSS Color Level 4, mathematical definition

| Input | Expected |
|-------|----------|
| `srgb(0, 0, 0)` -> HWB | `hwb(0, 0, 1)` — black |
| `srgb(1, 1, 1)` -> HWB | `hwb(0, 1, 0)` — white |
| `srgb(1, 0, 0)` -> HWB | `hwb(0, 0, 0)` — pure red |
| `srgb(0, 1, 0)` -> HWB | `hwb(120, 0, 0)` — pure green |
| `srgb(0, 0, 1)` -> HWB | `hwb(240, 0, 0)` — pure blue |
| `srgb(0.5, 0.5, 0.5)` -> HWB | `hwb(0, 0.5, 0.5)` — 50% gray |
| `hwb(0, 0, 0)` -> sRGB | `srgb(1, 0, 0)` — pure red |
| `hwb(0, 1, 0)` -> sRGB | `srgb(1, 1, 1)` — white |
| `hwb(0, 0, 1)` -> sRGB | `srgb(0, 0, 0)` — black |
| `hwb(0, 0.6, 0.6)` -> sRGB | `srgb(0.5, 0.5, 0.5)` — normalized gray (W+B=1.2) |
| `hwb(120, 0.3, 0.7)` -> sRGB | `srgb(0.3, 0.3, 0.3)` — normalized gray (W+B=1.0) |
| `hwb(0, 0.5, 0.5)` -> sRGB | `srgb(0.5, 0.5, 0.5)` — 50% gray (W+B=1.0) |
| `hwb(90, 0, 0)` -> sRGB | `srgb(~0.5, 1, 0)` — sector 1 hue |

## Edge Cases

- **Normalization**: when `W + B >= 1`, the color is achromatic; normalize by dividing
  whiteness by the sum to get the gray level
- Achromatic colors (all channels equal): hue is 0 by convention
- Hue wraps via double-modulo `((h % 360) + 360) % 360` to handle negative angles
- All six hue sectors (0-60, 60-120, 120-180, 180-240, 240-300, 300-360) must be tested
- Round-trip `sRGB -> HWB -> sRGB` preserves values to at least 8 decimal places

## Error Cases

- None. All numeric inputs produce valid outputs. No validation or clamping is performed.
