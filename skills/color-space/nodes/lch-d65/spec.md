# lch-d65 — Spec

Depends on: color-types, lab-d65

## Purpose

Convert between CIELAB D65 (rectangular) and LCH D65 (cylindrical/polar form).
LCH represents Lightness, Chroma, and Hue -- the polar coordinate form of Lab where
chroma is the distance from the neutral axis and hue is the angle.

## Parameters

@provenance: CIE 15:2004

| Constant | Value | Description |
|----------|-------|-------------|
| `RAD_TO_DEG` | `180 / PI` | Radians to degrees conversion factor |
| `DEG_TO_RAD` | `PI / 180` | Degrees to radians conversion factor |
| Achromatic threshold | `1e-10` | Chroma below this is treated as achromatic |

## Algorithm

### Forward: Lab D65 to LCH D65

1. Compute chroma: `C = sqrt(a^2 + b^2)`
2. If `C < 1e-10` (achromatic): return `(L, 0, 0)` -- hue is 0 by convention.
3. Compute hue: `H = atan2(b, a)` in degrees.
4. If `H < 0`: add 360 to normalize to `[0, 360)`.

### Inverse: LCH D65 to Lab D65

1. If `C < 1e-10` (achromatic): return `(L, 0, 0)`.
2. Convert hue to radians: `h_rad = H * DEG_TO_RAD`.
3. Compute rectangular coordinates:
   - `a = C * cos(h_rad)`
   - `b = C * sin(h_rad)`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `labD65ToLchD65` | `(color: LabD65) -> LchD65` | Convert CIELAB D65 to LCH D65 (polar form) |
| `lchD65ToLabD65` | `(color: LchD65) -> LabD65` | Convert LCH D65 back to CIELAB D65 |

## Test Vectors

@provenance: CIE 15:2004, mathematical definition (polar coordinates)

| Input | Expected |
|-------|----------|
| Lab `(50, 0, 0)` (achromatic) | LCH `(50, 0, 0)` |
| Lab `(50, 1e-12, 1e-12)` (near-achromatic) | LCH `(50, 0, 0)` |
| Lab `(50, 30, 0)` (+a axis) | LCH `(50, 30, ~0)` |
| Lab `(50, 0, 30)` (+b axis) | LCH `(50, 30, ~90)` |
| Lab `(50, -30, 0)` (-a axis) | LCH `(50, 30, ~180)` |
| Lab `(50, 0, -30)` (-b axis) | LCH `(50, 30, ~270)` |
| Lab `(50, 3, 4)` | LCH `(50, 5, ...)` (3-4-5 triangle) |
| LCH `(50, 0, 180)` (achromatic) | Lab `(50, 0, 0)` |
| LCH `(50, 30, 0)` | Lab `(50, 30, ~0)` |
| LCH `(50, 30, 90)` | Lab `(50, ~0, 30)` |

## Edge Cases

- **Achromatic colors**: When `a = 0` and `b = 0` (or chroma < 1e-10), hue is undefined. Convention: hue = 0.
- **Near-achromatic**: Very small a/b values (e.g., 1e-12) are treated as achromatic to avoid noise in hue angle.
- **Negative atan2 result**: `atan2` can return negative angles; these are normalized to `[0, 360)` by adding 360.
- **Round-trip accuracy**: Lab -> LCH -> Lab must round-trip to at least 8 decimal places.

## Error Cases

None. All numeric inputs produce valid outputs.
