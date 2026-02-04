# color-space — Help Guide

This guide helps you choose the right nodes and target language for your use case.

## Quick Start

If you already know what you need:
- **sRGB gamma**: `srgb-linear --lang <language>`
- **HSL manipulation**: `hsl-convert --lang <language>`
- **Oklab perceptual**: `oklab oklch --lang <language>`
- **Full library**: `all --lang <language>`

## Decision Tree

### 1. What is your use case?

| Use Case | Recommended Nodes | Why |
|----------|------------------|-----|
| Lighten/darken colors in HSL | `hsl-convert` | Direct HSL manipulation |
| Perceptually uniform color mixing | `srgb-linear oklab` | Oklab is perceptually uniform; mix in Oklab space |
| Perceptual color difference (ΔE) | `srgb-linear xyz-d65 lab-d65 delta-e` | CIEDE2000 is the gold standard metric |
| Color palette generation | `srgb-linear oklab oklch` | Oklch gives uniform chroma/hue control |
| CSS color parsing | `parse-color` | Parses hex, named, rgb(), hsl(), oklab(), oklch() |
| CSS color output | `serialize-color` | Formats any color type as CSS string |
| Gamut mapping (out-of-range colors) | `srgb-linear oklab oklch gamut-map` | Binary search chroma reduction in Oklch |
| ICC profile workflows | `srgb-linear xyz-d65 xyz-d50 lab-d50` | Lab D50 is the ICC profile connection space |
| General conversion between any spaces | `all` | Routes through linear RGB hub (all 16 nodes) |
| Image processing / gamma correction | `srgb-linear` | Correct gamma before any linear math |
| Design tool color picker | `hsl-convert` or `srgb-linear oklab oklch` | HSL for legacy, Oklch for perceptual |

### 2. Which color spaces do you need?

| Color Space | When to Use | Nodes Required |
|-------------|-------------|----------------|
| sRGB | Standard web/screen colors | `color-types` only |
| Linear RGB | Blending, compositing, physically correct math | `srgb-linear` |
| HSL | Hue/saturation/lightness manipulation | `hsl-convert` |
| HWB | Human-friendly color selection | `hwb-convert` |
| Oklab | Perceptually uniform mixing, interpolation | `srgb-linear` + `oklab` |
| Oklch | Perceptual palette generation (polar form) | `srgb-linear` + `oklab` + `oklch` |
| CIELAB D65 | Color difference metrics (ΔE) | `srgb-linear` + `xyz-d65` + `lab-d65` |
| LCH D65 | Polar CIELAB for hue/chroma control | + `lch-d65` |
| XYZ D65 | Intermediate for scientific color work | `srgb-linear` + `xyz-d65` |
| XYZ D50 / Lab D50 | ICC profile connection space | + `xyz-d50` / `lab-d50` |

### 3. What language / platform?

| Language | Notes |
|----------|-------|
| Python | Use `math` stdlib for cbrt/atan2. NumPy optional for batch processing. |
| Rust | Use `f64` throughout. No external crates needed. |
| Go | Use `math` package. Structs with space discriminant string field. |
| TypeScript | Direct copy of reference — no translation needed. |
| Other | The spec.md files are language-agnostic. Any language with IEEE 754 floats and basic trig can implement them. |

## Node Recipes

Pre-computed dependency sets for common subsets. Copy-paste these directly.

### Gamma Correction Only

```
srgb-linear --lang <language>
```

2 nodes (srgb-linear + color-types). Convert between sRGB and linear RGB
for physically correct blending and compositing.

### HSL Color Manipulation

```
hsl-convert --lang <language>
```

2 nodes. Convert sRGB ↔ HSL for hue rotation, saturation adjustment, etc.

### Oklab Perceptual Color

```
oklab oklch --lang <language>
```

4 nodes (oklab + oklch + srgb-linear + color-types). Perceptually uniform
color space for mixing, interpolation, and palette generation.

### Color Difference (ΔE)

```
delta-e --lang <language>
```

7 nodes (delta-e + color-types + srgb-linear + xyz-d65 + lab-d65 + oklab + oklch).
Compute CIEDE2000, CIE76, and Oklch color differences.

### Gamut Mapping

```
gamut-map --lang <language>
```

6 nodes (gamut-map + color-types + srgb-linear + oklab + oklch).
Detect out-of-gamut colors and map them back into sRGB via Oklch chroma reduction.

### CSS Round-Trip (Parse + Serialize)

```
parse-color serialize-color --lang <language>
```

3 nodes. Parse CSS color strings and serialize back. No conversion —
just parsing and formatting.

### Full Library

```
all --lang <language>
```

All 16 nodes. Convert between any two of 11 supported color spaces,
with parsing, serialization, gamut mapping, and color difference.

## Key Concepts

### Why linear RGB matters

sRGB uses a nonlinear gamma curve. Any math done directly on sRGB values
(blending, averaging, darkening) produces incorrect results. Always convert
to linear RGB first, do the math, then convert back.

### Oklab vs CIELAB

Both are "perceptually uniform" but Oklab (2020) significantly improves on
CIELAB (1976) for blue hues and overall uniformity. Use Oklab for new
projects; use CIELAB when you need CIEDE2000 or compatibility with existing
color science workflows.

### Gamut mapping

Colors in wide-gamut spaces (Oklch, Lab) may not have valid sRGB
representations. Gamut mapping reduces chroma while preserving lightness
and hue to find the closest in-gamut color.

## Frequently Asked Questions

**Q: Do I need all 16 nodes?**
A: No. Most use cases need 2-5 nodes. Use the decision tree above to
find the minimal set.

**Q: Can I add nodes later?**
A: Yes. Each node has explicit dependencies. Generate additional nodes
at any time — just include their dependencies.

**Q: What if my language isn't listed?**
A: The spec.md files are language-agnostic behavioral specifications with
test vectors. Any language can implement them. The to-<lang>.md hints
just accelerate translation for the listed languages.

**Q: Are the matrices exact?**
A: Yes. All matrices, thresholds, and constants use values from
authoritative sources (IEC 61966-2-1, ICC spec, Björn Ottosson's Oklab
publication). Provenance is documented in each spec.

**Q: Why isn't Display P3 / Rec. 2020 supported?**
A: This skill focuses on sRGB as the hub color space. Wide-gamut display
spaces require different RGB→XYZ matrices. They could be added as
additional nodes without changing existing ones.
