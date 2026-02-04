# result-types — Spec

Depends on: _(none — leaf node)_

## Purpose

Shared result, configuration, and type definitions used across robotics algorithms.
Plain interfaces — no classes.

@provenance PID control textbook definitions — parallel and ISA/standard gain forms, anti-windup, derivative filtering
@provenance FRC/WPILib conventions — ControlOutput (linear/angular), PlanResult structure

## Types

### ControlOutput

| Field | Type | Description |
|-------|------|-------------|
| `linear` | number | Linear velocity (m/s) |
| `angular` | number | Angular velocity (rad/s) |

### PIDGains (parallel form)

| Field | Type | Description |
|-------|------|-------------|
| `kp` | number | Proportional gain |
| `ki` | number | Integral gain |
| `kd` | number | Derivative gain |

### PIDGainsStandard (ISA form)

| Field | Type | Description |
|-------|------|-------------|
| `kp` | number | Proportional gain |
| `ti` | number | Integral time constant (seconds) |
| `td` | number | Derivative time constant (seconds) |

### PIDConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gains` | PIDGains | {kp:1, ki:0, kd:0} | Controller gains |
| `outputLimits` | [number, number] | [-Inf, Inf] | Output clamp |
| `integralLimits` | [number, number] | [-Inf, Inf] | Anti-windup limits |
| `derivativeFilterCoeff` | number | 1 | Low-pass filter (0-1) |
| `sampleTime` | number | 0.01 | Sample period (seconds) |

### PIDState

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `integral` | number | 0 | Accumulated integral |
| `previousError` | number | 0 | Previous error |
| `previousDerivative` | number | 0 | Previous filtered derivative |

### Point2D

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | X coordinate |
| `y` | number | Y coordinate |

### PlanResult

| Field | Type | Description |
|-------|------|-------------|
| `path` | Point2D[] | Ordered waypoints |
| `cost` | number | Total path cost/length |
| `success` | boolean | Whether a path was found |
| `nodesExplored` | number | Search nodes explored |

### IKResult

| Field | Type | Description |
|-------|------|-------------|
| `jointAngles` | number[] | Joint angles (radians) |
| `converged` | boolean | Whether solver converged |
| `positionError` | number | Final position error (meters) |
| `iterations` | number | Iterations performed |

### FOPDTModel

| Field | Type | Description |
|-------|------|-------------|
| `K` | number | Process gain |
| `tau` | number | Time constant (seconds) |
| `theta` | number | Dead time (seconds) |

### TuningMethod

Enum: `'ziegler-nichols'` | `'cohen-coon'` | `'tyreus-luyben'` | `'simc'` | `'lambda'` | `'imc'`

### ControllerType

Enum: `'P'` | `'PI'` | `'PID'`

### UltimateGainParams

| Field | Type | Description |
|-------|------|-------------|
| `Ku` | number | Ultimate gain |
| `Tu` | number | Ultimate period (seconds) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `defaultPIDConfig` | `(overrides?) → PIDConfig` | Defaults with optional overrides |
| `initialPIDState` | `() → PIDState` | All-zero state |
| `gainsToStandard` | `(PIDGains) → PIDGainsStandard` | Parallel → ISA form |
| `gainsToParallel` | `(PIDGainsStandard) → PIDGains` | ISA → parallel form |
| `point2d` | `(x, y) → Point2D` | Constructor |

## Test Vectors

### defaultPIDConfig

@provenance Structural — default construction and override merging

| Input | Expected |
|-------|----------|
| `defaultPIDConfig()` | gains={kp:1,ki:0,kd:0}, sampleTime=0.01, outputLimits=[-Inf,Inf] |
| `defaultPIDConfig({gains:{kp:2,ki:0.5,kd:1}, sampleTime:0.02})` | gains overridden, outputLimits unchanged |

### Gains conversion

@provenance PID control textbook definitions (parallel vs ISA/standard form)

| Input (parallel) | Expected (standard) |
|-------------------|---------------------|
| {kp:2, ki:0.5, kd:1} | {kp:2, ti:4, td:0.5} |
| {kp:5, ki:0, kd:0} (P-only) | {kp:5, ti:Infinity, td:0} |

| Input (standard) | Expected (parallel) |
|-------------------|---------------------|
| {kp:2, ti:4, td:0.5} | {kp:2, ki:0.5, kd:1} |

| Round-trip test | Expected |
|-----------------|----------|
| parallel → standard → parallel | exact recovery |
| standard → parallel → standard | exact recovery |
| P-only roundtrip | ki=0, kd=0 preserved |

### Edge cases

@provenance PID control theory — boundary behavior for zero gains

| Test | Expected |
|------|----------|
| ki=0 → ti=Infinity | verified |
| kp=0 → td=0 | verified |
