# hsl-convert — Spec

Depends on: color-types

## Purpose

Convert between sRGB and HSL (Hue, Saturation, Lightness). Handles the achromatic
case (saturation = 0) where hue is undefined and set to 0 by convention.

## Parameters

@provenance: CSS Color Level 4, section 5; W3C algorithm

| Parameter | Value | Description |
|-----------|-------|-------------|
| Hue range | `[0, 360)` | Degrees, wraps via modulo 360 |
| Saturation range | `[0, 1]` | 0 = achromatic, 1 = fully saturated |
| Lightness range | `[0, 1]` | 0 = black, 0.5 = pure hue, 1 = white |

## Algorithm

@provenance: CSS Color Level 4, section 5

**sRGB to HSL:**
1. Compute `max = max(r, g, b)` and `min = min(r, g, b)`, `d = max - min`
2. `L = (max + min) / 2`
3. If `d = 0` (achromatic), return `H = 0, S = 0, L`
4. `S = d / (2 - max - min)` if `L > 0.5`, else `S = d / (max + min)`
5. Compute hue sector based on which channel is max:
   - Red max: `H = ((g - b) / d + (g < b ? 6 : 0)) * 60`
   - Green max: `H = ((b - r) / d + 2) * 60`
   - Blue max: `H = ((r - g) / d + 4) * 60`
6. Return `H % 360, S, L`

**HSL to sRGB:**
1. If `S = 0`, return `(L, L, L)` (achromatic)
2. Compute `q = L < 0.5 ? L * (1 + S) : L + S - L * S`
3. Compute `p = 2 * L - q`
4. Convert hue to RGB via `hueToRgb(p, q, h)` helper for each channel:
   - Red: `hueToRgb(p, q, H + 120)`
   - Green: `hueToRgb(p, q, H)`
   - Blue: `hueToRgb(p, q, H - 120)`

**hueToRgb(p, q, t)** (internal helper):
1. Normalize `t` into [0, 360): if `t < 0` add 360; if `t > 360` subtract 360
2. If `t < 60`: return `p + (q - p) * t / 60`
3. If `t < 180`: return `q`
4. If `t < 240`: return `p + (q - p) * (240 - t) / 60`
5. Else: return `p`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `srgbToHsl` | `(color: SRgb) -> Hsl` | Convert sRGB to HSL |
| `hslToSrgb` | `(color: Hsl) -> SRgb` | Convert HSL to sRGB |

## Test Vectors

@provenance: CSS Color Level 4, mathematical definition

| Input | Expected |
|-------|----------|
| `srgb(0, 0, 0)` -> HSL | `hsl(0, 0, 0)` — black |
| `srgb(1, 1, 1)` -> HSL | `hsl(0, 0, 1)` — white |
| `srgb(1, 0, 0)` -> HSL | `hsl(0, 1, 0.5)` — pure red |
| `srgb(0, 1, 0)` -> HSL | `hsl(120, 1, 0.5)` — pure green |
| `srgb(0, 0, 1)` -> HSL | `hsl(240, 1, 0.5)` — pure blue |
| `srgb(1, 1, 0)` -> HSL | `hsl(60, 1, 0.5)` — yellow |
| `srgb(0, 1, 1)` -> HSL | `hsl(180, 1, 0.5)` — cyan |
| `srgb(1, 0, 1)` -> HSL | `hsl(300, 1, 0.5)` — magenta |
| `srgb(0.5, 0.5, 0.5)` -> HSL | `hsl(0, 0, 0.5)` — 50% gray |
| `srgb(0.5, 0, 0)` -> HSL | `hsl(0, 1, 0.25)` — dark red |
| `hsl(0, 0, 0)` -> sRGB | `srgb(0, 0, 0)` — black |
| `hsl(0, 0, 1)` -> sRGB | `srgb(1, 1, 1)` — white |
| `hsl(0, 1, 0.5)` -> sRGB | `srgb(1, 0, 0)` — pure red |
| `hsl(120, 1, 0.5)` -> sRGB | `srgb(0, 1, 0)` — pure green |
| `hsl(0, 0, 0.5)` -> sRGB | `srgb(0.5, 0.5, 0.5)` — achromatic gray |
| `hsl(180, 0, 0.5)` -> sRGB | `srgb(0.5, 0.5, 0.5)` — achromatic (hue ignored) |

## Edge Cases

- Achromatic colors (`S = 0`): hue is undefined; set to 0 by convention
- Achromatic with non-zero hue in HSL: hue is ignored when `S = 0`, all channels equal `L`
- Lightness < 0.5 vs > 0.5 uses different saturation formula branch
- Hue wraps via modulo 360; values near 360 are equivalent to near 0
- Round-trip `sRGB -> HSL -> sRGB` preserves values to at least 8 decimal places

## Error Cases

- None. All numeric inputs produce valid outputs. No validation or clamping is performed.
