# pid-tuning-rules — Spec

Depends on: `result-types`

## Purpose

Classical PID tuning rules that compute controller gains from FOPDT model parameters
or ultimate gain parameters. Six methods are provided, each supporting P, PI, and/or
PID controller types. All methods compute gains in standard (ISA) form internally
and convert to parallel form `(kp, ki, kd)` for output.

## Conventions

@provenance O'Dwyer "Handbook of PI and PID Controller Tuning Rules" 3rd ed. 2009
@provenance Astrom & Hagglund "Advanced PID Control" 2006

- **Gain form**: Output is parallel form `{ kp, ki, kd }`. Internal computation uses
  standard form `{ kp, ti, td }` with conversion: `ki = kp/ti`, `kd = kp*td`.
- **FOPDT input**: `{ K, tau, theta }` — process gain, time constant, dead time.
- **Ultimate gain input**: `{ Ku, Tu }` — ultimate gain and ultimate period.
- **Controller types**: `'P'`, `'PI'`, `'PID'`. Some methods do not define P-only rules.

## Types

All types are defined in `result-types`:

- `PIDGains { kp, ki, kd }` — parallel form output
- `PIDGainsStandard { kp, ti, td }` — standard (ISA) form
- `FOPDTModel { K, tau, theta }` — FOPDT parameters
- `UltimateGainParams { Ku, Tu }` — ultimate gain parameters
- `TuningMethod` — `'ziegler-nichols' | 'cohen-coon' | 'tyreus-luyben' | 'simc' | 'lambda' | 'imc'`
- `ControllerType` — `'P' | 'PI' | 'PID'`

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `tuneZieglerNichols` | `(model, controllerType) → PIDGains` | ZN open-loop (reaction curve) |
| `tuneZieglerNicholsUltimate` | `(params, controllerType) → PIDGains` | ZN ultimate gain method |
| `tuneCohenCoon` | `(model, controllerType) → PIDGains` | Cohen-Coon method |
| `tuneTyreusLuyben` | `(params, controllerType) → PIDGains` | Tyreus-Luyben (PI/PID only) |
| `tuneSIMC` | `(model, controllerType, tau_c?) → PIDGains` | Skogestad IMC |
| `tuneLambda` | `(model, controllerType, lambda?) → PIDGains` | Lambda tuning |
| `tuneIMC` | `(model, controllerType, lambda?) → PIDGains` | Internal Model Control |
| `tune` | `(modelOrParams, method, controllerType, options?) → PIDGains` | Dispatcher |

### TuneOptions

| Field | Type | Description |
|-------|------|-------------|
| `tau_c` | number? | Closed-loop time constant for SIMC |
| `lambda` | number? | Lambda parameter for lambda/IMC methods |

## Test Vectors

### Test models

- **M1**: `{ K: 1, tau: 10, theta: 2 }` — moderate dead time
- **M2**: `{ K: 2, tau: 5, theta: 1 }` — faster, lower dead time
- **U1**: `{ Ku: 10, Tu: 4 }` — ultimate gain parameters

### Ziegler-Nichols open-loop

@provenance Ziegler & Nichols 1942, "Optimum Settings for Automatic Controllers"

| Model | Type | Expected kp | Expected ki | Expected kd |
|-------|------|------------|------------|------------|
| M1 | P | 5.0 | 0 | 0 |
| M1 | PI | 4.5 | 4.5 / (2/0.3) = 0.675 | 0 |
| M1 | PID | 6.0 | 1.5 | 6.0 |
| M2 | PID | 3.0 | 1.5 | 1.5 |

### Ziegler-Nichols ultimate gain

@provenance Ziegler & Nichols 1942

| Params | Type | Expected kp | Expected ki | Expected kd |
|--------|------|------------|------------|------------|
| U1 | P | 5.0 | 0 | 0 |
| U1 | PI | 4.5 | 4.5 / (4/1.2) = 1.35 | 0 |
| U1 | PID | 6.0 | 3.0 | 3.0 |

### Cohen-Coon

@provenance Cohen & Coon 1953

Using M1 where r = theta/tau = 0.2:

| Model | Type | Expected kp | Expected ki | Expected kd |
|-------|------|------------|------------|------------|
| M1 | P | 5 * (1 + 0.2/3) = 5.333 | 0 | 0 |
| M1 | PI | 5 * (0.9 + 0.2/12) = 4.583 | kp / ti | 0 |
| M1 | PID | 5 * (4/3 + 0.2/4) = 6.917 | kp / ti | kp * td |

Where for PID: `ti = 2*(32+6*0.2)/(13+8*0.2) = 4.548`, `td = 2*4/(11+2*0.2) = 0.702`

### Tyreus-Luyben

@provenance Tyreus & Luyben 1992

| Params | Type | Expected kp | Expected ki | Expected kd |
|--------|------|------------|------------|------------|
| U1 | P | throws "Tyreus-Luyben method does not define P-only tuning rules" | — | — |
| U1 | PI | 10/3.2 = 3.125 | 3.125 / 8.8 = 0.355 | 0 |
| U1 | PID | 10/2.2 = 4.545 | 4.545 / 8.8 = 0.516 | 4.545 * (4/6.3) = 2.886 |

### SIMC

@provenance Skogestad "Simple analytic rules for model reduction and PID controller tuning" 2003

| Model | Type | tau_c | Expected kp | Expected ki | Expected kd |
|-------|------|-------|------------|------------|------------|
| M1 | P | — | throws "SIMC method does not define P-only tuning rules" | — | — |
| M1 | PI | default (16) | 10/18 = 0.556 | 0.556/10 = 0.0556 | 0 |
| M1 | PID | default (16) | 0.556 | 0.0556 | 0.556 * 1 = 0.556 |
| M1 | PI | 5 | 10/7 = 1.429 | 1.429/10 = 0.143 | 0 |
| M2 | PI | default (8) | 5/18 = 0.278 | 0.278/5 = 0.0556 | 0 |

Default tau_c = max(tau, 8*theta).

### Lambda tuning

@provenance Dahlin 1968

Default lambda = 3*theta.

| Model | Type | lambda | Expected kp | Expected ki | Expected kd |
|-------|------|--------|------------|------------|------------|
| M1 | P | — | throws "Lambda tuning method does not define P-only tuning rules" | — | — |
| M1 | PI | default (6) | 1.25 | 0.125 | 0 |
| M1 | PID | default (6) | 1.25 | 0.125 | 1.25 |
| M1 | PI | 10 | 10/12 = 0.833 | 0.0833 | 0 |
| M2 | PID | default (3) | 0.625 | 0.125 | 0.3125 |

### IMC (Internal Model Control)

@provenance Rivera, Morari & Skogestad 1986

Default lambda = max(0.25*tau, 0.2*theta).

| Model | Type | lambda | Expected kp | Expected ki | Expected kd |
|-------|------|--------|------------|------------|------------|
| M1 | P | — | throws "IMC tuning method does not define P-only tuning rules" | — | — |
| M1 | PI | default (2.5) | 11/3.5 = 3.143 | 3.143/11 = 0.286 | 0 |
| M1 | PID | default (2.5) | 22/9 = 2.444 | 2.444/11 = 0.222 | 2.444 * (20/22) = 2.222 |
| M1 | PI | 5 | 11/6 = 1.833 | 1.833/11 = 0.167 | 0 |
| M2 | PID | default (1.25) | 11/9 = 1.222 | 1.222/5.5 = 0.222 | 1.222 * (5/11) = 0.556 |

### Dispatcher (tune)

@provenance implementation-invariant

| Test | Verified |
|------|----------|
| `tune(M1, 'ziegler-nichols', 'PID')` matches `tuneZieglerNichols(M1, 'PID')` | Yes |
| `tune(U1, 'ziegler-nichols', 'PID')` routes to ultimate gain variant | Yes |
| `tune(M1, 'cohen-coon', 'PID')` matches `tuneCohenCoon(M1, 'PID')` | Yes |
| `tune(U1, 'tyreus-luyben', 'PID')` matches `tuneTyreusLuyben(U1, 'PID')` | Yes |
| `tune(M1, 'simc', 'PI')` matches `tuneSIMC(M1, 'PI')` | Yes |
| `tune(M1, 'simc', 'PI', { tau_c: 5 })` passes custom tau_c | Yes |
| `tune(M1, 'lambda', 'PI')` matches `tuneLambda(M1, 'PI')` | Yes |
| `tune(M1, 'lambda', 'PI', { lambda: 10 })` passes custom lambda | Yes |
| `tune(M1, 'imc', 'PI')` matches `tuneIMC(M1, 'PI')` | Yes |
| `tune(M1, 'imc', 'PI', { lambda: 5 })` passes custom lambda | Yes |

### Error conditions

| Method | Controller type | Expected error |
|--------|----------------|----------------|
| Tyreus-Luyben | P | throws |
| SIMC | P | throws |
| Lambda | P | throws |
| IMC | P | throws |
