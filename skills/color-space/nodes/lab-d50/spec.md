# lab-d50 — Spec

Depends on: color-types, xyz-d50

## Purpose

Convert between CIE XYZ D50 and CIELAB D50. Same formula as lab-d65 but uses the D50
reference white point. D50 is the standard illuminant for ICC color profiles and print
workflows.

## Parameters

@provenance: CIE 15:2004, ICC specification, D50 illuminant

| Constant | Value | Description |
|----------|-------|-------------|
| `D50_WHITE` | `{ x: 0.96422, y: 1.0, z: 0.82521 }` | D50 reference white point |
| `EPSILON` | `216 / 24389` (~0.008856) | CIE threshold between linear and cube-root segments |
| `KAPPA` | `24389 / 27` (~903.296) | CIE slope for linear segment |

## Algorithm

### Forward: XYZ D50 to Lab D50

1. Normalize each XYZ component by the D50 white point: `t_x = X / Xn`, etc.
2. Apply transfer function `f(t)`:
   - If `t > EPSILON`: `f(t) = cbrt(t)`
   - Else: `f(t) = (KAPPA * t + 16) / 116`
3. Compute Lab:
   - `L = 116 * f(Y/Yn) - 16`
   - `a = 500 * (f(X/Xn) - f(Y/Yn))`
   - `b = 200 * (f(Y/Yn) - f(Z/Zn))`

### Inverse: Lab D50 to XYZ D50

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
| `xyzD50ToLabD50` | `(color: XyzD50) -> LabD50` | Convert CIE XYZ D50 to CIELAB D50 |
| `labD50ToXyzD50` | `(color: LabD50) -> XyzD50` | Convert CIELAB D50 to CIE XYZ D50 |

## Test Vectors

@provenance: CIE 15:2004, mathematical definition

| Input | Expected |
|-------|----------|
| XYZ D50 white `(0.96422, 1.0, 0.82521)` | Lab `(100, ~0, ~0)` |
| XYZ black `(0, 0, 0)` | Lab `(0, 0, 0)` |
| Lab `(100, 0, 0)` | XYZ D50 white `(0.96422, 1.0, 0.82521)` |
| Lab `(0, 0, 0)` | XYZ black `(0, 0, 0)` |
| Lab `(5, 0, 0)` | Y > 0, Y < 0.01 (low lightness, linear branch) |

## Edge Cases

- **Below epsilon**: Very small XYZ values (e.g., 0.001) trigger the linear segment of the transfer function.
- **Below epsilon inverse**: Low L values (e.g., L=5) trigger the linear inverse branch where `t^3 <= EPSILON`.
- **Round-trip accuracy**: XYZ D50 -> Lab D50 -> XYZ D50 must round-trip to at least 6 decimal places for values both above and below epsilon.

## Error Cases

None. All numeric inputs produce valid outputs.
