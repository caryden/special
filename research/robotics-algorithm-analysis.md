# Robotics Algorithm Analysis

Scored fitness analysis of robotics algorithms for the Special skill format.
Each algorithm is evaluated against criteria that predict how well it will translate
across languages while maintaining behavioral correctness.

Last updated: 2026-02-03

## Fitness Criteria

| Criterion | Weight | What It Measures |
|-----------|--------|-----------------|
| Off-policy density | High | Arbitrary design decisions that differ across libraries |
| Platform independence | High | Pure math vs hardware-dependent |
| Cross-language demand | High | Needed in C++, Python, Java/Kotlin, Rust, Julia, etc. |
| Testability | High | Deterministic test vectors with known-correct outputs |
| Natural node subgraph | Medium | Decomposable into reusable sub-nodes |
| Complexity | Medium | Estimated node count and test surface |

### Scoring Scale

- **5**: Perfectly suited for skill format
- **4**: Well suited with minor caveats
- **3**: Moderate fit — some challenges
- **2**: Marginal fit — significant challenges
- **1**: Poor fit — fundamental incompatibility

## State Estimation

| Algorithm | Off-policy | Platform | Cross-lang | Testability | Subgraph | Complexity | Verdict |
|-----------|-----------|----------|-----------|------------|----------|-----------|---------|
| Kalman Filter (KF) | 3 | 5 | 5 | 5 | 5 | Low (2 nodes) | **Include** |
| Extended Kalman Filter (EKF) | 3 | 5 | 5 | 4 | 4 | Med (1 node) | **Include** |
| Unscented Kalman Filter (UKF) | 4 | 5 | 4 | 4 | 4 | Med (1 node) | **Include** |
| Particle Filter | 3 | 5 | 3 | 2 | 3 | Med (1 node) | **Defer** |
| IMU Preintegration | 2 | 3 | 3 | 3 | 3 | High (2+ nodes) | **Exclude** |
| H-Infinity Filter | 3 | 5 | 2 | 4 | 3 | Med (1 node) | **Exclude** |

### Rationale

**KF — Include**: The Kalman filter is the foundational state estimation algorithm. Separating into kalman-predict and kalman-update nodes enables maximum reuse. The predict/update decomposition is universal across all KF variants. Off-policy density is moderate (fused vs separated predict/update is a design choice, but the math is identical). Test vectors are fully deterministic — given F, H, Q, R, and a measurement sequence, the posterior mean and covariance are uniquely determined to machine precision. Cross-validated against FilterPy.

**EKF — Include**: Extends KF with nonlinear measurement/transition functions and analytical or numerical Jacobians. The choice between analytical vs numerical Jacobian is an off-policy decision we must document. Testability is slightly lower than KF because the Jacobian computation introduces numerical sensitivity. Still highly tractable.

**UKF — Include**: Higher off-policy density than EKF due to sigma point generation parameters (alpha, beta, kappa vary across libraries). However, once these parameters are fixed, the algorithm is deterministic and testable. The Merwe sigma point scheme is the most common; we should document this choice.

**Particle Filter — Defer**: Fundamentally stochastic. Test vectors require either seed control (fragile across languages) or statistical bounds (weak assertions). Cross-language demand is moderate. Deferring to Stage 4.

**IMU Preintegration — Exclude**: Tightly coupled to IMU hardware conventions (axis alignment, bias models, noise characteristics). Platform-dependent. Only GTSAM and Drake implement it. Not suitable for a general-purpose skill.

**H-Infinity Filter — Exclude**: Niche algorithm. Only FilterPy implements it among surveyed libraries. Low cross-language demand.

## SLAM / Factor Graphs

| Algorithm | Off-policy | Platform | Cross-lang | Testability | Subgraph | Complexity | Verdict |
|-----------|-----------|----------|-----------|------------|----------|-----------|---------|
| Pose Graph Optimization | 3 | 5 | 4 | 4 | 4 | High (3+ nodes) | **Defer** |
| iSAM2 | 5 | 4 | 3 | 3 | 2 | Very High | **Exclude** |
| EKF-SLAM | 3 | 5 | 3 | 4 | 4 | High (2+ nodes) | **Defer** |
| FastSLAM | 4 | 5 | 2 | 2 | 3 | High | **Exclude** |

### Rationale

**Pose Graph Optimization — Defer**: Tractable as a nonlinear least-squares problem on SE(2) or SE(3). Requires rotation-ops and transform-ops infrastructure. Cross-language demand is real (robotics teams in C++, Python, Rust all need this). Deferred to Stage 4 because it requires the optimization skill's solver (cross-skill dependency) and mature rotation/transform infrastructure.

**iSAM2 — Exclude**: GTSAM's incremental Bayes tree algorithm is extremely complex. The off-policy density is very high (relinearization policies, variable ordering heuristics, clique structure). Only GTSAM implements it. Not tractable as a self-contained skill node.

**EKF-SLAM — Defer**: Simpler than full factor graph SLAM. Can be built on top of EKF nodes with landmark management. Deferred because it requires stable EKF infrastructure first.

**FastSLAM — Exclude**: Particle-based SLAM. Same testability problems as particle filter, compounded by the SLAM mapping component. Only PythonRobotics has a pedagogical implementation.

## Kinematics

| Algorithm | Off-policy | Platform | Cross-lang | Testability | Subgraph | Complexity | Verdict |
|-----------|-----------|----------|-----------|------------|----------|-----------|---------|
| DH Parameters | 2 | 5 | 5 | 5 | 5 | Low (1 node) | **Include** |
| Forward Kinematics | 2 | 5 | 5 | 5 | 4 | Low (1 node) | **Include** |
| Differential Drive | 3 | 5 | 5 | 5 | 4 | Low (1 node) | **Include** |
| Mecanum Drive | 3 | 5 | 4 | 5 | 4 | Low (1 node) | **Include** |
| Swerve Drive | 4 | 5 | 4 | 5 | 4 | Med (1 node) | **Include** |
| Ackermann Steering | 3 | 5 | 4 | 5 | 4 | Low (1 node) | **Include** |
| Jacobian Computation | 2 | 5 | 5 | 5 | 4 | Med (part of FK) | **Include** |
| RNEA (Inverse Dynamics) | 2 | 5 | 4 | 4 | 3 | High | **Defer** |
| ABA (Forward Dynamics) | 2 | 5 | 3 | 4 | 3 | High | **Exclude** |
| CRBA (Inertia Matrix) | 2 | 5 | 3 | 4 | 3 | High | **Exclude** |

### Rationale

**DH Parameters — Include**: The Denavit-Hartenberg convention is the universal standard for serial manipulator description. Pure math, no design decisions beyond the (standard vs modified) DH convention choice (we'll use standard). Perfect testability — well-known robot models (2-link planar, PUMA 560, Stanford arm) provide exact test vectors.

**Forward Kinematics — Include**: Computes end-effector pose from joint angles via DH parameter chain multiplication. Deterministic, universally needed, well-tested against multiple libraries (Corke, KDL, Pinocchio, MATLAB).

**Drivetrain models (Differential, Mecanum, Swerve, Ackermann) — Include**: Each is a pure mathematical model mapping wheel speeds/angles to robot velocity. Platform-independent. Key off-policy decisions: wheel radius conventions, center-of-rotation assumptions. Cross-language demand is very high (FRC robotics, warehouse robots, autonomous vehicles).

**RNEA — Defer**: Important for dynamics but complex (recursive algorithm over the kinematic tree). Requires spatial inertia types. Deferred to Stage 3+.

**ABA, CRBA — Exclude**: Advanced dynamics algorithms. Only Pinocchio and Drake implement them. Low cross-language demand outside of simulation. The reference implementations are complex.

## Inverse Kinematics

| Algorithm | Off-policy | Platform | Cross-lang | Testability | Subgraph | Complexity | Verdict |
|-----------|-----------|----------|-----------|------------|----------|-----------|---------|
| Jacobian IK (Pseudo-inverse) | 3 | 5 | 5 | 4 | 4 | Med (1 node) | **Include** |
| CCD (Cyclic Coord. Descent) | 2 | 5 | 4 | 5 | 4 | Low (1 node) | **Include** |
| FABRIK | 2 | 5 | 4 | 5 | 4 | Low (1 node) | **Include** |
| Levenberg-Marquardt IK | 3 | 5 | 4 | 4 | 3 | Med | **Defer** |
| QP-based IK | 4 | 5 | 3 | 3 | 3 | Med | **Defer** |

### Rationale

**Jacobian IK — Include**: The standard numerical IK method using the Jacobian pseudo-inverse (or damped least squares). Off-policy decisions include damping factor (lambda) and step size. Testable against known robot configurations (Corke, KDL).

**CCD — Include**: Simple iterative algorithm that adjusts one joint at a time to minimize end-effector error. No matrix operations needed — just trigonometry. Very low complexity, excellent testability with known convergence to target.

**FABRIK — Include**: Forward And Backward Reaching Inverse Kinematics. Iterative, geometric approach that works in Cartesian space. No Jacobian computation needed. Fast convergence, simple implementation, deterministic results.

**LM IK, QP IK — Defer**: More sophisticated solvers with better convergence properties. LM IK could reuse the optimization skill's LM implementation (cross-skill dependency). QP IK requires a QP solver.

## Motion Planning

| Algorithm | Off-policy | Platform | Cross-lang | Testability | Subgraph | Complexity | Verdict |
|-----------|-----------|----------|-----------|------------|----------|-----------|---------|
| Graph Search (A*/Dijkstra) | 2 | 5 | 5 | 5 | 4 | Med (1 node) | **Include** |
| RRT | 4 | 5 | 5 | 3 | 4 | Med (1 node) | **Include** |
| RRT* | 4 | 5 | 4 | 3 | 4 | Med (1 node) | **Include** |
| PRM | 4 | 5 | 3 | 3 | 4 | Med (1 node) | **Defer** |
| D* / D* Lite | 3 | 5 | 3 | 4 | 3 | High | **Defer** |
| Potential Field | 3 | 5 | 4 | 5 | 3 | Low | **Defer** |
| Trajectory Optimization | 4 | 5 | 3 | 3 | 3 | High | **Exclude** |

### Rationale

**Graph Search — Include**: A* and Dijkstra on grid/graph representations are deterministic and universally needed. The skill provides a unified graph-search node that supports both algorithms via a heuristic parameter (heuristic=null gives Dijkstra). Perfect testability with known-optimal paths on grid maps.

**RRT — Include**: The core sampling-based planner. High off-policy density (step size, goal bias, sampling strategy), but once parameters are fixed, the algorithm is deterministic given a seed. Testability: use fixed seeds for regression tests, statistical bounds for correctness (path exists, no collisions, within length bounds). Cross-language demand is very high.

**RRT* — Include**: Asymptotically optimal RRT. Adds rewiring step. Same testability approach as RRT. Worth including because the incremental cost over RRT is small (one additional node) and the optimality guarantee is frequently needed.

**PRM — Defer**: Multi-query planner. Useful but less commonly needed than RRT. The roadmap construction phase adds complexity. Deferred to Stage 3.

**D* / D* Lite — Defer**: Replanning algorithms for dynamic environments. Important for mobile robotics but complex. Deferred to Stage 3.

**Trajectory Optimization — Exclude**: Requires optimization infrastructure (transcription methods, NLP solvers). Cross-skill dependency on optimization. Complex to test. Better served by CasADi or Drake for production use.

## Control

| Algorithm | Off-policy | Platform | Cross-lang | Testability | Subgraph | Complexity | Verdict |
|-----------|-----------|----------|-----------|------------|----------|-----------|---------|
| PID | 5 | 5 | 5 | 5 | 4 | Low (1 node) | **Include** |
| LQR | 3 | 5 | 5 | 5 | 3 | Med (1 node) | **Include** |
| Pure Pursuit | 3 | 5 | 5 | 5 | 4 | Low (1 node) | **Include** |
| Stanley Controller | 3 | 5 | 4 | 5 | 4 | Low (1 node) | **Include** |
| MPC | 5 | 5 | 4 | 3 | 3 | High (1 node) | **Defer** |
| Pole Placement | 3 | 5 | 3 | 5 | 3 | Low | **Exclude** |

### Rationale

**PID — Include**: Universally needed, highest off-policy density of any robotics algorithm. Anti-windup method (none, clamping, back-calculation), derivative filtering (none, low-pass), setpoint weighting, output clamping — all vary across libraries. This is the ideal skill candidate: widely needed, easy to implement, but the design decisions are invisible to most users. Cross-validated against python-control and PythonRobotics.

**LQR — Include**: Solves the continuous-time algebraic Riccati equation (CARE) or discrete-time (DARE) to compute optimal gain matrix K. Deterministic given A, B, Q, R matrices. Testable against python-control, Drake, and MATLAB. Key off-policy decision: continuous vs discrete default.

**Pure Pursuit — Include**: Simple geometric path tracker that follows a carrot point on the path. Key off-policy decision: lookahead distance (fixed vs adaptive). Deterministic, easy to test with known trajectories.

**Stanley Controller — Include**: Front-axle referenced crosstrack error controller. Used in the Stanford DARPA Grand Challenge winner. Deterministic, complementary to Pure Pursuit (different error model).

**MPC — Defer**: Requires a QP or NLP solver. This is the motivating case for cross-skill dependencies (mpc → optimization:bfgs or a QP solver). High off-policy density (prediction horizon, cost weights, constraint formulation). Deferred to Stage 4.

**Pole Placement — Exclude**: Classical control technique. Low cross-language demand (primarily used in MATLAB/Python academic settings). python-control's `place()` wraps scipy.signal.place_poles. Not enough demand to justify a node.

## Shared Infrastructure Analysis

### Matrix Operations Required per Algorithm

| Algorithm | multiply | transpose | invert | solve(Ax=b) | cholesky | det | eigen | SVD | outer |
|-----------|---------|-----------|--------|-------------|----------|-----|-------|-----|-------|
| KF predict | ✓ | ✓ | — | — | — | — | — | — | — |
| KF update | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ |
| EKF | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ |
| UKF | ✓ | ✓ | ✓ | — | ✓ | — | — | — | ✓ |
| FK | ✓ | — | — | — | — | — | — | — | — |
| Jacobian IK | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| LQR | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — |
| MPC | ✓ | ✓ | — | ✓ | — | — | — | — | — |
| Pose Graph | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |

### Minimum Viable `mat-ops` Node

Based on the analysis above, the minimum covering set is:

```
matMultiply(A, B)         — matrix multiplication
matTranspose(A)           — transpose
matInverse(A)             — inverse (via LU or Gauss-Jordan)
matSolve(A, b)            — solve Ax=b (via LU decomposition)
matCholesky(A)            — lower Cholesky factor L where A=LLᵀ
matDeterminant(A)         — determinant
matEigen(A)               — eigenvalues and eigenvectors (symmetric)
matSVD(A)                 — singular value decomposition
matIdentity(n)            — n×n identity matrix
matZeros(m, n)            — m×n zero matrix
matOuterProduct(a, b)     — abᵀ
matTrace(A)               — sum of diagonal elements
```

**Estimated size: 12 functions, ~200-300 lines of TypeScript reference code.**

### Rotation Operations Required per Algorithm

| Algorithm | rot→mat | quat→rot | euler→rot | compose | invert | act(v) | exp | log |
|-----------|---------|----------|-----------|---------|--------|--------|-----|-----|
| FK | ✓ | — | — | ✓ | — | — | — | — |
| IK | ✓ | — | — | ✓ | ✓ | ✓ | — | — |
| Differential Drive | ✓ | — | — | — | — | — | — | — |
| Swerve Drive | ✓ | — | — | — | — | — | — | — |
| SLAM | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ |

### Minimum Viable `rotation-ops` Node

```
rotationMatrix(angle, axis)  — rotation matrix from angle + axis
rotationFromQuaternion(q)    — quaternion (w,x,y,z) → 3×3 matrix
quaternionFromRotation(R)    — 3×3 matrix → quaternion
rotationFromEuler(r,p,y)     — roll-pitch-yaw → matrix (ZYX convention)
eulerFromRotation(R)         — matrix → roll-pitch-yaw
rotationCompose(R1, R2)      — R1 * R2
rotationInverse(R)           — Rᵀ (orthogonal inverse)
rotationAct(R, v)            — rotate vector v by R
```

**Estimated size: 8 functions, ~150-200 lines.**

### Key Questions Answered

1. **How big does `mat-ops` need to be?** 12 functions. The survey confirms that multiply, transpose, inverse, solve, and Cholesky are the critical set. Eigendecomposition and SVD are needed for LQR and IK respectively but could be deferred to Stage 2.

2. **Should `rotation-ops` include Lie group operations?** Not initially. Lie group operations (exp/log maps) are only needed for factor graph SLAM and on-manifold EKF, both of which are deferred. If included later, they would be a separate `lie-ops` node or extension to `rotation-ops`.

3. **Can MPC be self-contained?** No. MPC requires a QP or NLP solver. This confirms the need for cross-skill dependencies (mpc → optimization skill). A minimal MPC could use the optimization skill's BFGS or L-BFGS for the inner NLP solve.

4. **How to handle stochastic algorithms (RRT, particle filter)?** RRT: Fixed seed for regression tests + statistical bounds for correctness (path length within N% of optimal, collision-free). Particle filter: Deferred due to fundamental testability challenges.

5. **Is factor graph SLAM tractable?** No, not as a self-contained node. iSAM2 is too complex. Simple pose graph optimization is tractable but requires optimization infrastructure. Deferred.

6. **Which algorithms benefit from cross-skill dependencies?** MPC → optimization (QP/NLP solver), Pose Graph Optimization → optimization (nonlinear least squares), LM IK → optimization (Levenberg-Marquardt). These are the three natural cross-skill links identified.

## Verdict Summary

| Verdict | Count | Algorithms |
|---------|-------|-----------|
| **Include** | 18 | KF, EKF, UKF, DH params, FK, differential drive, mecanum drive, swerve drive, ackermann, Jacobian IK, CCD, FABRIK, graph search, RRT, RRT*, PID, LQR, pure pursuit, Stanley |
| **Defer** | 9 | Particle filter, pose graph opt, EKF-SLAM, RNEA, LM IK, QP IK, PRM, D*, MPC |
| **Exclude** | 8 | IMU preintegration, H∞, iSAM2, FastSLAM, ABA, CRBA, trajectory opt, pole placement |
