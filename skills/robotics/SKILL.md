---
name: robotics
description: Generate a native robotics library — kinematics, IK solvers, state estimation, PID tuning, path planning, drivetrain models, LQR, MPC, SLAM — from a verified TypeScript reference
argument-hint: "<nodes> [--lang <language>] or 'help' — e.g. 'kalman-filter --lang python' or 'help'"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# Robotics Skill

A modular robotics library covering six domains: state estimation (Kalman, EKF,
UKF, particle filter), kinematics (DH forward kinematics, Jacobian IK, CCD,
FABRIK), control (PID with auto-tuning, LQR, MPC, pure pursuit, Stanley),
path planning (A*/Dijkstra, RRT, RRT*, PRM, D* Lite), drivetrain models
(differential, mecanum, swerve, Ackermann), and SLAM (pose graph optimization).

## When to use this skill

When you need robotics algorithms without adding a robotics framework dependency.
Covers core algorithms from Robotics Toolbox (Corke), FilterPy, python-control,
PythonRobotics, and OMPL, implemented from scratch with clear provenance.

## Arguments

`$ARGUMENTS` has the format: `<nodes> [--lang <language>]`

- **nodes**: Space-separated list of node names to translate, or `all` for every node.
  Dependencies are resolved automatically — specify only the nodes you want.
- **--lang**: Target language (e.g. `python`, `rust`, `go`, `cpp`, `csharp`, `swift`,
  `kotlin`, `typescript`). Defaults to `typescript` if omitted.

Examples:
- `kalman-filter --lang python` — translate just the Kalman filter subset to Python
- `jacobian-ik --lang cpp` — translate the full Jacobian IK pipeline to C++
- `differential-drive pure-pursuit --lang rust` — translate a mobile robot subset to Rust
- `all --lang go` — translate the full library to Go

## Node Graph

```
                              ┌── result-types ──────────────────────────────────────┐
                              │        │                                             │
                              │        ├──→ pid                                      │
                              │        ├──→ fopdt-model                              │
                              │        ├──→ pid-tuning-rules                         │
                              │        ├──→ relay-analysis                            │
                              │        ├──→ fabrik                                    │
                              │        ├──→ particle-filter                           │
                              │        ├──→ graph-search                              │
                              │        ├──→ rrt ──────────→ rrt-star                  │
                              │        │    └──────────────→ prm                      │
                              │        ├──→ d-star                                    │
                              │        │                                             │
drivetrain-types ─────────────┤        │    ┌── plan-path ←── any-of(graph-search,   │
    ├──→ differential-drive   │        │    │                  rrt, rrt-star, prm,    │
    ├──→ mecanum-drive        │        │    │                  d-star)                │
    ├──→ swerve-drive         │        │    │                                        │
    ├──→ ackermann            │        │    └── solve-ik ←── any-of(jacobian-ik,     │
    │                         │        │                      ccd, fabrik)            │
    ├──→ pure-pursuit ←───────┘        │                                             │
    └──→ stanley-controller ←──────────┘                                             │
                                                                                     │
mat-ops ──────────────────────────────────────────────────────────────────────────────┘
    │                                                                     │
    ├──→ rotation-ops ──→ transform-ops                                   │
    │         │                │                                          │
    │         │                ├── (+ dh-parameters) ──→ forward-kinematics
    │         │                │                              │           │
    │         │                │                           jacobian       │
    │         │                │                              │           │
    │         │                ├── (+ forward-kin) ──→ jacobian-ik ←──────┘
    │         │                └── (+ forward-kin) ──→ ccd ←─────────────┘
    │         │
    ├──→ dh-parameters                     ┌── test-chains ←── dh-parameters
    │                                      │
    ├──→ state-types                       └── test-scenarios ←── result-types
    │       ├──→ kalman-filter
    │       ├──→ ekf
    │       ├──→ ukf
    │       └──→ estimate-state ←── any-of(kalman-filter, ekf, ukf)
    │
    ├──→ lqr
    ├──→ mpc ←── state-types, result-types, optimization:bfgs
    └──→ pose-graph-optimization
```

### Nodes

| Node | Type | Depends On | Description |
|------|------|-----------|-------------|
| `mat-ops` | leaf | — | Matrix arithmetic: multiply, transpose, inverse, solve, Cholesky, eigen, SVD |
| `rotation-ops` | internal | mat-ops | Rotation matrices, quaternions (Hamilton w,x,y,z), Euler angles (ZYX) |
| `transform-ops` | internal | mat-ops, rotation-ops | SE(3) homogeneous transforms: compose, invert, transform point |
| `result-types` | leaf | — | Common result types: IKResult, PlanResult, ControlOutput, PIDState |
| `state-types` | internal | mat-ops | GaussianState (mean + covariance), Pose2D, Pose3D |
| `drivetrain-types` | leaf | — | WheelConfig, DrivetrainGeometry, WheelSpeeds |
| `dh-parameters` | internal | mat-ops | DH parameter representation and single-joint transform (standard convention) |
| `forward-kinematics` | internal | mat-ops, rotation-ops, transform-ops, dh-parameters | End-effector pose from joint angles and DH chain |
| `jacobian` | internal | mat-ops, rotation-ops, transform-ops, dh-parameters, forward-kinematics | Geometric Jacobian for serial manipulators |
| `jacobian-ik` | internal | mat-ops, rotation-ops, transform-ops, forward-kinematics, jacobian, result-types | Damped least-squares IK using the geometric Jacobian |
| `ccd` | internal | rotation-ops, transform-ops, forward-kinematics, result-types | Cyclic Coordinate Descent IK: joint-by-joint optimization |
| `fabrik` | internal | result-types | FABRIK IK: geometric solver in Cartesian space (no DH needed) |
| `solve-ik` | root | result-types, any-of(jacobian-ik, ccd, fabrik) | IK dispatcher: selects solver by method parameter |
| `kalman-filter` | internal | mat-ops, state-types | Linear Kalman filter: predict + update |
| `ekf` | internal | mat-ops, state-types | Extended Kalman Filter with user-provided Jacobians |
| `ukf` | internal | mat-ops, state-types | Unscented Kalman Filter (Van der Merwe scaled sigma points) |
| `particle-filter` | internal | result-types | Sequential Monte Carlo with systematic resampling |
| `estimate-state` | root | state-types, any-of(kalman-filter, ekf, ukf) | Estimation dispatcher: selects filter by method parameter |
| `pid` | internal | result-types | PID controller with anti-windup (clamping) and derivative filtering |
| `fopdt-model` | internal | result-types | FOPDT model type and step-response identification (K, τ, θ) |
| `pid-tuning-rules` | internal | result-types | Ziegler-Nichols, Cohen-Coon, Tyreus-Luyben, SIMC, Lambda, IMC tuning |
| `relay-analysis` | internal | result-types | Extract Ku and Tu from relay feedback data (Åström-Hägglund) |
| `lqr` | internal | mat-ops | Linear-quadratic regulator via DARE (Schur decomposition) |
| `mpc` | internal | mat-ops, state-types, result-types, optimization:bfgs | Model predictive control (receding-horizon NLP) |
| `pure-pursuit` | internal | result-types, drivetrain-types | Geometric path follower with fixed lookahead |
| `stanley-controller` | internal | result-types, drivetrain-types | Front-axle crosstrack error controller |
| `differential-drive` | internal | drivetrain-types | Two-wheel differential kinematics (forward + inverse) |
| `mecanum-drive` | internal | drivetrain-types | Four-wheel mecanum omnidirectional kinematics |
| `swerve-drive` | internal | drivetrain-types | Four-wheel swerve with independent steering |
| `ackermann` | internal | drivetrain-types | Bicycle model Ackermann steering geometry |
| `graph-search` | internal | result-types | A* and Dijkstra on 2D grids |
| `rrt` | internal | result-types | Rapidly-exploring Random Tree path planner |
| `rrt-star` | internal | result-types, rrt | Asymptotically optimal RRT with rewiring |
| `prm` | internal | result-types, rrt | Probabilistic Roadmap for multi-query planning |
| `d-star` | internal | result-types | D* Lite for replanning in dynamic environments |
| `plan-path` | root | result-types, any-of(graph-search, rrt, rrt-star, prm, d-star) | Planning dispatcher: selects planner by method parameter |
| `pose-graph-optimization` | internal | mat-ops | SE(2) pose graph SLAM via Gauss-Newton |
| `test-chains` | test | dh-parameters | Test DH chains: 2-link planar, 3-link spatial, PUMA 560 |
| `test-scenarios` | test | result-types | Test fixtures: grids, trajectories, measurement sequences |

### Subset Extraction

- **Just Kalman Filter**: `mat-ops` + `state-types` + `kalman-filter` (3 nodes)
- **Just EKF**: `mat-ops` + `state-types` + `ekf` (3 nodes)
- **Just PID**: `result-types` + `pid` (2 nodes)
- **PID Tuning**: `result-types` + `pid` + `fopdt-model` + `pid-tuning-rules` (4 nodes)
- **Just FABRIK**: `result-types` + `fabrik` (2 nodes)
- **Jacobian IK**: `mat-ops` + `rotation-ops` + `transform-ops` + `dh-parameters` + `forward-kinematics` + `jacobian` + `jacobian-ik` + `result-types` (8 nodes)
- **Just LQR**: `mat-ops` + `lqr` (2 nodes)
- **Just RRT**: `result-types` + `rrt` (2 nodes)
- **Diff-drive + pursuit**: `result-types` + `drivetrain-types` + `differential-drive` + `pure-pursuit` (4 nodes)
- **MPC**: `mat-ops` + `state-types` + `result-types` + `mpc` + `optimization:bfgs` (4 nodes + cross-skill)
- **Full library**: all 37 non-test nodes
- **Test nodes** are optional — only needed for validation

## Handling `help`

When `$ARGUMENTS` is `help`, read `HELP.md` and use it to guide the user through
node and language selection. The help guide contains a decision tree covering
robot type, task domain, common profiles (FRC, FTC, MATE, undergrad, hobbyist),
and language idioms. Walk through it interactively, asking the user about their
requirements, then recommend specific nodes and a target language.

## Translation Workflow

For each node in dependency order:

1. If `$ARGUMENTS` is `help`, read `HELP.md` and guide the user interactively
2. Read the node spec at `nodes/<name>/spec.md` for behavior, API, and test vectors
3. Read language-specific hints at `nodes/<name>/to-<lang>.md` if available
4. Generate the implementation and tests in the target language
5. If the spec is ambiguous, consult the TypeScript reference at `reference/src/<name>.ts`

The reference code is TypeScript with 100% line and function coverage. Every node
has a corresponding test file at `reference/src/<name>.test.ts` that serves as the
behavioral contract.

## Cross-Skill Dependencies

The `mpc` node depends on `optimization:bfgs` — the BFGS optimizer from the
optimization skill. When translating `mpc`:

1. Check if the optimization skill is installed
2. If not, prompt: "The `mpc` node depends on `bfgs` from the optimization skill. Install it?"
3. Resolve the transitive closure of `bfgs` within the optimization skill
4. Generate both skills' nodes into a single output

## Key Design Decisions (Off-Policy)

These defaults differ across robotics libraries. Our choices with provenance:

| Decision | Our Value | Alternatives | Provenance |
|----------|-----------|-------------|------------|
| Quaternion convention | Hamilton (w,x,y,z) | ROS 2 (x,y,z,w), JPL (x,y,z,w) | Matches Eigen, Rotations.jl; ROS reorder at boundary |
| DH convention | Standard (1955) | Modified (Craig) | Matches Corke, KDL; Craig conversion documented |
| Euler order | ZYX (yaw-pitch-roll) | XYZ, ZXZ | Aerospace/robotics standard |
| Angle units | Radians | Degrees | SI standard; no deg↔rad in API |
| UKF sigma points | Van der Merwe (α=0.001, β=2, κ=0) | Julier (α=1, β ̇=0, κ=3-n) | FilterPy default; matches most tutorials |
| PID anti-windup | Integral clamping | Back-calculation, conditional integration | Simplest; universal applicability |
| PID derivative | Filter on error derivative | Derivative of PV, unfiltered | Reduces derivative kick; industry standard |
| FOPDT identification | Step response (63.2% method) | Area method, Smith method | Åström & Hägglund 2006, most common |
| RRT goal bias | 0.05 | 0.1–0.3 | OMPL default; low bias = better exploration |
| RRT step size | 0.5 | Problem-dependent | Reasonable default; user should tune |
| A* heuristic | Euclidean | Manhattan, octile | Admissible for continuous-cost grids |
| D* Lite | Optimized version | Basic version | Koenig & Likhachev 2002 |
| Particle filter resampling | Systematic | Multinomial, residual, stratified | Low variance; O(n) |
| LQR solver | DARE via Schur | Iterative Riccati, eigendecomposition | Numerically stable; matches python-control |
| MPC solver | BFGS (cross-skill) | SQP, IPOPT, direct collocation | Matches available optimization skill |
| Pose graph solver | Gauss-Newton | Levenberg-Marquardt, gradient descent | Standard for SLAM; matches GTSAM approach |

## Error Handling

- IK solvers: return `IKResult` with `converged=false` if max iterations exceeded
- Filters: no exceptions; invalid covariance matrices are caller's responsibility
- Planners: return `PlanResult` with `success=false` if no path found
- PID: output clamping prevents unbounded output; integral clamping prevents windup
- LQR: throws if DARE does not converge (system not stabilizable)
- MPC: returns result with `converged=false` if optimizer fails
- Drivetrains: pure kinematic transforms — no error states
- Pose graph: returns with iteration count if max iterations exceeded

## Cross-Validation Targets

| Domain | Primary Library | Secondary Library |
|--------|----------------|-------------------|
| State estimation | FilterPy v1.4.4 | LowLevelParticleFilters.jl v3.29.4 |
| Kinematics | Robotics Toolbox (Corke) v1.1.0 | RigidBodyDynamics.jl v2.3.2 |
| PID / tuning | python-control v0.10.2 | Åström & Hägglund (textbook tables) |
| Path planning | PythonRobotics | OMPL v1.7.0 |
| LQR | python-control v0.10.2 | ControlSystems.jl v1.15.2 |
| Drivetrains | PythonRobotics | ROS 2 nav2 |
| SLAM | GTSAM 4.2 | — |
| Rotations | Rotations.jl v1.7.1 | Eigen (quaternion ops) |
