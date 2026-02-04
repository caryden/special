# mpc — Spec

Depends on: `mat-ops`, `state-types`, `result-types`, `optimization:bfgs`

## Purpose

Model Predictive Control (MPC) using direct single-shooting. At each time step,
solve a finite-horizon optimal control problem by optimizing the control sequence
`[u_0, ..., u_{N-1}]` via BFGS. Only the first control action is applied
(receding horizon principle).

## Conventions

@provenance ModelPredictiveControl.jl v1.15.0 (concept), Drake (concept)

- **Direct shooting**: Decision variables are the flattened control sequence. States
  are computed by forward simulation through the dynamics function.
- **Optimizer**: BFGS with backtracking line search (Armijo condition). In translation,
  replace the embedded BFGS with `optimization:bfgs` from the optimization skill.
- **Gradient**: Forward finite differences with step `eps = 1e-7`.
- **Receding horizon**: `mpcFirstControl` extracts only `u_0` from the solved sequence.
- **Control bounds**: Optional per-dimension clamping applied after each BFGS step.
- **Warm start**: Optional initial guess for the control sequence (e.g., from
  previous solve shifted by one step).

## Types

### MPCProblem

| Field | Type | Description |
|-------|------|-------------|
| `stateDim` | number | State dimension |
| `controlDim` | number | Control dimension |
| `horizon` | number | Prediction horizon N (number of steps) |
| `dynamics` | `(state[], control[]) → state[]` | Discrete-time dynamics `x_{k+1} = f(x_k, u_k)` |
| `stageCost` | `(state[], control[]) → number` | Stage cost `L(x_k, u_k)` |
| `terminalCost` | `(state[]) → number` | Terminal cost `Phi(x_N)` |

### MPCConfig

| Field | Type | Description |
|-------|------|-------------|
| `maxIterations` | number | Maximum BFGS iterations (default 100) |
| `gradTol` | number | Gradient infinity-norm tolerance (default 1e-6) |
| `controlMin` | number[]? | Per-dimension lower bounds |
| `controlMax` | number[]? | Per-dimension upper bounds |

### MPCResult

| Field | Type | Description |
|-------|------|-------------|
| `controlSequence` | number[] | Optimal controls flattened `[u_0, ..., u_{N-1}]` |
| `stateTrajectory` | number[][] | Predicted states `[x_0, ..., x_N]` (length N+1) |
| `cost` | number | Total cost of the optimal trajectory |
| `converged` | boolean | Whether gradient norm fell below `gradTol` |
| `iterations` | number | Number of BFGS iterations performed |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `mpcSimulate` | `(problem, initialState, controls) → number[][]` | Forward-simulate trajectory |
| `mpcCost` | `(problem, initialState, controls) → number` | Evaluate total cost |
| `mpcSolve` | `(problem, initialState, warmStart?, config?) → MPCResult` | Solve MPC via BFGS |
| `mpcFirstControl` | `(result, controlDim) → number[]` | Extract first control action |

## Test Vectors

### Test problems

- **1D integrator**: stateDim=1, controlDim=1, horizon=5, `x_{k+1} = x + u`,
  stageCost = `x^2 + 0.1*u^2`, terminalCost = `10*x^2`
- **2D double integrator**: stateDim=2, controlDim=1, horizon=10, dt=0.1,
  `[pos + dt*vel, vel + dt*u]`, stageCost = `pos^2 + vel^2 + 0.01*u^2`,
  terminalCost = `100*(pos^2 + vel^2)`
- **2x2 system**: stateDim=2, controlDim=2, horizon=3, `[x1+u1, x2+u2]`,
  stageCost = `x1^2 + x2^2 + 0.1*(u1^2 + u2^2)`, terminalCost = `5*(x1^2 + x2^2)`

### Simulation (mpcSimulate)

@provenance mathematical-definition

| Problem | Initial state | Controls | Expected trajectory |
|---------|--------------|----------|---------------------|
| 1D integrator | [0] | [1,1,1,1,1] | [0], [1], [2], [3], [4], [5] |
| 2x2 system | [0,0] | [1,2,3,4,5,6] | [0,0], [1,2], [4,6], [9,12] |
| 1D integrator | [5] | [0,0,0,0,0] | all states = [5] |

### Cost evaluation (mpcCost)

@provenance mathematical-definition

| Problem | Initial state | Controls | Expected cost |
|---------|--------------|----------|---------------|
| 1D integrator | [0] | [0,0,0,0,0] | 0 |
| 1D integrator | [1] | [0,0,0,0,0] | 15 (5 stages * 1 + terminal 10*1) |

### Solve behavior

@provenance ModelPredictiveControl.jl v1.15.0 (concept)

| Problem | Initial state | Expected |
|---------|--------------|----------|
| 1D integrator | [3] | converged=true, cost < zero-control cost, first control < 0 |
| 1D integrator | [-3] | converged=true, first control > 0 |
| 1D integrator | [0] | cost ≈ 0, all controls ≈ 0 |
| double integrator | [5, 0] | converged=true, cost < zero-control cost |
| 2x2 system | [3, -2] | converged=true, trajectory length=4, controlSeq length=6 |

### Warm start

@provenance implementation-invariant

| Test | Expected |
|------|----------|
| Warm start with [-0.5, -0.5, -0.5, -0.5, -0.5] from [3] | converged=true, cost < zero-control cost |

### Control bounds

@provenance implementation-invariant

| Problem | Bounds | Initial | Expected |
|---------|--------|---------|----------|
| 1D integrator | min=[-0.5], max=[0.5] | [5] | all u in [-0.5, 0.5] |
| 1D integrator | min=[-0.1] only | [5] | all u >= -0.1 |
| 1D integrator | max=[0.1] only | [-5] | all u <= 0.1 |
| 2x2 system | min=[-1,-2], max=[1,2] | [5,5] | u1 in [-1,1], u2 in [-2,2] |

### Trajectory consistency

@provenance implementation-invariant

| Test | Expected |
|------|----------|
| `mpcSimulate(problem, x0, result.controlSequence)` matches `result.stateTrajectory` | element-wise equal |
| Trajectory length = horizon + 1 | Yes |
| Trajectory[0] = initial state | Yes |

### Solver diagnostics

@provenance implementation-invariant

| Test | Expected |
|------|----------|
| Default config maxIterations=100, gradTol=1e-6 | verified |
| iterations > 0 and <= maxIterations | Yes |
| maxIterations=1, gradTol=1e-15 => may not converge | controlSequence length correct |
| Tight gradTol=1e-10 with 200 max iter => converged | Yes |

### BFGS internals

@provenance implementation-invariant

| Test | Expected |
|------|----------|
| Flat cost (all zero) => converges immediately | cost=0, converged=true |
| Steep cost (100x stage, 1000x terminal) => line search backtracks | converged=true, cost < zero-control cost |
