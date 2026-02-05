# lab-d65 — Spec

Depends on: color-types, xyz-d65

## Purpose

Convert between CIE XYZ D65 and CIELAB D65. CIELAB is a perceptually uniform color
space where L is lightness (0-100), a is green-red, and b is blue-yellow. The D65
variant uses the standard daylight illuminant as white reference.

## Parameters

@provenance: CIE 15:2004, 2-degree standard observer, D65 illuminant

| Constant | Value | Description |
|----------|-------|-------------|
| `D65_WHITE` | `{ x: 0.95047, y: 1.0, z: 1.08883 }` | D65 reference white point (2-degree observer) |
| `EPSILON` | `216 / 24389` (~0.008856) | CIE threshold between linear and cube-root segments |
| `KAPPA` | `24389 / 27` (~903.296) | CIE slope for linear segment |

## Algorithm

### Forward: XYZ D65 to Lab D65

1. Normalize each XYZ component by the D65 white point: `t_x = X / Xn`, etc.
2. Apply transfer function `f(t)`:
   - If `t > EPSILON`: `f(t) = cbrt(t)`
   - Else: `f(t) = (KAPPA * t + 16) / 116`
3. Compute Lab:
   - `L = 116 * f(Y/Yn) - 16`
   - `a = 500 * (f(X/Xn) - f(Y/Yn))`
   - `b = 200 * (f(Y/Yn) - f(Z/Zn))`

### Inverse: Lab D65 to XYZ D65

1. Compute intermediate values:
   - `fy = (L + 16) / 116`
   - `fx = a / 500 + fy`
   - `fz = fy - b / 200`
2. Apply inverse transfer function `f_inv(t)`:
   - If `t^3 > EPSILON`: `f_inv(t) = t^3`
   - Else: `f_inv(t) = (116 * t - 16) / KAPPA`
3. Scale by white point: `X = f_inv(fx) * Xn`, etc.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `xyzD65ToLabD65` | `(color: XyzD65) -> LabD65` | Convert CIE XYZ D65 to CIELAB D65 |
| `labD65ToXyzD65` | `(color: LabD65) -> XyzD65` | Convert CIELAB D65 to CIE XYZ D65 |

## Test Vectors

@provenance: CIE 15:2004, mathematical definition

| Input | Expected |
|-------|----------|
| XYZ D65 white `(0.95047, 1.0, 1.08883)` | Lab `(100, ~0, ~0)` |
| XYZ black `(0, 0, 0)` | Lab `(0, 0, 0)` |
| sRGB red XYZ `(0.4124, 0.2126, 0.0193)` | Lab `(~53.23, a > 0, b > 0)` |
| Lab `(100, 0, 0)` | XYZ D65 white `(0.95047, 1.0, 1.08883)` |
| Lab `(0, 0, 0)` | XYZ black `(0, 0, 0)` |
| Lab `(50, 0, 0)` | Y ~0.1842 (mid-gray) |

## Edge Cases

- **Below epsilon**: Very small XYZ values (e.g., 0.001) trigger the linear segment of the transfer function rather than the cube-root branch.
- **Below epsilon inverse**: Low L values (e.g., L=5) trigger the linear inverse branch where `t^3 <= EPSILON`.
- **Round-trip accuracy**: XYZ -> Lab -> XYZ must round-trip to at least 6 decimal places for values both above and below epsilon.

## Error Cases

None. All numeric inputs produce valid outputs.
