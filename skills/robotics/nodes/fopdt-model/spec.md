# fopdt-model — Spec

Depends on: `result-types`

## Purpose

First-Order Plus Dead-Time (FOPDT) model identification and simulation. The FOPDT
transfer function `G(s) = K * exp(-theta*s) / (tau*s + 1)` is the standard plant
model used by all classical PID tuning methods. This node creates, validates,
simulates, and identifies FOPDT models from step response data.

## Conventions

@provenance Astrom & Hagglund "Advanced PID Control" 2006, Chapter 3

- **Model form**: `G(s) = K * exp(-theta*s) / (tau*s + 1)` where K is process gain,
  tau is time constant, theta is dead time (delay).
- **Identification**: Two-point method using 28.3% and 63.2% of final value.
  - `tau = 1.5 * (t63 - t28)`
  - `theta = max(0, t63 - tau)`
  - `K = deltaY / stepSize`
- **Interpolation**: Linear interpolation between data points for crossing detection.
- **Validation**: K must be non-zero, tau must be positive, theta must be non-negative.
  Negative gain (inverse-acting) is valid.

## Types

### FOPDTModel (from result-types)

| Field | Type | Description |
|-------|------|-------------|
| `K` | number | Process gain (dimensionless) |
| `tau` | number | Time constant (seconds) |
| `theta` | number | Dead time / delay (seconds) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `fopdtModel` | `(K, tau, theta) → FOPDTModel` | Create an FOPDT model from explicit parameters |
| `validateFOPDT` | `(model) → boolean` | Validate model parameters |
| `simulateFOPDT` | `(model, time[]) → number[]` | Simulate unit step response at given times |
| `identifyFOPDT` | `(time[], response[], stepSize, initialValue?) → FOPDTModel` | Identify model from step response data |

## Test Vectors

### Step response simulation

@provenance Astrom & Hagglund "Advanced PID Control" 2006, Eq. 3.2

| Model (K, tau, theta) | Time | Expected |
|-----------------------|------|----------|
| (2.0, 5.0, 1.0) | t=0 | y=0 (before dead time) |
| (2.0, 5.0, 1.0) | t=1.0 | y=0 (at dead time onset) |
| (2.0, 5.0, 1.0) | t=6.0 (theta+tau) | y ≈ 0.632 * 2.0 = 1.264 |
| (2.0, 5.0, 1.0) | t=1000 | y ≈ 2.0 (steady state) |

### Model identification (round-trip)

@provenance Astrom & Hagglund "Advanced PID Control" 2006, two-point method

| Original (K, tau, theta) | Identified K | Identified tau | Identified theta |
|--------------------------|-------------|----------------|------------------|
| (3.0, 10.0, 2.0) | ≈ 3.0 (tol 0.1) | — | — |
| (1.5, 8.0, 1.0) | — | ≈ 8.0 (tol ±1) | — |
| (2.0, 5.0, 3.0) | — | — | ≈ 3.0 (tol ±1) |
| (2.5, 10.0, 2.0) | K ± 1% | tau ± 5% | theta ± 5% |
| (0.8, 1.0, 0.5) | K ± 1% | tau ± 5% | theta ± 5% |

### Edge cases

@provenance mathematical-definition

| Test | Expected |
|------|----------|
| Zero dead time (theta=0), K=1.0, tau=5.0 | K ≈ 1.0, theta ≈ 0.0, tau ≈ 5.0 |
| Very small tau (0.1), K=1.0, theta=1.0 | K ≈ 1.0, tau ≈ 0.1 |
| Non-zero initial value (offset=10) | Identification correctly subtracts offset |
| Response that never crosses target levels | Interpolation fallback returns last time |

### Validation

@provenance mathematical-definition

| Model | Expected |
|-------|----------|
| K=2.0, tau=5.0, theta=1.0 | valid (true) |
| K=-1.5, tau=3.0, theta=0.0 | valid (true) — negative gain is OK |
| K=0, tau=5.0, theta=1.0 | invalid (false) — zero gain |
| K=1.0, tau=-1.0, theta=1.0 | invalid (false) — negative tau |
| K=1.0, tau=0, theta=1.0 | invalid (false) — zero tau |
| K=1.0, tau=5.0, theta=-1.0 | invalid (false) — negative theta |
