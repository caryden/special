# Robotics Library Survey

Comprehensive survey of robotics libraries, algorithms, and methods across 6 algorithm domains.
This document serves as the knowledge base for the robotics reference skill.

Last updated: 2026-02-03

## Libraries Surveyed

| # | Library | Language | Version | License | Focus |
|---|---------|----------|---------|---------|-------|
| 1 | **GTSAM** | C++ (Python bindings) | 4.2 | BSD-2 | Factor graphs, SLAM, state estimation |
| 2 | **ROS 2 nav2 / tf2** | C++ | Jazzy | Apache-2.0 | Navigation, transforms, planning |
| 3 | **Drake** | C++ (Python bindings) | 1.0+ | BSD-3 | Multibody dynamics, planning, control |
| 4 | **Robotics Toolbox (Corke)** | Python | 1.1.0 | MIT | Kinematics, dynamics, planning, control |
| 5 | **OMPL** | C++ (Python bindings) | 1.7.0 | BSD-3 | Sampling-based motion planning |
| 6 | **MoveIt 2** | C++ | 2.5+ | BSD-3 | Motion planning, IK, collision checking |
| 7 | **FilterPy** | Python | 1.4.4 | MIT | Kalman filters, particle filters |
| 8 | **manif** | C++ (Python bindings) | 0.0.5 | MIT | Lie group operations for estimation |
| 9 | **Pinocchio** | C++ (Python bindings) | 3.4.0 | BSD-2 | Rigid body dynamics, kinematics |
| 10 | **OROCOS KDL** | C++ | 1.5.3 | LGPL-2.1 | Kinematic chains, IK |
| 11 | **python-control** | Python | 0.10.2 | BSD-3 | Control systems (PID, LQR, MPC) |
| 12 | **CasADi** | C++ (Python/MATLAB) | 3.6+ | LGPL-3.0 | Nonlinear optimization, MPC |
| 13 | **PythonRobotics (AtsushiSakai)** | Python | --- | MIT | Educational implementations |
| 14 | **MATLAB Robotics System Toolbox** | MATLAB | R2024+ | Proprietary | Kinematics, planning, control |
| 15 | **Eigen / Sophus** | C++ (header) | 3.4 / 1.22 | MPL-2.0 / MIT | Linear algebra, Lie groups |

## Algorithm Cross-Reference

### State Estimation

| Algorithm | GTSAM | FilterPy | Drake | Corke | PythonRobotics | python-control | MATLAB |
|-----------|-------|----------|-------|-------|----------------|----------------|--------|
| **Kalman Filter (KF)** | via FG | Yes | --- | --- | --- | --- | Yes |
| **Extended Kalman Filter (EKF)** | via FG | Yes | Yes | --- | Yes | --- | Yes |
| **Unscented Kalman Filter (UKF)** | --- | Yes | --- | --- | --- | --- | Yes |
| **Particle Filter** | --- | Yes | --- | --- | Yes | --- | --- |
| **IMU Preintegration** | Yes | --- | Yes | --- | --- | --- | --- |
| **H-Infinity Filter** | --- | Yes | --- | --- | --- | --- | --- |

**Notes:**
- GTSAM implements KF and EKF as special cases of factor graph inference rather than
  as standalone filters. The underlying math is identical but the API shape differs
  (factors + variables vs. predict/update cycle).
- FilterPy provides the most complete standalone filter library with a consistent
  predict/update API across all filter types.
- PythonRobotics EKF and particle filter implementations are educational — clear and
  correct but not production-hardened.

### SLAM / Factor Graphs

| Algorithm | GTSAM | PythonRobotics | MATLAB | Nav2 |
|-----------|-------|----------------|--------|------|
| **Pose Graph Optimization** | Yes | --- | Yes | --- |
| **iSAM2** | Yes | --- | --- | --- |
| **EKF-SLAM** | --- | --- | Yes | --- |
| **FastSLAM** | --- | Yes | --- | --- |
| **Scan Matching (ICP)** | --- | Yes | Yes | --- |

**Notes:**
- iSAM2 (incremental smoothing and mapping) is GTSAM-specific and architecturally
  complex. It maintains a Bayes tree that is incrementally updated as new factors
  arrive, avoiding full re-optimization.
- Pose graph optimization is the most tractable SLAM formulation for a reference
  implementation — it reduces to nonlinear least squares over SE(2) or SE(3) poses.
- Nav2 relies on external SLAM packages (SLAM Toolbox, Cartographer) rather than
  implementing SLAM algorithms directly.

### Kinematics

| Algorithm | Pinocchio | KDL | Corke | Drake | MATLAB |
|-----------|-----------|-----|-------|-------|--------|
| **Forward Kinematics (DH)** | Yes | Yes | Yes | Yes | Yes |
| **Jacobian Computation** | Yes | Yes | Yes | Yes | Yes |
| **RNEA (Inverse Dynamics)** | Yes | Yes | --- | Yes | Yes |
| **ABA (Forward Dynamics)** | Yes | --- | --- | Yes | --- |
| **CRBA (Inertia Matrix)** | Yes | --- | --- | Yes | --- |
| **DH Parameters** | Yes | Yes | Yes | --- | Yes |

**Notes:**
- Forward kinematics and Jacobian computation are universally standardized across all
  libraries. The Denavit-Hartenberg (DH) convention is the dominant parameterization,
  though Drake uses spatial algebra (Featherstone) natively.
- RNEA (Recursive Newton-Euler Algorithm) computes inverse dynamics in O(n) time.
  Pinocchio and Drake both provide optimized implementations.
- ABA (Articulated Body Algorithm) computes forward dynamics in O(n) time. Only
  Pinocchio and Drake implement it — KDL and Corke use CRBA + solve instead.
- CRBA (Composite Rigid Body Algorithm) computes the joint-space inertia matrix
  M(q) in O(n^2) time. Required for dynamics-based control (computed torque, LQR
  on linearized dynamics).

### Inverse Kinematics

| Algorithm | Corke | KDL | Pinocchio | MoveIt | Drake | MATLAB |
|-----------|-------|-----|-----------|--------|-------|--------|
| **Levenberg-Marquardt IK** | Yes (ik_LM) | Yes (LMA) | --- | --- | --- | --- |
| **Newton-Raphson IK** | Yes (ik_NR) | Yes (NR) | --- | --- | --- | --- |
| **Gauss-Newton IK** | Yes (ik_GN) | --- | --- | --- | --- | --- |
| **QP-based IK** | Yes (ikine_QP) | --- | --- | --- | --- | --- |
| **KDL (Newton)** | --- | Yes (NR_JL) | --- | Yes (default) | --- | --- |
| **TRAC-IK (SQP + KDL)** | --- | --- | --- | Yes (plugin) | --- | --- |
| **IKFast (analytical)** | --- | --- | --- | Yes (plugin) | --- | --- |
| **Numerical IK** | --- | --- | Yes | --- | Yes | Yes |
| **Analytical IK** | --- | --- | --- | --- | --- | Yes |

**Notes:**
- Multiple numerical methods exist but all converge to the same solutions for
  well-conditioned problems. The choice between LM, NR, and GN affects convergence
  speed near singularities but not the final result.
- TRAC-IK runs KDL's Newton-Raphson solver and an SQP solver in parallel, returning
  whichever converges first. This improves success rate but adds implementation
  complexity.
- IKFast generates analytical closed-form IK solutions for specific robot geometries
  at build time using symbolic computation. Not applicable to general-purpose IK.
- Corke provides the widest variety of IK solvers in a single library, with consistent
  API across LM, NR, GN, and QP methods.

### Motion Planning

| Algorithm | OMPL | Nav2 | PythonRobotics | Drake | MoveIt | Corke | MATLAB |
|-----------|------|------|----------------|-------|--------|-------|--------|
| **RRT** | Yes | --- | Yes | --- | via OMPL | Yes | Yes |
| **RRT*** | Yes | --- | Yes | --- | via OMPL | --- | --- |
| **PRM** | Yes | --- | Yes | --- | via OMPL | --- | --- |
| **A*** | --- | Yes (NavFn) | Yes | --- | --- | --- | --- |
| **Dijkstra** | --- | Yes (NavFn) | Yes | --- | --- | --- | --- |
| **D* / D* Lite** | --- | --- | Yes | --- | --- | --- | --- |
| **Hybrid-A*** | --- | Yes (Smac) | --- | --- | --- | --- | --- |
| **State Lattice** | --- | Yes (Smac) | --- | --- | --- | --- | --- |
| **EST** | Yes | --- | --- | --- | via OMPL | --- | --- |
| **SBL** | Yes | --- | --- | --- | via OMPL | --- | --- |
| **KPIECE** | Yes | --- | --- | --- | via OMPL | --- | --- |
| **Potential Field** | --- | --- | Yes | --- | --- | --- | --- |
| **Trajectory Optimization** | --- | --- | --- | Yes | --- | --- | Yes |
| **DWA (local)** | --- | Yes | Yes | --- | --- | --- | --- |
| **MPPI (local)** | --- | Yes | --- | --- | --- | --- | --- |
| **Pure Pursuit** | --- | Yes (RPP) | Yes | --- | --- | --- | --- |

**Notes:**
- Sampling-based planners (RRT, RRT*, PRM, EST, SBL, KPIECE) dominate the
  configuration-space planning problem. They are inherently stochastic — repeated
  runs produce different paths, making deterministic cross-validation impractical.
  Validation must focus on path validity (collision-free, connects start to goal)
  rather than path identity.
- OMPL is the de facto standard for sampling-based planning. MoveIt delegates all
  sampling-based planning to OMPL via a plugin interface.
- Nav2 provides both global planners (NavFn for A*/Dijkstra, Smac for Hybrid-A* and
  state lattice) and local planners (DWA, MPPI, Regulated Pure Pursuit).
- Grid-based planners (A*, Dijkstra, D*) operate on discrete occupancy grids and are
  deterministic — cross-validation is straightforward.
- Drake's trajectory optimization formulates planning as a mathematical program
  (nonlinear optimization over waypoints), which is deterministic and produces
  dynamically feasible trajectories.

### Control

| Algorithm | python-control | Drake | PythonRobotics | CasADi | Nav2 | MATLAB |
|-----------|----------------|-------|----------------|--------|------|--------|
| **PID** | --- | --- | Yes | --- | --- | Yes |
| **LQR (continuous)** | Yes (lqr) | Yes | Yes | --- | --- | Yes |
| **LQR (discrete)** | Yes (dlqr) | Yes | --- | --- | --- | Yes |
| **MPC** | --- | Yes | Yes | Yes (Opti) | MPPI | Yes |
| **Pure Pursuit** | --- | --- | Yes | --- | Yes (RPP) | --- |
| **Stanley Controller** | --- | --- | Yes | --- | --- | --- |
| **Pole Placement** | Yes (place, acker) | --- | --- | --- | --- | Yes |
| **State-Space** | Yes (StateSpace) | Yes | --- | --- | --- | Yes |

**Notes:**
- PID anti-windup is the most significant off-policy decision in the control domain.
  PythonRobotics and educational implementations use no anti-windup. Industrial
  implementations (ROS, MATLAB) use clamping or back-calculation. See the "PID
  Anti-Windup" section under Default Parameter Comparison for details.
- LQR is well-standardized across all libraries. All use the same formulation and
  solve the same algebraic Riccati equation (ARE). Differences are limited to API
  shape (continuous vs. discrete variants).
- MPC implementations vary significantly in approach: Drake uses mathematical
  programming (direct transcription), CasADi provides symbolic NLP formulation,
  and Nav2's MPPI uses sampling-based stochastic control.
- Pure pursuit and Stanley controller are path-tracking algorithms specific to
  wheeled mobile robots. They are simple, well-documented, and have no meaningful
  parameter divergence across implementations.

## Default Parameter Comparison

### Kalman Filter Initialization

| Library | P default | Q default | R default | Notes |
|---------|-----------|-----------|-----------|-------|
| FilterPy | eye(n) | eye(n) | eye(n) | Must override --- defaults are non-functional |
| MATLAB | User-specified | User-specified | User-specified | --- |

**Notes:**
- FilterPy initializes all covariance matrices to identity as a convenience, but
  these defaults are not meaningful for any real application. Users must set P, Q,
  and R based on their specific system. The identity defaults exist only to prevent
  NaN propagation before the user configures the filter.
- There is no "standard" default for Kalman filter noise matrices because they are
  entirely application-specific. A reference implementation should require explicit
  specification of Q and R, with P optionally defaulting to a scaled identity.

### PID Anti-Windup

| Library | Anti-Windup Method | Notes |
|---------|-------------------|-------|
| PythonRobotics | None | Educational; no output saturation |
| ROS 2 (ros2_control) | Clamping | Integral term clamped to configurable bounds |
| MATLAB (PID block) | Clamping + back-calculation | Selectable; back-calculation is default |
| Drake | N/A (no built-in PID node) | Users implement PID via System framework |

**Key off-policy decision:** PID anti-windup method varies significantly across
implementations. For a reference skill, clamping is the simplest correct approach:
clamp the integral accumulator to `[-i_max, i_max]` where `i_max` is a user-specified
bound. Back-calculation (which feeds back the saturation error into the integrator)
is more sophisticated but adds a tuning parameter (tracking time constant `Tt`).
Recommendation: implement clamping, document the choice.

### RRT Parameters

| Parameter | PythonRobotics | OMPL | Nav2 (Smac) | Corke |
|-----------|---------------|------|-------------|-------|
| Step size | 3.0 | configurable | --- | 0.2 |
| Goal bias | 5% | configurable | --- | configurable |
| Max iterations | 500 | configurable | --- | configurable |

**Notes:**
- RRT parameters are highly problem-dependent. Step size must be tuned relative to
  the workspace scale and obstacle density. Goal bias (probability of sampling the
  goal directly) affects convergence speed vs. exploration.
- OMPL does not impose defaults for most parameters — it requires the user to
  configure the state space, which implicitly determines appropriate step sizes.
- PythonRobotics uses fixed defaults suitable for its 2D example environments
  (100x100 unit workspace).

### LQR Cost Matrices

All libraries require user-specified Q and R matrices. No library provides meaningful
defaults --- the cost matrices are always problem-specific.

| Library | Formulation | API |
|---------|-------------|-----|
| python-control | minimize integral of x'Qx + u'Ru (continuous) | `lqr(A, B, Q, R)` |
| python-control | minimize sum of x'Qx + u'Ru (discrete) | `dlqr(A, B, Q, R)` |
| Drake | Same formulation, both continuous and discrete | `LinearQuadraticRegulator(A, B, Q, R)` |
| MATLAB | Same formulation | `lqr(A, B, Q, R)` / `dlqr(A, B, Q, R)` |

All implementations solve the algebraic Riccati equation (ARE) to compute the optimal
gain matrix K. The continuous ARE is A'P + PA - PBR^(-1)B'P + Q = 0. The discrete ARE
is A'PA - P - A'PB(R + B'PB)^(-1)B'PA + Q = 0. Results are identical across libraries
for the same inputs (up to numerical precision of the ARE solver).

### iSAM2 Parameters (GTSAM)

| Parameter | Default | Notes |
|-----------|---------|-------|
| relinearizationThreshold | 0.1 | Per-variable or global |
| relinearizeSkip | 10 | Every N updates |
| enableRelinearization | true | --- |

**Notes:**
- iSAM2 is GTSAM-specific. No other surveyed library implements incremental
  smoothing with a Bayes tree. These parameters control when the tree is partially
  re-linearized, trading accuracy for computational cost.
- The `relinearizationThreshold` determines how much a variable's linearization point
  must change before it is re-linearized. Lower values produce more accurate results
  at higher computational cost.

### IK Solver Parameters

| Library | Solver | Max Iterations | Tolerance | Notes |
|---------|--------|----------------|-----------|-------|
| KDL (NR) | Newton-Raphson | 100 | 1e-6 | Joint limit variant: NR_JL |
| KDL (LMA) | Levenberg-Marquardt | configurable | configurable | Task-space weighting for rotation vs. translation |
| Corke | LM/GN/NR | configurable | configurable | C++ solvers ~30-90 us; Python ~100-1000 ms |

**Notes:**
- IK convergence tolerance is typically specified in task space (Cartesian error in
  meters and radians). A tolerance of 1e-6 corresponds to sub-micrometer position
  accuracy, which is more precise than most robot hardware can achieve.
- The rotation-vs.-translation weighting in KDL's LMA solver is significant: it
  determines the relative importance of achieving the target orientation vs. position
  when both cannot be satisfied simultaneously (e.g., near singularities).

## Representation Comparison

### Rotation Representations

| Library | Primary Format | Quaternion Convention | Lie Group Support |
|---------|----------------|----------------------|-------------------|
| GTSAM | Rot3 (matrix) | --- (uses Rodrigues) | Yes (Expmap/Logmap) |
| Drake | RotationMatrix | Hamilton (w,x,y,z) in canonical form | RollPitchYaw class |
| Corke | SO3 / UnitQuaternion | (s, v) scalar-first | SE3, SO3, Twist classes |
| Pinocchio | SE3/SO3 | JPL-like (x,y,z,w) | Yes (exp3/log3, exp6/log6) |
| KDL | Rotation (matrix) | --- | Limited |
| manif | SO3/SE3 | Eigen-compatible | Full (exp, log, compose, act, adjoint, Jacobians) |
| Sophus | SO3/SE3 | Eigen Quaterniond | Full (exp, log) |
| ROS 2 tf2 | Quaternion msg | (x,y,z,w) | --- |
| MATLAB | rotm / quat / eul / axang | (w,x,y,z) | SO3 objects |

**Notes:**
- Rotation representation is one of the most fragmented aspects of robotics libraries.
  Rotation matrices (3x3), quaternions, Euler angles, axis-angle, and Rodrigues vectors
  are all in active use.
- Lie group support (exponential/logarithmic maps) is essential for state estimation
  on manifolds. GTSAM, Pinocchio, manif, and Sophus all provide it. FilterPy and
  PythonRobotics do not.
- The manif library is specifically designed for Lie group operations and provides
  analytical Jacobians of all operations, which is critical for optimization-based
  state estimation.

### Pose Representations

| Library | 2D Pose | 3D Pose | Homogeneous Transform |
|---------|---------|---------|----------------------|
| GTSAM | Pose2 (theta, x, y) | Pose3 (Rot3 + Point3) | Via matrix() |
| Drake | --- | RigidTransform (RotationMatrix + Vector3) | 4x4 via GetAsMatrix4() |
| Pinocchio | --- | SE3 (SO3 + translation) | --- |
| KDL | --- | Frame (Rotation + Vector) | --- |
| Corke | SE2 | SE3 | 4x4 matrix |
| ROS 2 | geometry_msgs/Pose2D | geometry_msgs/Pose | geometry_msgs/Transform |

**Notes:**
- 2D pose support is limited. Only GTSAM (Pose2), Corke (SE2), and ROS 2
  (geometry_msgs/Pose2D) provide dedicated 2D pose types. Most libraries focus on
  3D and leave 2D as a special case.
- Homogeneous transforms (4x4 matrices) are the universal interchange format. Every
  library can produce one, but most use more compact internal representations.

### State Vector Representations

| Library | State Estimation Format | Notes |
|---------|-------------------------|-------|
| FilterPy | x (dim_x x 1 ndarray) + P (dim_x x dim_x ndarray) | All NumPy arrays, float type |
| GTSAM | Values container (typed variable assignments) | Separate from factor graph |
| python-control | StateSpace (A, B, C, D matrices) | MIMO support |

**Notes:**
- FilterPy uses raw NumPy arrays for state and covariance, which is the simplest
  representation and easiest to translate. The state vector x is always a column
  vector (dim_x x 1) and the covariance P is always square (dim_x x dim_x).
- GTSAM uses a typed Values container where each variable has a key and a typed
  value (e.g., Pose3, Point3, imuBias::ConstantBias). This is more expressive but
  harder to translate to languages without generic containers.

## Linear Algebra Approaches

### Library Dependencies

| Library | Linear Algebra Backend | Notes |
|---------|----------------------|-------|
| GTSAM | Eigen | Core dependency; Point2/Point3 being retired in favor of Eigen types |
| Drake | Eigen | Core dependency; all math types in drake::math |
| Pinocchio | Eigen | Core dependency; all computations |
| KDL | Eigen3 (partial) | KDL::Vector/Matrix predate Eigen; partial integration |
| manif | Eigen (sole dependency) | Header-only, Eigen-like design |
| Sophus | Eigen | Header-only, built on Eigen |
| FilterPy | NumPy + SciPy | All arrays are numpy.ndarray (not numpy.matrix) |
| python-control | NumPy + SciPy | Optional Slycot backend |
| Corke | NumPy (spatialmath) | spatialmath library for SE3/SO3 |
| PythonRobotics | NumPy + SciPy + cvxpy | Minimal dependencies |
| CasADi | Self-contained C++ | IPOPT and qpOASES bundled; symbolic differentiation |
| MATLAB | Built-in | Native MATLAB matrix operations |

**Notes:**
- Eigen dominates the C++ robotics ecosystem. Every major C++ robotics library
  (GTSAM, Drake, Pinocchio, manif, Sophus) depends on it. This makes Eigen types
  the de facto interchange format for C++ robotics code.
- NumPy dominates the Python robotics ecosystem with the same universality.
- A reference implementation targeting multiple languages must define its own minimal
  matrix operations (see below) rather than depending on a specific linear algebra
  library.

### Minimum Viable Matrix Operations for Robotics Skill

Based on the survey, the following matrix operations are required across all
6 algorithm domains:

| Operation | Used By | Priority |
|-----------|---------|----------|
| Matrix multiply (A x B) | All domains | Essential |
| Matrix transpose (A') | All domains | Essential |
| Matrix inverse (A^-1) | KF, EKF, IK (Jacobian pseudo-inverse) | Essential |
| Linear solve (Ax = b) | LQR (Riccati), KF (Kalman gain) | Essential |
| Cholesky decomposition (LL') | UKF (sigma points), KF (numerical stability) | Essential |
| Matrix determinant | KF (innovation gating) | Useful |
| Eigendecomposition | LQR (stability check), system analysis | Useful |
| SVD | IK (pseudo-inverse), least squares | Useful |
| Identity / zeros / ones | All domains | Essential |
| Outer product (ab') | KF (covariance update) | Essential |

**Estimated `mat-ops` node size: 10-12 functions** covering multiply, transpose,
invert, solve, cholesky, determinant, eigendecomposition, SVD, identity construction,
and outer product.

## Coordinate Conventions

All surveyed libraries use:
- **Right-handed coordinate system**
- **Radians** for angular quantities (MATLAB supports both but defaults to radians
  in Robotics System Toolbox)
- **SI units** (meters, seconds, kilograms)

### Quaternion Convention Divergence (Key Off-Policy Decision)

| Convention | Format | Libraries |
|------------|--------|-----------|
| Hamilton / scalar-first | (w, x, y, z) | Drake, Corke, MATLAB, Eigen::Quaterniond |
| JPL-like / scalar-last | (x, y, z, w) | ROS 2 tf2, Pinocchio, many game engines |

This is a significant off-policy decision. The skill should choose one convention and
document it clearly. Recommendation: **Hamilton (w,x,y,z)** --- matches Drake, Corke,
MATLAB, and Eigen (the most common robotics libraries). ROS users must swap on
input/output.

**Rationale:** Hamilton convention is used by the majority of robotics-focused libraries
(Drake, Corke, MATLAB, Eigen). The JPL/scalar-last convention is primarily driven by
ROS message definitions and game engines. Since the reference implementation targets
robotics applications (not game development), Hamilton is the natural choice. The
conversion is trivial: `(x,y,z,w) <-> (w,x,y,z)` is a single reorder.

## Coverage Summary

| Domain | Algorithms Surveyed | Libraries Contributing | Key Finding |
|--------|--------------------|-----------------------|-------------|
| State Estimation | KF, EKF, UKF, PF, IMU preintegration, H-infinity | 5 | KF/EKF highly standardized; UKF sigma point generation varies |
| SLAM / Factor Graphs | Pose graph, iSAM2, EKF-SLAM, FastSLAM | 3 | iSAM2 is complex (GTSAM-specific); pose graph optimization is tractable |
| Kinematics | FK, Jacobian, RNEA, ABA, CRBA, DH | 5 | DH parameters universally standardized; dynamics algorithms well-documented |
| IK Solvers | LM, NR, GN, QP, KDL, TRAC-IK, analytical | 5 | Multiple numerical methods; all converge to same solutions |
| Motion Planning | RRT, RRT*, PRM, A*, D*, Hybrid-A*, EST, SBL, KPIECE, DWA, MPPI | 5 | Sampling-based planners dominate; inherently stochastic |
| Control | PID, LQR, MPC, pure pursuit, Stanley, pole placement | 5 | PID anti-windup is key off-policy decision; LQR well-standardized |

**Key cross-cutting findings:**

1. **Representation fragmentation is the biggest challenge.** Quaternion conventions,
   pose types, and state vector formats vary across libraries far more than the
   algorithms themselves. A reference skill must make clear representation choices
   and document them prominently.

2. **Core algorithms are well-standardized.** KF/EKF predict-update cycles, DH-based
   forward kinematics, Newton-Raphson IK, RRT, LQR, and PID all have essentially
   identical mathematical formulations across all libraries. Divergence is in API
   shape and default parameters, not in the algorithms.

3. **Stochastic algorithms resist cross-validation.** RRT, RRT*, PRM, particle
   filters, and MPPI produce different results on each run. Validation must check
   correctness properties (collision-free paths, state estimate convergence) rather
   than exact numerical agreement.

4. **Linear algebra is the universal dependency.** Every algorithm in every domain
   requires matrix operations. A `mat-ops` node is the foundation of the entire
   skill, analogous to `vec-ops` in the optimization skill.

5. **Lie group operations are optional but valuable.** Required only for IMU
   preintegration and manifold-aware state estimation. KF, EKF, FK, IK, RRT, PID,
   and LQR all work with standard Euclidean representations.
