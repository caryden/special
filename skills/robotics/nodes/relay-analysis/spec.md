# relay-analysis — Spec

Depends on: `result-types`

## Purpose

Extract ultimate gain (Ku) and ultimate period (Tu) from relay feedback test data.
The relay method forces a system into sustained oscillation using an on/off controller.
From the oscillation amplitude `a` and relay amplitude `d`:

    Ku = 4d / (pi * a)
    Tu = oscillation period (from zero crossings)

The extracted Ku and Tu feed into Ziegler-Nichols ultimate gain and Tyreus-Luyben
tuning rules (via `pid-tuning-rules`).

## Conventions

@provenance Astrom & Hagglund "Automatic Tuning of PID Controllers" 1984

- **Describing function**: The relay produces a fundamental harmonic that sustains
  oscillation at the plant's critical frequency. `Ku = 4d / (pi * a)` comes from
  the describing function of an ideal relay with amplitude `d`.
- **Amplitude estimation**: Peak-to-peak method: `a = (max - min) / 2` after
  subtracting the steady-state offset.
- **Period estimation**: Average full period from zero crossings:
  `Tu = 2 * mean(half-period)` where half-periods are gaps between consecutive
  zero crossings.
- **Zero crossings**: Detected when adjacent samples have opposite signs, or when
  a sample is exactly zero with a non-zero predecessor.

## Types

### UltimateGainParams (from result-types)

| Field | Type | Description |
|-------|------|-------------|
| `Ku` | number | Ultimate gain |
| `Tu` | number | Ultimate period (seconds) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `findZeroCrossings` | `(signal[], offset?) → number[]` | Find indices where signal crosses zero |
| `estimateAmplitude` | `(signal[], offset?) → number` | Estimate oscillation amplitude (half peak-to-peak) |
| `estimatePeriod` | `(time[], crossingIndices[]) → number` | Estimate oscillation period from crossings |
| `generateRelayOscillation` | `(Ku, Tu, relayAmplitude, duration, sampleRate) → { time[], output[] }` | Generate synthetic relay oscillation |
| `analyzeRelay` | `(time[], output[], relayAmplitude, steadyStateOffset?) → UltimateGainParams` | Extract Ku and Tu from relay test data |

## Test Vectors

### Generated oscillation properties

@provenance Astrom & Hagglund 1984, Ku = 4d / (pi * a)

| Ku | Tu | d | Expected amplitude | Verified |
|----|----|----|-------------------|----------|
| 5.0 | 2.0 | 1.0 | a = 4/(pi*5) ≈ 0.2546 | max(output) ≈ 0.2546 |
| 3.0 | 4.0 | 2.0 | period from crossings ≈ 4.0 | within tol 0.1 |

### Zero crossings

@provenance mathematical-definition

| Signal | Offset | Expected crossings |
|--------|--------|-------------------|
| sin(2*pi*t), 100 samples, 1 period | 0 | 1 to 3 crossings detected |
| [1, 1, -1, -1, 1, 1, -1, -1] | 0 | indices [2, 4, 6] |
| [1, 0, -1] | 0 | index 1 (exact zero landing) |
| [5.5, 6.0, 4.5, 4.0, 5.5, 6.0, 4.5, 4.0] | 5.0 | indices [2, 4, 6] |

### Amplitude estimation

@provenance mathematical-definition

| Signal | Offset | Expected amplitude |
|--------|--------|-------------------|
| 3.0 * sin(2*pi*t), 1000 samples | 0 | ≈ 3.0 |
| 10.0 + 2.0 * sin(2*pi*t), 1000 samples | 10.0 | ≈ 2.0 |

### Period estimation

@provenance mathematical-definition

| Signal | Tu | Expected |
|--------|-----|----------|
| sin(2*pi*t/2.0), sampleRate=200, 10s | 2.0 | ≈ 2.0 (tol 0.1) |
| fewer than 2 crossings | — | returns 0 |

### Round-trip: generate then analyze

@provenance Astrom & Hagglund 1984

| Ku | Tu | d | Duration | Sample rate | Ku recovery | Tu recovery |
|----|----|----|----------|-------------|-------------|-------------|
| 5.0 | 2.0 | 1.0 | 20s | 500 Hz | ± 5% | ± 2% |
| 10.0 | 0.5 | 3.0 | 10s | 1000 Hz | ± 5% | ± 2% |
| 4.0 | 3.0 | 2.0 | 30s | 200 Hz (auto-offset) | ± 5% | ± 5% |

### Edge cases

@provenance mathematical-definition

| Test | Ku | Tu | d | Expected |
|------|----|----|---|----------|
| Very slow oscillation | 2.0 | 20.0 | 1.0 | Ku ± 5%, Tu ± 2% |
| High-frequency oscillation | 8.0 | 0.1 | 1.0 | Ku ± 5%, Tu ± 2% |
| Small deterministic noise (2% of amplitude) | 5.0 | 2.0 | 1.0 | Ku ± 10% |
