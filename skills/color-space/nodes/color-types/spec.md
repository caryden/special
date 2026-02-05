# color-types — Spec

Depends on: none (leaf node)

## Purpose

Define typed representations for all supported color spaces. Each color type carries a
`space` discriminant string for runtime dispatch in conversion pipelines.

## Types

@provenance: CSS Color Level 4; CIE 15:2004; Bjorn Ottosson 2020-12-24

**SRgb** — sRGB color with components in [0, 1].

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"srgb"` | Discriminant |
| `r` | `number` | Red channel [0, 1] |
| `g` | `number` | Green channel [0, 1] |
| `b` | `number` | Blue channel [0, 1] |

**LinearRgb** — Linear (gamma-decoded) RGB color with components in [0, 1].

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"linear-rgb"` | Discriminant |
| `r` | `number` | Red channel [0, 1] |
| `g` | `number` | Green channel [0, 1] |
| `b` | `number` | Blue channel [0, 1] |

**Hsl** — HSL color: hue in [0, 360), saturation and lightness in [0, 1].

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"hsl"` | Discriminant |
| `h` | `number` | Hue in degrees [0, 360) |
| `s` | `number` | Saturation [0, 1] |
| `l` | `number` | Lightness [0, 1] |

**Hwb** — HWB color: hue in [0, 360), whiteness and blackness in [0, 1].

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"hwb"` | Discriminant |
| `h` | `number` | Hue in degrees [0, 360) |
| `w` | `number` | Whiteness [0, 1] |
| `b` | `number` | Blackness [0, 1] |

**XyzD65** — CIE XYZ color under D65 illuminant.

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"xyz-d65"` | Discriminant |
| `x` | `number` | X tristimulus |
| `y` | `number` | Y tristimulus (luminance) |
| `z` | `number` | Z tristimulus |

**XyzD50** — CIE XYZ color under D50 illuminant.

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"xyz-d50"` | Discriminant |
| `x` | `number` | X tristimulus |
| `y` | `number` | Y tristimulus (luminance) |
| `z` | `number` | Z tristimulus |

**LabD65** — CIELAB color under D65 illuminant. L in [0, 100], a and b unbounded.

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"lab-d65"` | Discriminant |
| `l` | `number` | Lightness [0, 100] |
| `a` | `number` | Green-red axis (unbounded) |
| `b` | `number` | Blue-yellow axis (unbounded) |

**LabD50** — CIELAB color under D50 illuminant. L in [0, 100], a and b unbounded.

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"lab-d50"` | Discriminant |
| `l` | `number` | Lightness [0, 100] |
| `a` | `number` | Green-red axis (unbounded) |
| `b` | `number` | Blue-yellow axis (unbounded) |

**LchD65** — CIE LCH color under D65 illuminant.

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"lch-d65"` | Discriminant |
| `l` | `number` | Lightness [0, 100] |
| `c` | `number` | Chroma >= 0 |
| `h` | `number` | Hue in degrees [0, 360) |

**Oklab** — Oklab perceptual color space. L in [0, 1], a and b typically in [-0.5, 0.5].

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"oklab"` | Discriminant |
| `l` | `number` | Lightness [0, 1] |
| `a` | `number` | Green-red axis |
| `b` | `number` | Blue-yellow axis |

**Oklch** — Oklch (polar Oklab). L in [0, 1], C >= 0, H in [0, 360).

| Field | Type | Description |
|-------|------|-------------|
| `space` | `"oklch"` | Discriminant |
| `l` | `number` | Lightness [0, 1] |
| `c` | `number` | Chroma >= 0 |
| `h` | `number` | Hue in degrees [0, 360) |

**Color** — Union of all 11 color types above.

**ColorSpace** — Union of all space discriminant strings.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `srgb` | `(r, g, b) -> SRgb` | Factory for sRGB color |
| `linearRgb` | `(r, g, b) -> LinearRgb` | Factory for linear RGB color |
| `hsl` | `(h, s, l) -> Hsl` | Factory for HSL color |
| `hwb` | `(h, w, b) -> Hwb` | Factory for HWB color |
| `xyzD65` | `(x, y, z) -> XyzD65` | Factory for CIE XYZ D65 color |
| `xyzD50` | `(x, y, z) -> XyzD50` | Factory for CIE XYZ D50 color |
| `labD65` | `(l, a, b) -> LabD65` | Factory for CIELAB D65 color |
| `labD50` | `(l, a, b) -> LabD50` | Factory for CIELAB D50 color |
| `lchD65` | `(l, c, h) -> LchD65` | Factory for LCH D65 color |
| `oklab` | `(l, a, b) -> Oklab` | Factory for Oklab color |
| `oklch` | `(l, c, h) -> Oklch` | Factory for Oklch color |

## Test Vectors

@provenance: structural — factories produce tagged records

| Call | Expected |
|------|----------|
| `srgb(1, 0, 0)` | `{ space: "srgb", r: 1, g: 0, b: 0 }` |
| `linearRgb(0.5, 0.5, 0.5)` | `{ space: "linear-rgb", r: 0.5, g: 0.5, b: 0.5 }` |
| `hsl(120, 1, 0.5)` | `{ space: "hsl", h: 120, s: 1, l: 0.5 }` |
| `hwb(0, 0, 0)` | `{ space: "hwb", h: 0, w: 0, b: 0 }` |
| `xyzD65(0.95047, 1.0, 1.08883)` | `{ space: "xyz-d65", x: 0.95047, y: 1.0, z: 1.08883 }` |
| `xyzD50(0.96422, 1.0, 0.82521)` | `{ space: "xyz-d50", x: 0.96422, y: 1.0, z: 0.82521 }` |
| `labD65(50, 20, -30)` | `{ space: "lab-d65", l: 50, a: 20, b: -30 }` |
| `labD50(100, 0, 0)` | `{ space: "lab-d50", l: 100, a: 0, b: 0 }` |
| `lchD65(50, 30, 270)` | `{ space: "lch-d65", l: 50, c: 30, h: 270 }` |
| `oklab(0.5, 0.1, -0.1)` | `{ space: "oklab", l: 0.5, a: 0.1, b: -0.1 }` |
| `oklch(0.7, 0.15, 180)` | `{ space: "oklch", l: 0.7, c: 0.15, h: 180 }` |

### Discriminant completeness

The Color union must accept all 11 types. The `space` field for each factory must match
the corresponding discriminant string: `"srgb"`, `"linear-rgb"`, `"hsl"`, `"hwb"`,
`"xyz-d65"`, `"xyz-d50"`, `"lab-d65"`, `"lab-d50"`, `"lch-d65"`, `"oklab"`, `"oklch"`.

## Edge Cases

- All factories are pure data constructors with no validation; out-of-range values are accepted
- Factories must not normalize or clamp inputs

## Error Cases

- None. Factories do not throw. Invalid numeric values (NaN, Infinity) are passed through.
