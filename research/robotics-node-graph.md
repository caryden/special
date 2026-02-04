# Robotics Node Graph Design

Preliminary dependency graph for the `robotics` skill, defining node structure,
`@depends-on` relationships, `any-of()` dispatcher patterns, and subset extraction.

Last updated: 2026-02-03

## Node Inventory

### Estimated: 35 nodes (21 Stage 1-2, 14 Stage 3-4)

## Layer 1: Shared Infrastructure (6 nodes)

### `mat-ops`
Matrix operations: multiply, transpose, inverse, solve, Cholesky, determinant, eigendecomposition, SVD, identity, zeros, outer product, trace.

```typescript
/**
 * @node mat-ops
 * @contract mat-ops.test.ts
 * @hint category: Pure linear algebra — no robotics-specific types
 * @hint translation: Map to language-native matrix types (numpy, Eigen, etc.)
 */
```

**Dependencies**: None (leaf node)
**Estimated size**: 12 functions, ~300 lines, ~60 tests

### `rotation-ops`
Rotation representations and conversions: rotation matrices, quaternions (Hamilton w,x,y,z), Euler angles (ZYX), composition, inverse, vector rotation.

```typescript
/**
 * @node rotation-ops
 * @depends-on mat-ops
 * @contract rotation-ops.test.ts
 * @hint quaternion: Hamilton convention (w,x,y,z), scalar-first
 * @hint euler: ZYX (yaw-pitch-roll) convention, radians
 */
```

**Dependencies**: mat-ops
**Estimated size**: 8 functions, ~200 lines, ~40 tests

### `transform-ops`
SE(3) homogeneous transforms: compose, invert, transform point, extract rotation/translation.

```typescript
/**
 * @node transform-ops
 * @depends-on mat-ops, rotation-ops
 * @contract transform-ops.test.ts
 * @hint transform: 4x4 homogeneous matrix [R t; 0 1]
 */
```

**Dependencies**: mat-ops, rotation-ops
**Estimated size**: 6 functions, ~150 lines, ~30 tests

### `state-types`
State estimation types: GaussianState (mean vector + covariance matrix), Pose2D, Pose3D.

```typescript
/**
 * @node state-types
 * @depends-on mat-ops
 * @contract state-types.test.ts
 */
```

**Dependencies**: mat-ops
**Estimated size**: Type definitions + constructors, ~80 lines, ~15 tests

### `result-types`
Common result types: PlanResult (path + cost), ControlOutput (velocity commands), IKResult (joint angles + converged flag).

```typescript
/**
 * @node result-types
 * @contract result-types.test.ts
 */
```

**Dependencies**: None (leaf node)
**Estimated size**: Type definitions, ~60 lines, ~10 tests

### `drivetrain-types`
Drivetrain configuration types: WheelConfig, DrivetrainGeometry, WheelSpeeds.

```typescript
/**
 * @node drivetrain-types
 * @contract drivetrain-types.test.ts
 */
```

**Dependencies**: None (leaf node)
**Estimated size**: Type definitions, ~50 lines, ~10 tests

## Layer 2: State Estimation (4 nodes)

### `kalman-predict`
Kalman filter prediction step: x_hat_minus = F * x_hat + B * u, P_minus = F * P * F^T + Q.

```typescript
/**
 * @node kalman-predict
 * @depends-on mat-ops, state-types
 * @contract kalman-predict.test.ts
 * @provenance FilterPy v1.4.4, verified 2026-02-03
 */
```

### `kalman-update`
Kalman filter update step: K = P_minus * H^T * (H * P_minus * H^T + R)^-1, x_hat = x_hat_minus + K * (z - H * x_hat_minus), P = (I - K * H) * P_minus.

```typescript
/**
 * @node kalman-update
 * @depends-on mat-ops, state-types
 * @contract kalman-update.test.ts
 * @provenance FilterPy v1.4.4, verified 2026-02-03
 */
```

### `ekf`
Extended Kalman Filter: nonlinear predict/update with user-provided Jacobians.

```typescript
/**
 * @node ekf
 * @depends-on mat-ops, state-types, kalman-predict, kalman-update
 * @contract ekf.test.ts
 * @hint jacobian: User provides Jacobian functions; no automatic differentiation
 */
```

### `ukf`
Unscented Kalman Filter: sigma point generation (Merwe scheme), unscented transform, predict/update.

```typescript
/**
 * @node ukf
 * @depends-on mat-ops, state-types
 * @contract ukf.test.ts
 * @hint sigma-points: Van der Merwe scaled sigma points (alpha=0.001, beta=2, kappa=0)
 */
```

## Layer 2: Kinematics (3 nodes)

### `dh-parameters`
Denavit-Hartenberg parameter representation and single-joint transform computation.

```typescript
/**
 * @node dh-parameters
 * @depends-on mat-ops, rotation-ops, transform-ops
 * @contract dh-parameters.test.ts
 * @hint convention: Standard DH (not modified/Craig)
 * @provenance Robotics Toolbox (Corke) v1.1.0
 */
```

### `forward-kinematics`
Forward kinematics: compute end-effector pose from joint angles and DH chain.

```typescript
/**
 * @node forward-kinematics
 * @depends-on mat-ops, rotation-ops, transform-ops, dh-parameters
 * @contract forward-kinematics.test.ts
 * @provenance Robotics Toolbox (Corke) v1.1.0, OROCOS KDL v1.5.3
 */
```

### `jacobian`
Geometric Jacobian computation for serial manipulators.

```typescript
/**
 * @node jacobian
 * @depends-on mat-ops, rotation-ops, transform-ops, dh-parameters, forward-kinematics
 * @contract jacobian.test.ts
 */
```

## Layer 2: Drivetrains (4 nodes)

### `differential-drive`
Differential drive kinematics: forward (wheel speeds to twist) and inverse (twist to wheel speeds).

```typescript
/**
 * @node differential-drive
 * @depends-on rotation-ops, drivetrain-types
 * @contract differential-drive.test.ts
 * @provenance PythonRobotics, verified 2026-02-03
 */
```

### `mecanum-drive`
Mecanum wheel kinematics: 4-wheel omnidirectional drive.

```typescript
/**
 * @node mecanum-drive
 * @depends-on rotation-ops, drivetrain-types
 * @contract mecanum-drive.test.ts
 */
```

### `swerve-drive`
Swerve (coaxial) drive kinematics: independent wheel angle + speed control.

```typescript
/**
 * @node swerve-drive
 * @depends-on rotation-ops, drivetrain-types
 * @contract swerve-drive.test.ts
 */
```

### `ackermann`
Ackermann steering geometry: bicycle model kinematic equations.

```typescript
/**
 * @node ackermann
 * @depends-on rotation-ops, drivetrain-types
 * @contract ackermann.test.ts
 */
```

## Layer 3: IK Solvers (4 nodes)

### `jacobian-ik`
Jacobian-based inverse kinematics using damped least squares (pseudo-inverse with damping).

```typescript
/**
 * @node jacobian-ik
 * @depends-on mat-ops, rotation-ops, transform-ops, forward-kinematics, jacobian, result-types
 * @contract jacobian-ik.test.ts
 * @provenance Robotics Toolbox (Corke) v1.1.0, OROCOS KDL v1.5.3
 */
```

### `ccd`
Cyclic Coordinate Descent IK: iterative single-joint optimization.

```typescript
/**
 * @node ccd
 * @depends-on rotation-ops, transform-ops, forward-kinematics, result-types
 * @contract ccd.test.ts
 */
```

### `fabrik`
Forward And Backward Reaching IK: geometric iterative solver in Cartesian space.

```typescript
/**
 * @node fabrik
 * @depends-on result-types
 * @contract fabrik.test.ts
 * @hint geometry: Works with joint positions directly, no DH parameters needed
 */
```

### `solve-ik`
IK dispatcher: selects solver and provides unified interface.

```typescript
/**
 * @node solve-ik
 * @depends-on result-types, any-of(jacobian-ik, ccd, fabrik)
 * @contract solve-ik.test.ts
 */
```

## Layer 3: Motion Planning (3 nodes)

### `graph-search`
Grid/graph search: A* (with heuristic) and Dijkstra (heuristic=null). Returns optimal path on 2D grid.

```typescript
/**
 * @node graph-search
 * @depends-on result-types
 * @contract graph-search.test.ts
 * @hint heuristic: Euclidean distance for A*; null/zero for Dijkstra
 */
```

### `rrt`
Rapidly-exploring Random Tree: sampling-based path planner.

```typescript
/**
 * @node rrt
 * @depends-on result-types
 * @contract rrt.test.ts
 * @hint seed: Accept optional RNG seed for reproducible tests
 * @hint defaults: stepSize=0.5, goalBias=0.05, maxIterations=1000
 * @provenance PythonRobotics, OMPL v1.7.0
 */
```

### `rrt-star`
Optimal RRT with rewiring. Extends RRT with cost-based rewiring of the tree.

```typescript
/**
 * @node rrt-star
 * @depends-on result-types, rrt
 * @contract rrt-star.test.ts
 * @hint extends: Adds rewiring step after nearest-neighbor extension
 * @provenance PythonRobotics, OMPL v1.7.0
 */
```

## Layer 2: PID Tuning (3 nodes)

### `fopdt-model`
First-Order Plus Dead-Time model type and identification: process gain K, time constant τ, dead time θ.

```typescript
/**
 * @node fopdt-model
 * @depends-on result-types
 * @contract fopdt-model.test.ts
 * @hint model: FOPDT G(s) = K * exp(-θs) / (τs + 1)
 * @hint identification: Step response method — extract K, τ, θ from open-loop step test data
 */
```

**Dependencies**: result-types
**Estimated size**: Type + identification functions, ~80 lines, ~15 tests

### `pid-tuning-rules`
Classical PID tuning formulas: Ziegler-Nichols (open-loop step response), Cohen-Coon, Tyreus-Luyben, SIMC (Skogestad IMC), Lambda tuning, IMC-based tuning.

```typescript
/**
 * @node pid-tuning-rules
 * @depends-on result-types, fopdt-model
 * @contract pid-tuning-rules.test.ts
 * @hint ziegler-nichols: Step response method using FOPDT params (K, τ, θ) — Ziegler & Nichols 1942
 * @hint cohen-coon: FOPDT-based tuning — Cohen & Coon 1953
 * @hint tyreus-luyben: Ultimate gain method using (Ku, Tu) — Tyreus & Luyben 1992
 * @hint simc: Skogestad IMC with user-specified τc — Skogestad 2003
 * @hint lambda: Lambda tuning with user-specified λ — Smith 1957
 * @hint imc: IMC-based PID — Rivera, Morari & Skogestad 1986
 * @hint off-policy: Each method produces different gains for the same plant; the choice of
 *   method is the key off-policy decision. All methods are pure functions of FOPDT params.
 * @provenance O'Dwyer "Handbook of PI and PID Controller Tuning Rules" 3rd ed.
 * @provenance Åström & Hägglund "Advanced PID Control" 2006
 */
```

**Dependencies**: result-types, fopdt-model
**Estimated size**: 6 tuning methods × P/PI/PID variants, ~200 lines, ~50 tests

### `relay-analysis`
Extract ultimate gain Ku and ultimate period Tu from relay feedback test data (Åström-Hägglund method).

```typescript
/**
 * @node relay-analysis
 * @depends-on result-types
 * @contract relay-analysis.test.ts
 * @hint method: Ku = 4d / (π * a) where d = relay amplitude, a = oscillation amplitude
 * @hint method: Tu = oscillation period from zero-crossing analysis
 * @hint usage: Output (Ku, Tu) feeds into tyreus-luyben or ziegler-nichols ultimate gain formulas
 * @provenance Åström & Hägglund 1984
 */
```

**Dependencies**: result-types
**Estimated size**: ~60 lines, ~15 tests

## Layer 3: Control (4 nodes)

### `pid`
PID controller with anti-windup (clamping method), derivative filtering, and output limits.

```typescript
/**
 * @node pid
 * @depends-on result-types
 * @contract pid.test.ts
 * @hint anti-windup: Integral clamping (not back-calculation)
 * @hint derivative: First-order low-pass filter on derivative term
 * @hint off-policy: Anti-windup method is the key design decision; clamping chosen for simplicity and universality
 */
```

### `lqr`
Linear Quadratic Regulator: solve CARE/DARE for optimal gain matrix K.

```typescript
/**
 * @node lqr
 * @depends-on mat-ops, result-types
 * @contract lqr.test.ts
 * @hint default: Continuous-time (CARE); discrete-time (DARE) via flag
 * @provenance python-control v0.10.2, Drake
 */
```

### `pure-pursuit`
Pure pursuit path tracker: geometric controller following a lookahead point.

```typescript
/**
 * @node pure-pursuit
 * @depends-on result-types
 * @contract pure-pursuit.test.ts
 * @hint lookahead: Fixed lookahead distance (adaptive is variant)
 * @provenance PythonRobotics, ROS 2 nav2 (Regulated Pure Pursuit)
 */
```

### `stanley-controller`
Stanley method: front-axle crosstrack error controller.

```typescript
/**
 * @node stanley-controller
 * @depends-on result-types
 * @contract stanley-controller.test.ts
 * @provenance PythonRobotics
 */
```

## Layer 4: Dispatchers (2 nodes)

### `plan-path`
Path planning dispatcher.

```typescript
/**
 * @node plan-path
 * @depends-on result-types, any-of(graph-search, rrt, rrt-star)
 * @contract plan-path.test.ts
 */
```

### `estimate-state`
State estimation dispatcher.

```typescript
/**
 * @node estimate-state
 * @depends-on state-types, any-of(kalman-predict, ekf, ukf)
 * @contract estimate-state.test.ts
 */
```

## Dependency Graph (Visual)

```
Layer 0 (leaves):     result-types    drivetrain-types    mat-ops
                          |                |                |
Layer 1 (types):      state-types    fopdt-model      rotation-ops
                          |                |                |
Layer 2 (transforms):     |                |          transform-ops
                          |                |            |       |
Layer 2 (estimation): kalman-predict  kalman-update     |       |
                          |    |           |            |       |
Layer 2 (tuning):    relay-analysis  pid-tuning-rules   |       |
                          |    |           |            |       |
Layer 2 (kinematics):     |    |           |      dh-parameters |
                          |    |           |            |       |
                          |    |           |    forward-kinematics
                          |    |           |         |       |
                          |    |           |      jacobian   |
                          |    |           |         |       |
Layer 2 (drives):         |    |           |         |  diff-drive  mecanum  swerve  ackermann
                          |    |           |         |       |
Layer 3 (estimation):   ekf   ukf         |         |       |
                          |    |           |         |       |
Layer 3 (IK):             |    |           |    jacobian-ik  ccd  fabrik
                          |    |           |         |       |     |
Layer 3 (planning):       |    |           |    graph-search  rrt  rrt-star
                          |    |           |         |       |     |
Layer 3 (control):       pid  lqr    pure-pursuit  stanley  |     |
                          |    |        |       |    |       |     |
Layer 4 (dispatch):  estimate-state  solve-ik   plan-path
```

## Subset Extraction Examples

### Just Kalman Filter (5 nodes)
```
@depends-on: mat-ops, state-types, kalman-predict, kalman-update
Transitive closure: mat-ops -> state-types -> kalman-predict + kalman-update
```

### Just PID (2 nodes)
```
@depends-on: result-types, pid
Transitive closure: result-types -> pid
```

### Just PID Tuning (3 nodes)
```
@depends-on: result-types, fopdt-model, pid-tuning-rules
Transitive closure: result-types -> fopdt-model -> pid-tuning-rules
```

### PID + Tuning + Relay (5 nodes)
```
@depends-on: result-types, pid, fopdt-model, pid-tuning-rules, relay-analysis
Transitive closure: result-types -> pid + fopdt-model -> pid-tuning-rules + relay-analysis
```

### Just Swerve Drive (3 nodes)
```
@depends-on: rotation-ops, drivetrain-types, swerve-drive
Transitive closure: mat-ops -> rotation-ops + drivetrain-types -> swerve-drive
```
Note: mat-ops is pulled in transitively via rotation-ops.

### Just FK Chain (5 nodes)
```
@depends-on: mat-ops, rotation-ops, transform-ops, dh-parameters, forward-kinematics
Transitive closure: mat-ops -> rotation-ops -> transform-ops -> dh-parameters -> forward-kinematics
```

### Just RRT (2 nodes)
```
@depends-on: result-types, rrt
Transitive closure: result-types -> rrt
```

### Just LQR (3 nodes)
```
@depends-on: mat-ops, result-types, lqr
Transitive closure: mat-ops + result-types -> lqr
```

### Just Jacobian IK (7 nodes)
```
@depends-on: mat-ops, rotation-ops, transform-ops, forward-kinematics, jacobian, jacobian-ik, result-types
Transitive closure: mat-ops -> rotation-ops -> transform-ops -> dh-parameters -> forward-kinematics -> jacobian -> jacobian-ik + result-types
```

### MPC with Cross-Skill Dependency (5+ nodes)
```
@depends-on: mat-ops, state-types, result-types, mpc, optimization:bfgs
Transitive closure: mat-ops + state-types + result-types -> mpc
                    + optimization:bfgs (cross-skill, triggers optimization skill install)
```

## Cross-Skill Dependency Design

### Motivating Case

The `mpc` node needs an optimization solver. Duplicating the optimization skill's nodes
violates the unbundling thesis -- the whole point is that consumers install only what they need.

### Proposed Syntax

```typescript
/**
 * @node mpc
 * @depends-on mat-ops, state-types, result-types     // intra-skill (current behavior)
 * @depends-on optimization:bfgs                       // cross-skill dependency
 * @contract mpc.test.ts
 */
```

### Semantics

- `optimization:bfgs` -- references node `bfgs` from skill `optimization`
- No versioning needed -- skills are spec-time generation inputs, not runtime dependencies
- Generated code is self-contained; if the upstream skill updates, previously generated code is unaffected

### Agent Workflow for Cross-Skill Dependencies

1. Parse `@depends-on`, detect cross-skill reference (`optimization:bfgs`)
2. Compute transitive closure within the referenced skill (`bfgs` -> `vec-ops`, `line-search`, etc.)
3. Check if the `optimization` skill is installed in the user's plugin set
4. If not, prompt: "The `mpc` node depends on `bfgs` from the optimization skill. Install it?"
5. Read the referenced nodes' specs from the other skill directory
6. Include all transitive nodes in the translation (closure spans both skills)
7. Generated code merges both skills' nodes into a single output

### Granularity Decision

**Depend on specific nodes, not dispatchers.**

- `@depends-on optimization:bfgs` -- clear, minimal closure
- `@depends-on optimization:minimize` -- pulls in all algorithms via `any-of()` (avoid unless needed)

If a node legitimately needs algorithm selection, use the dispatcher:
- `@depends-on optimization:minimize` with `any-of()` -- consumer chooses which algorithm

### Interaction with `any-of()`

Cross-skill `any-of()` is valid:
```
@depends-on any-of(optimization:bfgs, optimization:l-bfgs)
```
This means: "at least one of BFGS or L-BFGS from the optimization skill."

### Identified Cross-Skill Dependencies

| Node | Dependency | Reason |
|------|-----------|--------|
| `mpc` | `optimization:bfgs` or `optimization:l-bfgs` | Inner NLP solve |
| `pose-graph-optimization` (deferred) | `optimization:newton-trust-region` | Nonlinear least squares on SE(2)/SE(3) |
| `lm-ik` (deferred) | `optimization:bfgs` | Could reuse optimization infrastructure |

### Plugin Manifest Considerations

The `.claude-plugin/plugin.json` may benefit from a `peerDependencies` concept:
```json
{
  "name": "robotics",
  "peerDependencies": {
    "optimization": {
      "nodes": ["bfgs", "l-bfgs"],
      "reason": "Required by mpc node",
      "optional": true
    }
  }
}
```

This is advisory only -- the agent discovers cross-skill deps from `@depends-on` at generation time.
The manifest serves as documentation and could enable tooling to pre-install peer skills.

## Test Infrastructure Nodes (2 nodes)

### `test-chains`
Standard kinematic chain definitions for testing FK and IK: 2-link planar, 3-link spatial, PUMA 560 (6-DOF).

```typescript
/**
 * @node test-chains
 * @depends-on dh-parameters
 * @contract test-chains.test.ts
 * @hint test-only: This node is for testing only, not for translation
 */
```

### `test-scenarios`
Standard test scenarios: grid maps for planning, reference trajectories for control, measurement sequences for estimation.

```typescript
/**
 * @node test-scenarios
 * @contract test-scenarios.test.ts
 * @hint test-only: This node is for testing only, not for translation
 */
```

## Node Count Summary

| Category | Nodes | Stage |
|----------|-------|-------|
| Shared infrastructure | 6 | 1 |
| State estimation | 4 | 1-2 |
| PID tuning | 3 | 1 |
| Kinematics | 3 | 1-2 |
| Drivetrains | 4 | 1-2 |
| IK solvers | 4 | 2-3 |
| Motion planning | 3 | 2-3 |
| Control | 4 | 1-3 |
| Dispatchers | 2 | 3 |
| Test utilities | 2 | 1 |
| **Total** | **35** | -- |

## Acyclicity Verification

The dependency graph is a DAG (directed acyclic graph). Each layer depends only on
lower layers. The longest path is:

```
mat-ops -> rotation-ops -> transform-ops -> dh-parameters -> forward-kinematics -> jacobian -> jacobian-ik
```

Length: 7 edges. This is the deepest dependency chain and represents the "Just Jacobian IK"
subset extraction (7 nodes + result-types = 8 nodes total).
