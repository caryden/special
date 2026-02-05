# serialize-color — Spec

Depends on: color-types

## Purpose

Serialize typed color values to CSS color strings. Each color space has its own output
format following CSS Color Level 4 conventions.

## Output Formats

@provenance: CSS Color Level 4

| Color Space | Output Format | Example |
|-------------|--------------|---------|
| srgb | `rgb(R, G, B)` | `rgb(255, 0, 0)` |
| linear-rgb | `color(srgb-linear R G B)` | `color(srgb-linear 0.5 0.3 0.7)` |
| hsl | `hsl(H, S%, L%)` | `hsl(120, 100%, 50%)` |
| hwb | `hwb(H W% B%)` | `hwb(0 0% 0%)` |
| xyz-d65 | `color(xyz-d65 X Y Z)` | `color(xyz-d65 0.9505 1 1.0888)` |
| xyz-d50 | `color(xyz-d50 X Y Z)` | `color(xyz-d50 0.9642 1 0.8252)` |
| lab-d65 | `lab(L a b)` | `lab(50 20 -30)` |
| lab-d50 | `lab(L a b)` | `lab(100 0 0)` |
| lch-d65 | `lch(L C H)` | `lch(50 30 270)` |
| oklab | `oklab(L a b)` | `oklab(0.5 0.1 -0.1)` |
| oklch | `oklch(L C H)` | `oklch(0.7 0.15 180)` |

## Rounding Rules

| Context | Rule |
|---------|------|
| sRGB components | Multiply by 255, round to nearest integer, clamp to [0, 255] |
| General numeric values | Round to 4 decimal places, strip trailing zeros |
| Percentage values (HSL s/l, HWB w/b) | Multiply by 100, round to 2 decimal places, strip trailing zeros |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `serializeColor` | `(color: Color) -> string` | Serialize any typed color to its CSS string |

## Test Vectors

@provenance: CSS Color Level 4

| Input | Expected Output |
|-------|----------------|
| srgb `(1, 0, 0)` | `"rgb(255, 0, 0)"` |
| srgb `(0.5, 0.5, 0.5)` | `"rgb(128, 128, 128)"` |
| srgb `(1.5, -0.1, 0.5)` | `"rgb(255, 0, 128)"` (clamped) |
| linearRgb `(0.5, 0.3, 0.7)` | `"color(srgb-linear 0.5 0.3 0.7)"` |
| hsl `(120, 1, 0.5)` | `"hsl(120, 100%, 50%)"` |
| hsl `(240, 0.75, 0.333)` | `"hsl(240, 75%, 33.3%)"` |
| hwb `(0, 0, 0)` | `"hwb(0 0% 0%)"` |
| hwb `(120, 0.2, 0.3)` | `"hwb(120 20% 30%)"` |
| xyzD65 `(0.95047, 1, 1.08883)` | `"color(xyz-d65 0.9505 1 1.0888)"` |
| xyzD50 `(0.96422, 1, 0.82521)` | `"color(xyz-d50 0.9642 1 0.8252)"` |
| labD65 `(50, 20, -30)` | `"lab(50 20 -30)"` |
| labD50 `(100, 0, 0)` | `"lab(100 0 0)"` |
| lchD65 `(50, 30, 270)` | `"lch(50 30 270)"` |
| oklab `(0.5, 0.1, -0.1)` | `"oklab(0.5 0.1 -0.1)"` |
| oklch `(0.7, 0.15, 180)` | `"oklch(0.7 0.15 180)"` |
| oklab `(0.123456789, 0, 0)` | `"oklab(0.1235 0 0)"` (rounded to 4 dp) |

## Edge Cases

- **sRGB clamping**: Values outside [0, 1] are clamped before multiplying by 255.
- **Trailing zero stripping**: `0.5000` becomes `"0.5"`, not `"0.5000"`.
- **Integer display**: `1.0` becomes `"1"`, not `"1.0000"`.
- **lab-d65 as lab()**: Note: CSS `lab()` is defined as D50 per CSS Color Level 4. When serializing a `lab-d65` value as `lab(...)`, the output is syntactically valid but semantically represents D65 values, not D50. Consumers should be aware of this distinction.

## Error Cases

None. All valid Color types produce a valid CSS string.
