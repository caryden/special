# oklch — Spec

Depends on: color-types, oklab

## Purpose

Convert between Oklab (Cartesian) and Oklch (polar/cylindrical) representations.
Oklch uses lightness, chroma, and hue angle, making it intuitive for hue manipulation
and color palette generation.

## Parameters

@provenance: Bjorn Ottosson, https://bottosson.github.io/posts/oklab/; achromatic hue = 0 by convention

| Parameter | Value | Description |
|-----------|-------|-------------|
| Achromatic threshold | `1e-10` | Chroma below this is treated as zero (achromatic) |
| Achromatic hue | `0` | Hue assigned to achromatic colors by convention |
| RAD_TO_DEG | `180 / pi` | Radian to degree conversion factor |
| DEG_TO_RAD | `pi / 180` | Degree to radian conversion factor |

## Algorithm

@provenance: Bjorn Ottosson; standard Cartesian-to-polar conversion

**Oklab to Oklch:**
1. Compute chroma: `C = sqrt(a^2 + b^2)`
2. If `C < 1e-10` (achromatic), return `(L, 0, 0)`
3. Compute hue: `H = atan2(b, a) * (180 / pi)`
4. If `H < 0`, add 360 to normalize to [0, 360)
5. Return `(L, C, H)`

**Oklch to Oklab:**
1. If `C < 1e-10` (achromatic), return `(L, 0, 0)`
2. Convert hue to radians: `hRad = H * (pi / 180)`
3. Compute Cartesian: `a = C * cos(hRad)`, `b = C * sin(hRad)`
4. Return `(L, a, b)`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `oklabToOklch` | `(color: Oklab) -> Oklch` | Convert Oklab to Oklch (Cartesian to polar) |
| `oklchToOklab` | `(color: Oklch) -> Oklab` | Convert Oklch to Oklab (polar to Cartesian) |

## Test Vectors

@provenance: mathematical definition (polar/Cartesian conversion)

| Input | Expected |
|-------|----------|
| `oklab(0.5, 0, 0)` -> Oklch | `oklch(0.5, 0, 0)` — achromatic (C=0, H=0) |
| `oklab(0.5, 1e-12, 1e-12)` -> Oklch | `oklch(0.5, 0, 0)` — near-achromatic snaps to C=0, H=0 |
| `oklab(0.5, 0.1, 0)` -> Oklch | `oklch(0.5, 0.1, 0)` — positive a axis, H=0 |
| `oklab(0.5, 0, 0.1)` -> Oklch | `oklch(0.5, 0.1, 90)` — positive b axis, H=90 |
| `oklab(0.5, -0.1, 0)` -> Oklch | `oklch(0.5, 0.1, 180)` — negative a axis, H=180 |
| `oklab(0.5, 0, -0.1)` -> Oklch | `oklch(0.5, 0.1, 270)` — negative b axis, H=270 |
| `oklab(0.5, 0.1, 0.1)` -> Oklch | `oklch(0.5, ~0.1414, 45)` — diagonal, H=45 |
| `oklch(0.5, 0, 180)` -> Oklab | `oklab(0.5, 0, 0)` — achromatic (hue ignored) |
| `oklch(0.5, 0.1, 0)` -> Oklab | `oklab(0.5, 0.1, 0)` — H=0 on positive a axis |
| `oklch(0.5, 0.1, 90)` -> Oklab | `oklab(0.5, 0, 0.1)` — H=90 on positive b axis |
| `oklch(0.5, 0.1, 180)` -> Oklab | `oklab(0.5, -0.1, 0)` — H=180 on negative a axis |

### Round-trip vectors

| Input | Round-trip Expected |
|-------|---------------------|
| `oklab(0.5, 0.1, 0.05)` | Oklab -> Oklch -> Oklab preserves to 8+ decimal places |
| `oklab(0.8, -0.15, 0.1)` | Oklab -> Oklch -> Oklab preserves to 8+ decimal places |
| `oklab(0.3, 0.05, -0.2)` | Oklab -> Oklch -> Oklab preserves to 8+ decimal places |
| `oklab(1, 0, 0)` | Oklab -> Oklch -> Oklab preserves to 8+ decimal places |

## Edge Cases

- **Achromatic colors**: when `C < 1e-10`, hue is undefined; both directions set `a = 0, b = 0`
  and `H = 0`
- Achromatic Oklch with non-zero hue: hue is ignored when C < threshold
- `atan2(0, 0)` returns 0 in most implementations, but the achromatic threshold check
  catches this case before atan2 is called
- Negative hue from `atan2` is normalized by adding 360
- Lightness L passes through unchanged in both directions

## Error Cases

- None. All operations (sqrt, atan2, cos, sin) are defined for all real inputs.
  The achromatic threshold prevents division-by-zero issues in hue computation.
