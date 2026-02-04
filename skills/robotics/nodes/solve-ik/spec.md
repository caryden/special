# solve-ik -- Spec

Depends on: `result-types`, `any-of(jacobian-ik, ccd, fabrik)`

## Purpose

Unified IK dispatcher. Routes to the jacobian (damped least squares), CCD, or
FABRIK solver based on a `method` parameter. Default method: `'jacobian'`.

### Key design decisions

- **Thin routing layer.** All real IK logic lives in the downstream solver nodes.
  This node is a single switch on the method string.
- **Default to jacobian.** When no method is specified, uses damped least-squares
  Jacobian IK as the most general-purpose solver.
- **DH-to-FABRIK conversion.** FABRIK works with link lengths, not DH parameters.
  The dispatcher extracts link lengths from each joint's DH `a` and `d` parameters
  as `sqrt(a^2 + d^2)` and delegates to `fabrikSolveAngles`.
- **Options passthrough.** `maxIterations` and `tolerance` are forwarded to all
  methods. `damping` and `stepSize` are forwarded only to the jacobian solver.

## Types

### IKMethod

```
'jacobian' | 'ccd' | 'fabrik'
```

### SolveIKOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `method` | IKMethod | `'jacobian'` | IK solver method to use |
| `maxIterations` | number | _(solver default)_ | Maximum iterations (passed to underlying solver) |
| `tolerance` | number | _(solver default)_ | Position error tolerance in meters |
| `damping` | number | _(solver default)_ | Damping factor (jacobian method only) |
| `stepSize` | number | _(solver default)_ | Step size scaling (jacobian method only) |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `solveIK` | `(joints: DHJoint[], target: [number,number,number], initialAngles: number[], options?: SolveIKOptions) -> IKResult` | Solve position-only IK using the specified method |

### solveIK behavior

1. Read `method` from options, defaulting to `'jacobian'`.
2. Build solver-specific config by merging provided options over the solver's defaults.
3. Dispatch:
   - `'jacobian'` -> `jacobianIK(joints, target, initialAngles, config)`
   - `'ccd'` -> `ccdSolve(joints, target, initialAngles, config)`
   - `'fabrik'` -> extract link lengths from DH joints, call `fabrikSolveAngles(linkLengths, {x,y,z}, config)`
4. Return the IKResult from the downstream solver.

## Test Vectors

### Method routing

@provenance API design -- all methods handle the same 2-link problem

| Test | Setup | Expected |
|------|-------|----------|
| Defaults to jacobian | joints=twoLinkPlanar(1,1), target=[1,1,0], initial=[0.5,0.5], no options | converged=true, positionError < 0.01 |
| method='jacobian' converges | same setup, method='jacobian' | converged=true, positionError < 0.01 |
| method='ccd' converges | same setup, method='ccd' | converged=true, positionError < 0.01 |
| method='fabrik' converges | same setup, method='fabrik' | converged=true, positionError < 0.01 |

### FK round-trip

@provenance structural -- IK result verified against forward kinematics

| Test | Setup | Expected |
|------|-------|----------|
| Jacobian result matches FK | target=[1.2,0.8,0], method='jacobian' | converged=true, FK(result.jointAngles) matches target to 2 decimals |
| CCD result matches FK | target=[1.2,0.8,0], method='ccd' | converged=true, FK(result.jointAngles) matches target to 2 decimals |

### Options passthrough

@provenance structural -- options forwarded to underlying solver

| Test | Setup | Expected |
|------|-------|----------|
| maxIterations=1 limits iterations | method='jacobian', maxIterations=1 | result.iterations <= 1 |
| tolerance=0.1 accepted | method='jacobian', tolerance=0.1 | converged=true, positionError < 0.1 |
| damping forwarded to jacobian | method='jacobian', damping=0.1 | converged=true |

### Unreachable target

@provenance structural -- graceful failure outside workspace

| Test | Setup | Expected |
|------|-------|----------|
| Far target does not converge | target=[5,5,0], method='jacobian', maxIterations=50 | converged=false, positionError > 0.1 |
