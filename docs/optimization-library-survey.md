# Optimization Library Survey

Comprehensive survey of optimization libraries, algorithms, and methods.
This document serves as the knowledge base for the optimize reference skill.

Last updated: 2026-02-01

## Libraries Surveyed

| # | Library | Language | Version | License | Focus |
|---|---------|----------|---------|---------|-------|
| 1 | **scipy.optimize** | Python | 1.17.0 | BSD-3 | General scientific |
| 2 | **Optim.jl** | Julia | 2.0.0 | MIT | Mathematical optimization |
| 3 | **Ceres Solver** | C++ | 2.2.0 | Apache-2.0 | Nonlinear least squares + general |
| 4 | **NLopt** | C (multi-lang) | 2.10.0 | LGPL/MIT | Unified multi-algorithm |
| 5 | **dlib** | C++ | 19.7+ | Boost-1.0 | ML + optimization |
| 6 | **Optax** | Python/JAX | 0.2.6+ | Apache-2.0 | Deep learning optimizers |
| 7 | **LBFGSPP** | C++ (header) | 0.3.0 | MIT | L-BFGS only |
| 8 | **Optimization.jl** | Julia | 3.12+ | MIT | SciML unified interface |
| 9 | **nlminb** | R (Fortran) | R core | GPL-2/3 | Box-constrained QN |
| 10 | **Apache Commons Math** | Java | 3.6.1 | Apache-2.0 | General scientific |
| 11 | **MATLAB fminunc/fminsearch** | MATLAB | R2024+ | Proprietary | Engineering |

## Algorithm Cross-Reference

### Derivative-Free (Zeroth-Order)

| Algorithm | scipy | Optim.jl | Ceres | NLopt | dlib | Commons | We Have? |
|-----------|-------|----------|-------|-------|------|---------|----------|
| **Nelder-Mead** | Yes | Yes | — | Yes | — | Yes | **Yes** |
| **Powell** | Yes | — | — | — | — | Yes | No |
| **COBYLA** | Yes | — | — | Yes | — | — | No |
| **BOBYQA** | — | — | — | Yes | Yes | Yes | No |
| **CMA-ES** | — | — | — | — | — | Yes | No |
| **Simulated Annealing** | dual_ann | SA+SAMIN | — | — | — | — | **Yes** |
| **Particle Swarm** | — | Yes | — | — | — | — | No |
| **DIRECT** | Yes | — | — | Yes | — | — | No |
| **NEWUOA** | — | — | — | Yes | — | — | No |
| **PRAXIS** | — | — | — | Yes | — | — | No |
| **Sbplx** | — | — | — | Yes | — | — | No |
| **Brent (1D)** | Yes | Yes | — | — | — | — | **Yes** |
| **Golden Section (1D)** | Yes | Yes | — | — | — | — | No |

### First-Order (Gradient-Based)

| Algorithm | scipy | Optim.jl | Ceres | NLopt | dlib | Optax | We Have? |
|-----------|-------|----------|-------|-------|------|-------|----------|
| **Gradient Descent** | — | Yes | Yes | — | — | SGD | **Yes** |
| **BFGS** | Yes | Yes | Yes | — | Yes | — | **Yes** |
| **L-BFGS** | L-BFGS-B | Yes | Yes | Yes | Yes | Yes | **Yes** |
| **Conjugate Gradient** | CG | Yes (HZ) | NL-CG | — | PR | — | **Yes** |
| **Momentum GD** | — | Yes | — | — | — | — | No |
| **Accelerated GD** | — | Yes | — | — | — | — | No |
| **NGMRES** | — | Yes | — | — | — | — | No |
| **OACCEL** | — | Yes | — | — | — | — | No |
| **Adam** | — | — | — | — | — | Yes | No |
| **AdaGrad** | — | — | — | — | — | Yes | No |
| **RMSProp** | — | — | — | — | — | Yes | No |
| **Lion** | — | — | — | — | — | Yes | No |
| **MMA** | — | — | — | Yes | — | — | No |
| **SLSQP** | Yes | — | — | Yes | — | — | No |

### Second-Order (Hessian-Based)

| Algorithm | scipy | Optim.jl | Ceres | dlib | We Have? |
|-----------|-------|----------|-------|------|----------|
| **Newton** | Newton-CG | Yes | — | Yes | **Yes** |
| **Newton Trust Region** | trust-ncg | Yes | — | Yes | **Yes** |
| **Krylov Trust Region** | trust-krylov | Yes | — | — | **Yes** |
| **Levenberg-Marquardt** | least_sq | — | Yes | — | No |
| **IPNewton** | — | Yes | — | — | **Yes** |

### Line Search Methods

| Line Search | scipy | Optim.jl | Ceres | LBFGSPP | We Have? |
|-------------|-------|----------|-------|---------|----------|
| **Backtracking (Armijo)** | — | Yes | Yes | Yes | **Yes** |
| **Strong Wolfe** | Yes | Yes | Yes | Yes | **Yes** |
| **HagerZhang** | — | Yes (default) | — | — | **Yes** |
| **MoreThuente** | — | Yes | — | Yes | **Yes** |
| **Cubic interpolation** | Yes | — | Yes | — | No |

## Default Parameter Comparison

### Gradient Tolerance

| Library | Default | Notes |
|---------|---------|-------|
| **Our reference** | 1e-8 | matches Optim.jl |
| scipy | 1e-5 (gtol) | looser |
| Optim.jl | 1e-8 (g_abstol) | only non-zero default |
| Ceres | not documented | — |
| NLopt | 0 (user must set) | — |
| LBFGSPP | 1e-5 (epsilon) | — |
| nlminb | — | rel_tol=1e-10 |
| MATLAB | 1e-6 | — |

### L-BFGS Memory

| Library | Default | Notes |
|---------|---------|-------|
| **Our reference** | 10 | matches Optim.jl, scipy |
| scipy | 10 | — |
| Optim.jl | 10 | — |
| LBFGSPP | 6 | smaller |
| Ceres | auto | — |

### Nelder-Mead Parameters

All libraries use: alpha=1, gamma=2, rho=0.5, sigma=0.5 (universal standard).

### Default Method Selection (no gradient provided)

| Library | Default | Notes |
|---------|---------|-------|
| **Our reference** | Nelder-Mead | matches Optim.jl |
| scipy | BFGS + FD | uses finite differences |
| Optim.jl | NelderMead | — |
| MATLAB | fminsearch (NM) | — |
| NLopt | user must specify | — |

### Default Method Selection (gradient provided)

| Library | Default | Notes |
|---------|---------|-------|
| **Our reference** | BFGS | — |
| scipy | BFGS | — |
| Optim.jl | L-BFGS | prefers limited-memory |
| MATLAB | BFGS | — |

## Optim.jl Full Algorithm Coverage Gap

### Already Implemented (14/19)
- NelderMead, GradientDescent, BFGS, LBFGS, ConjugateGradient, Newton,
  NewtonTrustRegion, HagerZhang, MoreThuente, Brent1D, Fminbox,
  SimulatedAnnealing, KrylovTrustRegion, Minimize (dispatcher)

### Tier 1: Essential (all implemented)
- ~~ConjugateGradient~~ ✅
- ~~NewtonTrustRegion~~ ✅
- ~~Newton~~ ✅
- ~~HagerZhang line search~~ ✅
- ~~Brent (1D)~~ ✅

### Tier 2: Useful
- **SAMIN** — simulated annealing with bounds (Optim.jl specific)
- ~~IPNewton~~ ✅

### Tier 3: Nice to Have
- **ParticleSwarm** — global optimization
- **MomentumGradientDescent** — historical interest
- **AcceleratedGradientDescent** — Nesterov's method
- **NGMRES/OACCEL** — advanced acceleration
- **GoldenSection (1D)** — simple univariate
- **Preconditioner support** — performance enhancement

### Tier 4: Out of Scope (for now)
- Manifold optimization — very specialized
- Complex-valued optimization — niche
- Adam/AdaGrad/RMSProp — deep learning (different problem class)
- BOBYQA/COBYLA/NEWUOA — NLopt-specific derivative-free
- Levenberg-Marquardt — nonlinear least squares (different API)
- DIRECT — global optimization with very different structure

## Test Function Cross-Reference

### Functions We Have

| Function | Year | scipy | Optim.jl | Commons | Dimensions |
|----------|------|-------|----------|---------|------------|
| Sphere | — | rosen-like | — | — | 2D |
| Booth | — | — | — | — | 2D |
| Rosenbrock | 1960 | rosen | Yes | Yes | 2D (n-D available) |
| Beale | 1958 | — | — | — | 2D |
| Himmelblau | 1972 | — | — | Yes | 2D |
| Goldstein-Price | 1971 | — | — | — | 2D |

### Missing from OptimTestProblems.jl (14 more)
- Quadratic Diagonal, Hosaki, Large Polynomial, Penalty Function I
- Extended Rosenbrock (n-D), Polynomial, Powell, Exponential
- Paraboloid Diagonal, Paraboloid Random Matrix, Extended Powell
- Trigonometric, Fletcher-Powell, Parabola

### Commonly Used Elsewhere
- **Rastrigin** — multimodal global (NLopt benchmarks)
- **Ackley** — multimodal global
- **Schwefel** — multimodal global
- **Styblinski-Tang** — multimodal
- **McCormick** — bounded
- **More-Garbow-Hillstrom** — scipy benchmark suite

## Cross-Validation Status

| Library | Method | Status |
|---------|--------|--------|
| **scipy v1.17.0** | BFGS, L-BFGS-B, Nelder-Mead, CG | **Empirically validated** (30 runs) |
| **Optim.jl v2.0.0** | BFGS, L-BFGS, NelderMead, GD, CG, Newton, NTR, MoreThuente, Fminbox, KrylovTR | **Empirically validated** (60 runs) |
| **MATLAB** | Default parameters only | **Documented** (not run) |
| **Ceres** | — | Surveyed only |
| **NLopt** | — | Surveyed only |
| **dlib** | — | Surveyed only |
| **Optax** | — | Surveyed only (different problem class) |
| **LBFGSPP** | — | Surveyed only |
| **nlminb** | — | Surveyed only |
| **Commons Math** | — | Surveyed only |

## Empirical Validation Artifacts

| Artifact | Location |
|----------|----------|
| scipy raw results (JSON) | `reference/optimize/scipy-validation.json` |
| Optim.jl raw results (JSON) | `reference/optimize/julia-validation.json` |
| Our raw results (JSON) | `reference/optimize/our-validation.json` |
| Cross-validation tests | `reference/optimize/src/cross-validation.test.ts` |
| Comparison report | `reference/optimize/CROSS-VALIDATION.md` |
| Julia validation script | `scripts/julia-validation.jl` |

## Future Validation Opportunities

### Julia Environment (completed 2026-02-02)
- ✅ Ran Optim.jl BFGS/LBFGS/NelderMead/GD/CG on all 6 test functions (30 runs)
- ✅ Compared iteration counts and final values — see `reference/optimize/CROSS-VALIDATION.md`
- ✅ Validated HagerZhang line search behavior (fewer iterations than Strong Wolfe)
- ✅ Surveyed OptimTestProblems.jl (17 problems; we cover 3: Rosenbrock, Beale, Himmelblau)
- ✅ Raw results saved to `reference/optimize/julia-validation.json`
- ✅ Cross-validation tests added to `reference/optimize/src/cross-validation.test.ts`
- ✅ Ran BFGS/LBFGS with MoreThuente line search (12 runs) — validated 2026-02-02
- ✅ Ran Fminbox(LBFGS) with interior + boundary-active bounds (8 runs) — validated 2026-02-02

### Requires MATLAB Environment
- Run fminunc (BFGS) and fminsearch (NM) on test functions
- Compare default tolerance behavior

### Requires C++ Build Environment
- Build and run Ceres on test functions
- Build and run dlib BFGS/LBFGS
- Validate LBFGSPP against our L-BFGS

### Performance Benchmarks (Future)
- Wall-clock time per function evaluation
- Iterations to convergence vs dimension
- Memory usage (BFGS vs L-BFGS scaling)
- Line search cost comparison (Wolfe vs HagerZhang)
