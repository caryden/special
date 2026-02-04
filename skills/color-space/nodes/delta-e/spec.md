# delta-e — Spec

Depends on: color-types, lab-d65, oklch

## Purpose

Compute perceptual color differences. Provides three metrics:
- **CIE76**: Simple Euclidean distance in CIELAB (fast, less accurate for large differences).
- **CIEDE2000**: Perceptually uniform metric with lightness, chroma, and hue weighting corrections.
- **deltaEOk**: Euclidean distance in Oklab space via Oklch coordinates.

## Parameters

### deltaE2000 weighting factors

@provenance: Sharma, Wu, Dalal, "The CIEDE2000 Color-Difference Formula", 2005

| Parameter | Default | Description |
|-----------|---------|-------------|
| `kL` | 1 | Lightness weighting factor |
| `kC` | 1 | Chroma weighting factor |
| `kH` | 1 | Hue weighting factor |

## Algorithm

### CIE76

@provenance: CIE 15:2004

Euclidean distance in CIELAB:

```
deltaE76 = sqrt((L1-L2)^2 + (a1-a2)^2 + (b1-b2)^2)
```

### CIEDE2000

@provenance: Sharma, Wu, Dalal, 2005

**Step 1**: Compute adjusted a' and C', h' values:
1. `C1 = sqrt(a1^2 + b1^2)`, `C2 = sqrt(a2^2 + b2^2)`
2. `Cab = (C1 + C2) / 2`
3. `G = 0.5 * (1 - sqrt(Cab^7 / (Cab^7 + 25^7)))` where `25^7 = 6103515625`
4. `a1' = a1 * (1 + G)`, `a2' = a2 * (1 + G)`
5. `C1' = sqrt(a1'^2 + b1^2)`, `C2' = sqrt(a2'^2 + b2^2)`
6. `h1' = atan2(b1, a1')` in degrees [0, 360), `h2'` similarly

**Step 2**: Compute differences:
1. `dL' = L2 - L1`
2. `dC' = C2' - C1'`
3. `dh'`:
   - If `C1' * C2' == 0`: `dh' = 0`
   - Else if `|h2' - h1'| <= 180`: `dh' = h2' - h1'`
   - Else if `h2' - h1' > 180`: `dh' = h2' - h1' - 360`
   - Else: `dh' = h2' - h1' + 360`
4. `dH' = 2 * sqrt(C1' * C2') * sin(dh'/2 * DEG_TO_RAD)`

**Step 3**: Compute CIEDE2000 result:
1. `L' = (L1 + L2) / 2`, `C' = (C1' + C2') / 2`
2. Compute mean hue `h'` with appropriate wrapping for achromatic and >180 cases
3. Compute `T`, `SL`, `SC`, `SH`, `RT` correction terms
4. `deltaE = sqrt((dL'/(kL*SL))^2 + (dC'/(kC*SC))^2 + (dH'/(kH*SH))^2 + RT*(dC'/(kC*SC))*(dH'/(kH*SH)))`

### deltaEOk

Euclidean distance in Oklab coordinates derived from Oklch:
1. Convert each Oklch color to Oklab: `a = C*cos(H)`, `b = C*sin(H)`
2. `deltaEOk = sqrt((L1-L2)^2 + (a1-a2)^2 + (b1-b2)^2)`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `deltaE76` | `(a: LabD65, b: LabD65) -> number` | CIE76 Euclidean distance in CIELAB |
| `deltaE2000` | `(lab1: LabD65, lab2: LabD65, kL?: number, kC?: number, kH?: number) -> number` | CIEDE2000 perceptual color difference |
| `deltaEOk` | `(a: Oklch, b: Oklch) -> number` | Oklch Euclidean distance |

## Test Vectors

### CIE76

@provenance: mathematical definition (Euclidean distance)

| Input | Expected |
|-------|----------|
| Lab `(50,20,-30)` vs itself | `0` |
| Lab `(50,20,-30)` vs `(60,30,-20)` | `sqrt(300)` (~17.32) |
| Lab `(50,0,0)` vs `(60,0,0)` | `10` |
| Lab `(0,0,0)` vs `(100,0,0)` | `100` |

### CIEDE2000

@provenance: Sharma, Wu, Dalal, 2005, Table 1

| Input (Lab pair) | Expected deltaE |
|------------------|-----------------|
| `(50, 2.6772, -79.7751)` vs `(50, 0, -82.7485)` | ~2.0425 |
| `(50, 3.1571, -77.2803)` vs `(50, 0, -82.7485)` | ~2.8615 |
| `(50, 2.8361, -74.0200)` vs `(50, 0, -82.7485)` | ~3.4412 |
| `(50, 0, 0)` vs `(50, -1, 2)` (achromatic pair 7) | ~2.3669 |
| `(50, 2.5, 0)` vs `(56, -27, -3)` (pair 13) | ~31.9030 |
| Identical Lab colors | `0` |
| Custom kL=2 reduces result vs kL=1 | `custom < default` |

### deltaEOk

@provenance: mathematical definition (Euclidean distance in Oklab)

| Input | Expected |
|-------|----------|
| Oklch `(0.5, 0.15, 180)` vs itself | `0` |
| Oklch `(0.3, 0, 0)` vs `(0.5, 0, 0)` | `0.2` |
| Oklch `(0.5, 0.1, 90)` vs `(0.5, 0.2, 90)` | `~0.1` |
| Oklch `(0.5, 0.1, 0)` vs `(0.5, 0.1, 180)` | `~0.2` (diameter of chroma circle) |

## Edge Cases

- **Identical colors**: All metrics return exactly 0.
- **Achromatic colors in CIEDE2000**: When `C1'*C2' == 0`, hue difference `dh'` is set to 0.
- **Hue wrapping in CIEDE2000**: Handles hue differences > 180 degrees with appropriate wrap-around in both the `dh'` and mean hue `h'` calculations.
- **Mean hue averaging**: Three branches for `h'` depending on whether colors are achromatic, hue gap <= 180, or hue gap > 180 with sum < or >= 360.

## Error Cases

None. All numeric inputs produce valid non-negative outputs.
