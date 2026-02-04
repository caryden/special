# pid — Spec

Depends on: `result-types`

## Purpose

Discrete-time PID controller with integral anti-windup (clamping), first-order
low-pass derivative filtering, and output clamping. Computes one control step
at a time, returning the output signal, updated state, and individual P/I/D
terms for debugging.

## Conventions

@provenance python-control v0.10.2 (API shape), DiscretePIDs.jl (anti-windup behavior)

- **Gain form**: Parallel form `u = kp*e + ki*integral(e*dt) + kd*de/dt`.
- **Anti-windup**: Integral clamping (not back-calculation). The integral accumulator
  is clamped to `[integralLimits.min, integralLimits.max]` after each update.
- **Derivative filtering**: First-order low-pass filter on the derivative term.
  `d_filtered = alpha * d_raw + (1 - alpha) * d_prev`, where `alpha` is
  `derivativeFilterCoeff` (1 = no filtering, 0 = full filtering).
- **Output clamping**: Final output is clamped to `[outputLimits.min, outputLimits.max]`.
- **Purity**: `pidStep` does not mutate the input state; it returns a new `PIDState`.

## Types

Types are defined in `result-types`:

### PIDConfig

| Field | Type | Description |
|-------|------|-------------|
| `gains` | PIDGains | `{ kp, ki, kd }` in parallel form |
| `outputLimits` | [number, number] | Output clamp `[min, max]` (default `[-Inf, Inf]`) |
| `integralLimits` | [number, number] | Anti-windup clamp `[min, max]` (default `[-Inf, Inf]`) |
| `derivativeFilterCoeff` | number | Low-pass alpha, 0..1 (default 1 = no filtering) |
| `sampleTime` | number | Sample period in seconds (default 0.01) |

### PIDState

| Field | Type | Description |
|-------|------|-------------|
| `integral` | number | Accumulated integral term |
| `previousError` | number | Error from previous step |
| `previousDerivative` | number | Previous filtered derivative |

### PIDOutput

| Field | Type | Description |
|-------|------|-------------|
| `output` | number | Control signal (after output clamping) |
| `state` | PIDState | Updated controller state |
| `terms` | `{ p, i, d }` | Individual P, I, D contributions |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `pidStep` | `(error, state, config) → PIDOutput` | Compute one PID step |
| `pidSequence` | `(errors[], config) → { outputs[], finalState }` | Run PID over a sequence of errors |

## Test Vectors

### P-only controller

@provenance mathematical-definition

| Input | Config | Expected |
|-------|--------|----------|
| error=5, kp=2, ki=0, kd=0 | initial state | output=10, p=10, i=0, d=0 |
| error=-3, kp=2, ki=0, kd=0 | initial state | output=-6 |
| error=0, kp=2, ki=0, kd=0 | initial state | output=0 |

### Integral accumulation

@provenance mathematical-definition

| Steps | Config | Expected integral |
|-------|--------|-------------------|
| error=2, error=2 | ki=1, dt=1 | i=2 after step 1, i=4 after step 2 |
| error=3, error=1 | ki=1, dt=1 | i=3 after step 1, i=4 after step 2 |
| error=4 | ki=2, dt=0.5 | i=4 (ki * error * dt = 2*4*0.5) |

### Anti-windup clamping

@provenance DiscretePIDs.jl (clamping behavior)

| Input | Config | Expected |
|-------|--------|----------|
| error=10 | ki=1, dt=1, integralLimits=[-5,5] | integral clamped to 5 |
| error=-10 | ki=1, dt=1, integralLimits=[-5,5] | integral clamped to -5 |
| error=10 then error=1 | kp=1, ki=1, dt=1, integralLimits=[-5,5] | step2: p=1, i=5 (still clamped), output=6 |

### Derivative term (alpha=1, no filtering)

@provenance mathematical-definition

| Input | Config | Expected |
|-------|--------|----------|
| error=5, prev_error=0 | kd=1, dt=0.1, alpha=1 | d_raw=50, d=50 |
| error=3 then error=3 | kd=1, dt=0.1, alpha=1 | step1: d=30, step2: d=0 |
| error=2, prev_error=5 | kd=1, dt=0.1, alpha=1 | d_raw=-30, d=-30 |

### Derivative filtering (alpha < 1)

@provenance python-control v0.10.2

| Input | Config | Expected |
|-------|--------|----------|
| error=5, prev=0 | kd=1, dt=0.1, alpha=0.5 | d_raw=50, filtered=0.5*50+0.5*0=25, d=25 |
| error=5 then error=5 | kd=1, dt=0.1, alpha=0.5 | step1: filtered=25, step2: raw=0, filtered=0.5*0+0.5*25=12.5, d=12.5 |

### Output clamping

@provenance mathematical-definition

| Input | Config | Expected |
|-------|--------|----------|
| error=5 | kp=100, outputLimits=[-10,10] | p=500, output clamped to 10 |
| error=-5 | kp=100, outputLimits=[-10,10] | p=-500, output clamped to -10 |

### Full PID (kp=2, ki=0.5, kd=0.1, dt=0.1, alpha=1)

@provenance mathematical-definition, cross-validated with python-control v0.10.2

| Step | Error | Expected P | Expected I | Expected D | Expected output |
|------|-------|-----------|-----------|-----------|-----------------|
| 1 | 10 | 20 | 0.5 | 10 | 30.5 |
| 2 | 10 | 20 | 1.0 | 0 | 21.0 |
| 2 (from step 1) | 5 | 10 | 0.75 | -5 | 5.75 |

### Setpoint change (integral unwind)

@provenance mathematical-definition

| Sequence | Config | Expected |
|----------|--------|----------|
| error=5, 5, -3 | kp=1, ki=1, dt=1 | integral: 5, 10, 7 |
| error=2, -5 | kp=1, ki=1, dt=1 | integral: 2, -3 (crosses zero) |

### pidSequence consistency

@provenance implementation-invariant

| Property | Verified |
|----------|----------|
| `pidSequence(errors, config).outputs` matches sequential `pidStep` calls | Yes |
| Output array length matches input error array length | Yes |
| Final state matches last `pidStep` state | Yes |
