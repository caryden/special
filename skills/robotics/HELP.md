# Robotics Skill — Help Guide

This guide helps you choose the right robotics nodes and target language for your
use case. Unlike optimization (which has one primary axis: derivative availability),
robotics spans multiple domains — kinematics, control, estimation, planning, and
drivetrains. Start with what you're building, then narrow down.

## Quick Start

If you already know what you need:

- **Robot arm IK (DH-based)**: `jacobian-ik --lang <language>`
- **Robot arm IK (position-only)**: `fabrik --lang <language>`
- **Diff-drive + path following**: `differential-drive pure-pursuit --lang <language>`
- **PID tuning pipeline**: `pid pid-tuning-rules fopdt-model --lang <language>`
- **Kalman filter**: `kalman-filter --lang <language>`
- **LQR controller**: `lqr --lang <language>`
- **Full library**: `all --lang <language>`

## Common Profiles

If you fit one of these profiles, skip the decision tree — here's your recipe:

| Profile | Recipe | Nodes |
|---------|--------|-------|
| **FRC team** | `swerve-drive pid --lang java` | 4 nodes: `result-types`, `drivetrain-types`, `swerve-drive`, `pid`. Add `graph-search` for autonomous path planning. |
| **FTC team** | `mecanum-drive pid --lang java` | 4 nodes: `result-types`, `drivetrain-types`, `mecanum-drive`, `pid`. |
| **MATE / ROV** | `mecanum-drive pid --lang python` | 4 nodes: `result-types`, `drivetrain-types`, `mecanum-drive`, `pid`. Mecanum maps to thruster mixing. |
| **Undergrad controls** | `pid lqr kalman-filter --lang python` | 6 nodes: `mat-ops`, `state-types`, `result-types`, `pid`, `lqr`, `kalman-filter`. Core control theory trifecta. |
| **Hobbyist arm** | `fabrik --lang python` | 2 nodes: `result-types`, `fabrik`. No DH parameters needed — just link lengths. |

If none of these fit, continue to the decision tree below.

## Decision Tree

### 1. What are you building?

| Building… | Go to |
|-----------|-------|
| Robot arm (kinematics, inverse kinematics) | §2a — Robot Arm |
| Mobile robot (drive, navigate, follow paths) | §2b — Mobile Robot |
| Control system (PID, LQR, MPC) | §2c — Control System |
| State estimator (filter, sensor fusion) | §2d — State Estimation |
| Complete system (SLAM, mobile manipulation) | §2e — Complete System |

### 2a. Robot Arm (Kinematics & IK)

**Do you have DH parameters for your arm?**

| Scenario | Algorithm | Recipe |
|----------|-----------|--------|
| Yes — need full 6-DOF pose IK | Jacobian (damped least-squares) | `jacobian-ik` (8 nodes) |
| Yes — need CCD-style IK | Cyclic Coordinate Descent | `ccd` (7 nodes) |
| No — just joint positions in space | FABRIK | `fabrik` (2 nodes) |
| Want a dispatcher over multiple IK solvers | solve-ik | `solve-ik` (+ chosen solvers) |

**Details:**

- **Jacobian IK** uses the geometric Jacobian and damped least-squares. Needs the
  full DH pipeline: `mat-ops → rotation-ops → transform-ops → dh-parameters →
  forward-kinematics → jacobian → jacobian-ik` (+ `result-types`). Best for
  6-DOF arms where you need precise end-effector control.

- **CCD** iterates joint-by-joint to close the position error. Needs:
  `mat-ops → rotation-ops → transform-ops → dh-parameters → forward-kinematics → ccd`
  (+ `result-types`). Simpler than Jacobian IK, good for chains with many joints.

- **FABRIK** works in Cartesian space — no DH parameters needed. Just
  `result-types → fabrik`. Fastest to set up, position-only (no orientation control).

- **solve-ik** is a dispatcher that delegates to whichever IK solver(s) you include.
  Use `any-of(jacobian-ik, ccd, fabrik)` — include only the solvers you want.

### 2b. Mobile Robot (Drivetrain & Navigation)

**What drive type?**

| Drive Type | Node | Dependencies |
|------------|------|-------------|
| Two-wheel differential | `differential-drive` | `drivetrain-types` |
| Four-wheel mecanum (omnidirectional) | `mecanum-drive` | `drivetrain-types` |
| Four-wheel swerve (independent steering) | `swerve-drive` | `drivetrain-types` |
| Car-like (Ackermann steering) | `ackermann` | `drivetrain-types` |

**Do you need path following?**

| Controller | Best For | Node |
|------------|----------|------|
| Pure Pursuit | Smooth curves, differential drive | `pure-pursuit` |
| Stanley | Lane keeping, Ackermann/swerve | `stanley-controller` |

**Do you need path planning?**

| Planner | Best For | Nodes |
|---------|----------|-------|
| A* / Dijkstra (grid-based) | Known grid maps | `graph-search` |
| RRT (sampling-based) | High-dimensional spaces | `rrt` |
| RRT* (asymptotically optimal) | Optimal paths in open space | `rrt-star` (includes `rrt`) |
| PRM (multi-query) | Same environment, many queries | `prm` (includes `rrt`) |
| D* Lite (replanning) | Dynamic environments | `d-star` |
| Dispatcher | Auto-select planner | `plan-path` (+ chosen planners) |

**Example: Diff-drive robot with A* planning and pure pursuit:**
```
differential-drive graph-search pure-pursuit --lang <language>
```
5 nodes total: `result-types`, `drivetrain-types`, `differential-drive`,
`graph-search`, `pure-pursuit`.

### 2c. Control System (PID & Optimal Control)

| Need | Nodes | Description |
|------|-------|-------------|
| Basic PID controller | `pid` | Positional PID with anti-windup, derivative filtering |
| PID auto-tuning | `pid fopdt-model pid-tuning-rules` | FOPDT model fitting + Ziegler-Nichols, Cohen-Coon, SIMC rules |
| PID tuning via relay | `pid fopdt-model pid-tuning-rules relay-analysis` | Add relay feedback for automatic Ku/Tu identification |
| LQR (linear optimal) | `lqr` | Linear-quadratic regulator. Solves DARE via Schur decomposition. |
| MPC (model predictive) | `mpc` | Receding-horizon optimization. **Cross-skill dependency:** requires `optimization:bfgs`. |

**Notes:**
- `pid` has no transitive dependencies beyond `result-types` (2 nodes total).
- `lqr` depends only on `mat-ops` (2 nodes total).
- `mpc` depends on `mat-ops`, `state-types`, `result-types`, and the `bfgs` node
  from the **optimization** skill. You must generate `bfgs` from the optimization
  skill first (or alongside).

### 2d. State Estimation (Filtering & Fusion)

**What kind of system?**

| System Model | Algorithm | Nodes |
|--------------|-----------|-------|
| Linear (A, B, H are constant matrices) | Kalman Filter | `kalman-filter` (3 nodes) |
| Nonlinear, smooth dynamics | Extended Kalman Filter | `ekf` (3 nodes) |
| Highly nonlinear, non-smooth | Unscented Kalman Filter | `ukf` (3 nodes) |
| Multimodal / non-Gaussian | Particle Filter | `particle-filter` (2 nodes) |
| Dispatcher (auto-select filter) | estimate-state | `estimate-state` (+ chosen filters) |

**Details:**
- `kalman-filter`, `ekf`, and `ukf` all depend on `mat-ops` and `state-types`
  (3 nodes each including the algorithm itself).
- `particle-filter` depends only on `result-types` (2 nodes total) — it uses
  weighted samples, not matrices.
- `estimate-state` is a dispatcher: `any-of(kalman-filter, ekf, ukf)`. Note that
  `particle-filter` is not included in the dispatcher — use it directly.

### 2e. Complete System (SLAM / Mobile Manipulation)

For a complete mobile robot system, combine nodes from §2b–§2d:

**SLAM-capable mobile robot:**
```
differential-drive ekf graph-search pure-pursuit pose-graph-optimization --lang <language>
```
~10 nodes total (with transitive deps): `mat-ops`, `state-types`, `result-types`,
`drivetrain-types`, `differential-drive`, `ekf`, `graph-search`, `pure-pursuit`,
`pose-graph-optimization`.

**Mobile manipulation (arm on a base):**
Combine a drivetrain recipe (§2b) + IK recipe (§2a) + estimation (§2d) as needed.

### 3. What language / platform?

| Language | Matrix → | Test Framework | Key Concern |
|----------|----------|----------------|-------------|
| TypeScript | Direct copy | bun:test / vitest | No translation needed. |
| Python | `numpy.ndarray` | pytest | Row-major matches. Use `@dataclass` for types. |
| C++ | `Eigen::MatrixXd` | Catch2 / gtest | Eigen is column-major — transpose on storage order. |
| Rust | `nalgebra::DMatrix` | built-in `#[test]` | nalgebra is column-major. Consider `ndarray` for row-major. |
| Go | `gonum mat.Dense` | `testing` | gonum works well. Return `(result, error)` pairs. |
| C# | `double[,]` or MathNet | xUnit | **`double.Epsilon` is NOT machine epsilon** — use `2.220446049250313e-16`. |
| Swift | `[Double]` or Accelerate | XCTest | No standard matrix lib; manual flat arrays or Accelerate framework. |
| Kotlin | `DoubleArray` or ojAlgo | JUnit | `DenseMatrix` from ojAlgo, or manual flat-array implementation. |

**Conventions across all languages:**
- **Quaternions**: Hamilton convention `(w, x, y, z)`. ROS 2 uses `(x, y, z, w)` — reorder if integrating with ROS.
- **DH parameters**: Standard (Denavit-Hartenberg 1955), not Modified (Craig).
- **Angles**: Radians everywhere, ZYX Euler order for rotation decomposition.

## Node Recipes

Pre-computed dependency sets for common subsets. Copy-paste these directly.

### Jacobian IK (DH-based, 6-DOF)

```
jacobian-ik --lang <language>
```

8 nodes total: `mat-ops`, `rotation-ops`, `transform-ops`, `dh-parameters`,
`forward-kinematics`, `jacobian`, `jacobian-ik`, `result-types`.

### FABRIK (position-only IK)

```
fabrik --lang <language>
```

2 nodes total: `result-types`, `fabrik`.

### CCD (joint-by-joint IK)

```
ccd --lang <language>
```

7 nodes total: `mat-ops`, `rotation-ops`, `transform-ops`, `dh-parameters`,
`forward-kinematics`, `ccd`, `result-types`.

### Differential drive + pure pursuit

```
differential-drive pure-pursuit --lang <language>
```

4 nodes total: `result-types`, `drivetrain-types`, `differential-drive`, `pure-pursuit`.

### Swerve drive + Stanley controller

```
swerve-drive stanley-controller --lang <language>
```

4 nodes total: `result-types`, `drivetrain-types`, `swerve-drive`, `stanley-controller`.

### PID tuning pipeline

```
pid pid-tuning-rules fopdt-model --lang <language>
```

4 nodes total: `result-types`, `pid`, `fopdt-model`, `pid-tuning-rules`.
Add `relay-analysis` for automatic ultimate gain/period identification (5 nodes).

### Kalman filter

```
kalman-filter --lang <language>
```

3 nodes total: `mat-ops`, `state-types`, `kalman-filter`.

### Extended Kalman filter

```
ekf --lang <language>
```

3 nodes total: `mat-ops`, `state-types`, `ekf`.

### Unscented Kalman filter

```
ukf --lang <language>
```

3 nodes total: `mat-ops`, `state-types`, `ukf`.

### LQR controller

```
lqr --lang <language>
```

2 nodes total: `mat-ops`, `lqr`.

### Mobile navigation stack

```
differential-drive ekf graph-search pure-pursuit --lang <language>
```

8 nodes total: `mat-ops`, `state-types`, `result-types`, `drivetrain-types`,
`differential-drive`, `ekf`, `graph-search`, `pure-pursuit`.

### Full library

```
all --lang <language>
```

37 nodes (all non-test nodes). Everything included.

## Frequently Asked Questions

**Q: Is `mat-ops` always needed?**
A: No. `mat-ops` is in the transitive closure of most algorithm nodes (~80%), but
some nodes — `fabrik`, `particle-filter`, `pid`, `pid-tuning-rules`, `fopdt-model`,
`relay-analysis`, and all path planners — depend only on `result-types` or
`drivetrain-types`. Check each recipe's node list.

**Q: What are the test-only nodes?**
A: `test-scenarios` and `test-chains` provide test fixtures (robot arm configurations,
sensor scenarios). They are excluded from all production recipes. You only need them
if you want to run the reference test suite.

**Q: Does `mpc` really depend on the optimization skill?**
A: Yes. MPC solves an optimization problem at each timestep. It uses BFGS from the
optimization skill (`optimization:bfgs`) as its solver. Generate `bfgs --lang <language>`
from the optimization skill first, then generate `mpc --lang <language>` from this skill.

**Q: What quaternion convention is used?**
A: Hamilton `(w, x, y, z)` — scalar-first. If you're integrating with ROS 2 (which uses
`(x, y, z, w)` — scalar-last), you'll need to reorder quaternion components at the
ROS interface boundary. All internal math uses Hamilton convention.

**Q: What DH convention is used?**
A: Standard Denavit-Hartenberg (1955). Not Modified DH (Craig). If your robot's datasheet
provides Modified DH parameters, you'll need to convert them. The `dh-parameters` node
documents the convention and parameter ordering.

**Q: Can I add more nodes later?**
A: Yes. Each node is self-contained with explicit `@depends-on` declarations. Generate
additional nodes at any time — just include their transitive dependencies. Nodes from
different recipes coexist without conflict.

**Q: How do the dispatchers work (solve-ik, estimate-state, plan-path)?**
A: Each dispatcher uses `any-of()` dependencies — you include only the algorithm
implementations you want available. For example, `solve-ik` with just `fabrik` gives
you a dispatcher that only offers FABRIK. Add `jacobian-ik` later and the dispatcher
can offer both. The dispatcher selects based on a method/algorithm parameter.

**Q: Can I combine nodes from robotics and optimization skills?**
A: Only where explicitly declared. Currently, only `mpc` has a cross-skill dependency
on `optimization:bfgs`. All other robotics nodes are fully self-contained within
this skill.

**Q: How do I know if my translation is correct?**
A: Each `nodes/<name>/spec.md` includes test vectors with `@provenance` annotations.
The reference test suite has 936 tests at 100% coverage — these define the behavioral
contract. Generate the test vectors in your target language to validate correctness.

**Q: What if my language isn't listed?**
A: The `nodes/<name>/spec.md` files are language-agnostic behavioral specifications
with test vectors. Any language with floating-point arrays and basic linear algebra
can implement them. The `to-<lang>.md` hints just accelerate translation for
listed languages.
