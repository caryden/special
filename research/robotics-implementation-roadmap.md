# Robotics Implementation Roadmap

Staged implementation plan for the `robotics` skill, with cross-validation targets
and off-policy decisions documented at each stage.

Last updated: 2026-02-03

## Staging Philosophy

Each stage validates a hypothesis about the skill format's fitness for robotics algorithms:

- **Stage 1**: Can linear algebra infrastructure translate well? Do state estimators and simple controllers work?
- **Stage 2**: Do kinematics chains (deep dependency graphs) translate correctly?
- **Stage 3**: Do sampling-based planners (stochastic algorithms) survive translation?
- **Stage 4**: Do cross-skill dependencies work in practice?

## Stage 1: Foundation + Simple Algorithms

### Nodes (10)

| Node | Category | Dependencies |
|------|----------|-------------|
| `mat-ops` | Infrastructure | None |
| `rotation-ops` | Infrastructure | mat-ops |
| `state-types` | Infrastructure | mat-ops |
| `result-types` | Infrastructure | None |
| `drivetrain-types` | Infrastructure | None |
| `kalman-predict` | Estimation | mat-ops, state-types |
| `kalman-update` | Estimation | mat-ops, state-types |
| `pid` | Control | result-types |
| `differential-drive` | Drivetrain | rotation-ops, drivetrain-types |
| `test-scenarios` | Test utility | None |

### Why These

- **mat-ops** and **rotation-ops** are the shared foundation. If matrix operations don't translate
  well (numerical precision, API mapping), everything else fails. Testing these first is essential.
- **KF** (predict + update) is the simplest state estimator with fully deterministic test vectors.
  Given F, H, Q, R, and measurements, the posterior is uniquely determined to machine precision.
- **PID** is universally needed and has the highest off-policy density of any algorithm in the skill.
  Anti-windup methods vary across every library — this tests the skill format's ability to capture
  arbitrary design decisions.
- **Differential drive** is the simplest drivetrain model and validates the drivetrain-types
  infrastructure.

### Cross-Validation Targets

| Algorithm | Primary | Secondary | Method |
|-----------|---------|-----------|--------|
| KF | FilterPy v1.4.4 | MATLAB | Compare posteriors (mean, covariance) to 1e-10 |
| PID | python-control v0.10.2 | PythonRobotics | Step response comparison |
| Differential drive | PythonRobotics | ROS 2 nav2 | Known trajectories, compare odometry |
| mat-ops | NumPy | Eigen | Numerical precision (1e-14 for basic ops, 1e-10 for decompositions) |

### Off-Policy Decisions to Document

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| KF predict/update separation | Separated (2 nodes) | Fused (1 node) | Enables EKF/UKF reuse of predict step |
| PID anti-windup | Clamping | Back-calculation, none | Simplest; matches most educational implementations |
| PID derivative filter | First-order low-pass | None, moving average | Industry standard; prevents derivative kick |
| Quaternion convention | Hamilton (w,x,y,z) | JPL (x,y,z,w) | Matches Drake, Corke, MATLAB, Eigen |
| Euler convention | ZYX (roll-pitch-yaw) | ZYZ, XYZ | Most common in mobile robotics |
| DH convention | Standard | Modified (Craig) | More common in textbooks and libraries |
| Matrix storage | Row-major | Column-major | Matches TypeScript/JavaScript |

### Estimated Test Count

~165 tests across 10 nodes:
- mat-ops: ~60 tests
- rotation-ops: ~40 tests
- state-types: ~15 tests
- result-types: ~10 tests
- drivetrain-types: ~10 tests
- kalman-predict: ~15 tests
- kalman-update: ~15 tests
- pid: ~25 tests (anti-windup, derivative filter, output clamping, setpoint changes)
- differential-drive: ~15 tests
- test-scenarios: ~10 tests

## Stage 2: Extended Estimation + Kinematics

### Nodes (8, total ~18)

| Node | Category | Dependencies |
|------|----------|-------------|
| `transform-ops` | Infrastructure | mat-ops, rotation-ops |
| `ekf` | Estimation | mat-ops, state-types, kalman-predict, kalman-update |
| `ukf` | Estimation | mat-ops, state-types |
| `dh-parameters` | Kinematics | mat-ops, rotation-ops, transform-ops |
| `forward-kinematics` | Kinematics | mat-ops, rotation-ops, transform-ops, dh-parameters |
| `jacobian-ik` | IK | mat-ops, rotation-ops, transform-ops, forward-kinematics, jacobian, result-types |
| `pure-pursuit` | Control | result-types |
| `test-chains` | Test utility | dh-parameters |

### Why These

- **transform-ops** completes the spatial math infrastructure (SE(3) transforms needed for kinematics).
- **EKF/UKF** extend the Kalman filter foundation with nonlinear capabilities.
- **DH parameters + FK** are the canonical manipulator kinematics representation.
  This tests deep dependency chains (7 edges to jacobian-ik).
- **Jacobian IK** is the standard numerical IK method, exercising the full kinematics stack.
- **Pure pursuit** is a simple geometric path tracker complementing PID.

### Cross-Validation Targets

| Algorithm | Primary | Secondary | Method |
|-----------|---------|-----------|--------|
| EKF | FilterPy v1.4.4 | GTSAM | Compare posteriors on nonlinear system |
| UKF | FilterPy v1.4.4 | MATLAB | Compare sigma points and posteriors |
| FK | Robotics Toolbox (Corke) v1.1.0 | OROCOS KDL v1.5.3 | Standard chains (2-link, PUMA 560), compare end-effector poses to 1e-10 |
| Jacobian IK | Robotics Toolbox (Corke) v1.1.0 | KDL | Known configs, compare joint angles and iteration count |
| Pure pursuit | PythonRobotics | ROS 2 nav2 RPP | Tracking error on reference trajectory |

### Off-Policy Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| EKF Jacobian | User-provided (analytical) | Numerical (finite differences) | Numerical Jacobians are fragile and slow |
| UKF sigma points | Merwe scaled (α=0.001, β=2, κ=0) | Julier, simplex | Most common in FilterPy and literature |
| IK damping | λ=0.01 (damped least squares) | λ=0 (pure pseudo-inverse) | Prevents singularity instability |
| IK convergence | ε=1e-6, maxIter=100 | Various | Matches KDL NR defaults |

### Estimated Test Count

~120 additional tests (total ~285):
- transform-ops: ~30
- ekf: ~20
- ukf: ~25
- dh-parameters: ~15
- forward-kinematics: ~20
- jacobian-ik: ~20
- pure-pursuit: ~15
- test-chains: ~10

## Stage 3: Planning + Advanced Control + Full Drivetrains

### Nodes (10, total ~28)

| Node | Category | Dependencies |
|------|----------|-------------|
| `graph-search` | Planning | result-types |
| `rrt` | Planning | result-types |
| `rrt-star` | Planning | result-types, rrt |
| `lqr` | Control | mat-ops, result-types |
| `stanley-controller` | Control | result-types |
| `mecanum-drive` | Drivetrain | rotation-ops, drivetrain-types |
| `swerve-drive` | Drivetrain | rotation-ops, drivetrain-types |
| `ackermann` | Drivetrain | rotation-ops, drivetrain-types |
| `ccd` | IK | rotation-ops, transform-ops, forward-kinematics, result-types |
| `fabrik` | IK | result-types |

### Why These

- **Graph search + RRT + RRT*** cover the two fundamental planning paradigms (deterministic grid + sampling-based).
- **LQR** is the optimal control complement to PID (requires CARE/DARE solver in mat-ops).
- **Full drivetrains** complete the mobile robotics foundation.
- **CCD + FABRIK** provide alternative IK methods for the solve-ik dispatcher.

### Cross-Validation Targets

| Algorithm | Primary | Secondary | Method |
|-----------|---------|-----------|--------|
| RRT | OMPL v1.7.0 | PythonRobotics | Statistical: success rate, path length over 100 seeds |
| LQR | python-control v0.10.2 | Drake | Gain matrix K comparison to 1e-10 |
| Stanley | PythonRobotics | — | Tracking error on reference trajectory |
| Graph search | — | — | Known-optimal paths on standard grids |
| Mecanum/Swerve/Ackermann | PythonRobotics | ROS 2 nav2 | Known trajectories |

### Off-Policy Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| RRT step size | 0.5 | 3.0 (PythonRobotics), configurable | Normalized to configuration space scale |
| RRT goal bias | 5% | 10%, 15% | Standard in OMPL literature |
| LQR default | Continuous (CARE) | Discrete (DARE) | Continuous is more common in textbooks |
| RRT* rewire radius | 2×step_size | Various | Common heuristic |

### Estimated Test Count

~160 additional tests (total ~445):
- graph-search: ~25
- rrt: ~20 (seeded deterministic + statistical)
- rrt-star: ~20
- lqr: ~25
- stanley-controller: ~15
- mecanum-drive: ~15
- swerve-drive: ~15
- ackermann: ~15
- ccd: ~15
- fabrik: ~15

## Stage 4 (Stretch): Advanced Algorithms + Cross-Skill

### Nodes (4+, total ~32+)

| Node | Category | Dependencies |
|------|----------|-------------|
| `mpc` | Control | mat-ops, state-types, result-types, **optimization:bfgs** |
| `solve-ik` | Dispatcher | result-types, any-of(jacobian-ik, ccd, fabrik) |
| `plan-path` | Dispatcher | result-types, any-of(graph-search, rrt, rrt-star) |
| `estimate-state` | Dispatcher | state-types, any-of(kalman-predict, ekf, ukf) |

### Stretch Candidates (not committed)

| Node | Category | Notes |
|------|----------|-------|
| `particle-filter` | Estimation | Requires seed control or statistical bounds |
| `jacobian` | Kinematics | Geometric Jacobian computation |
| `pose-graph-optimization` | SLAM | Requires optimization:newton-trust-region |
| `d-star` | Planning | Replanning in dynamic environments |
| `prm` | Planning | Multi-query roadmap planner |

### Cross-Skill Dependency Validation

Stage 4 is the first test of cross-skill dependencies. The MPC node depends on
`optimization:bfgs` or `optimization:l-bfgs`. This validates:

1. The `skill:node` syntax in `@depends-on`
2. Transitive closure spanning two skills
3. Agent workflow for cross-skill resolution
4. Plugin manifest `peerDependencies` concept

### Off-Policy Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| MPC prediction horizon | User-specified | Fixed default | Too problem-specific for a default |
| MPC inner solver | optimization:bfgs | QP solver, IPOPT | Reuses existing skill infrastructure |

## Cross-Validation Library Matrix

| Domain | Primary | Secondary | Tertiary |
|--------|---------|-----------|----------|
| State estimation | FilterPy v1.4.4 | GTSAM 4.2 | MATLAB |
| Kinematics | Robotics Toolbox (Corke) v1.1.0 | OROCOS KDL v1.5.3 | MATLAB |
| Drivetrains | PythonRobotics | ROS 2 nav2 | — |
| Motion planning | OMPL v1.7.0 | PythonRobotics | — |
| Control | python-control v0.10.2 | Drake | MATLAB |
| IK solvers | Robotics Toolbox (Corke) v1.1.0 | OROCOS KDL v1.5.3 | MoveIt 2 |

## Off-Policy Decision Registry

Complete list of off-policy decisions (robotics equivalents of the optimization skill's parameter table):

| # | Domain | Decision | Our Choice | Off-Policy Density |
|---|--------|----------|-----------|-------------------|
| 1 | Estimation | KF fused vs separated predict/update | Separated | Low |
| 2 | Estimation | EKF Jacobian computation | Analytical (user-provided) | Medium |
| 3 | Estimation | UKF sigma point scheme | Merwe (α=0.001, β=2, κ=0) | High |
| 4 | Control | PID anti-windup method | Clamping | High |
| 5 | Control | PID derivative filtering | First-order low-pass | Medium |
| 6 | Control | LQR default time domain | Continuous (CARE) | Medium |
| 7 | Representation | Quaternion convention | Hamilton (w,x,y,z) | High |
| 8 | Representation | Euler convention | ZYX (roll-pitch-yaw) | Medium |
| 9 | Kinematics | DH convention | Standard (not modified) | Medium |
| 10 | IK | Damping factor | λ=0.01 | Medium |
| 11 | IK | Convergence tolerance | ε=1e-6, maxIter=100 | Low |
| 12 | Planning | RRT step size | 0.5 (normalized) | High |
| 13 | Planning | RRT goal bias | 5% | Medium |
| 14 | Planning | RRT* rewire radius | 2×step_size | Medium |
| 15 | Storage | Matrix layout | Row-major | Low |

## Success Criteria

### Per Stage

| Stage | Nodes | Tests | Coverage | Cross-Validation |
|-------|-------|-------|----------|-----------------|
| 1 | 10 | ~165 | 100% | FilterPy (KF), python-control (PID) |
| 2 | 18 | ~285 | 100% | Corke (FK/IK), FilterPy (EKF/UKF) |
| 3 | 28 | ~445 | 100% | OMPL (RRT), python-control (LQR) |
| 4 | 32+ | ~500+ | 100% | Cross-skill dependency validation |

### Overall

- [ ] All 6 algorithm domains represented
- [ ] Every included algorithm has at least one cross-validation target
- [ ] 100% line and function coverage on all nodes
- [ ] Node graph is acyclic with clear layer structure
- [ ] Subset extraction produces reasonable closures (2-8 nodes)
- [ ] Cross-skill dependency mechanism validated (MPC → optimization)
- [ ] Off-policy decisions documented with `@hint` tags and provenance
