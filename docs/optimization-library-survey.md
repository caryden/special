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

### Already Implemented (15/19)
- NelderMead, GradientDescent, BFGS, LBFGS, ConjugateGradient, Newton,
  NewtonTrustRegion, HagerZhang, MoreThuente, Brent1D, Fminbox,
  SimulatedAnnealing, KrylovTrustRegion, IPNewton, Minimize (dispatcher)

### Tier 1: Essential (all implemented)
- ~~ConjugateGradient~~ ✅
- ~~NewtonTrustRegion~~ ✅
- ~~Newton~~ ✅
- ~~HagerZhang line search~~ ✅
- ~~Brent (1D)~~ ✅

### Tier 2: Useful
- ~~IPNewton~~ ✅
- **SAMIN** — **DECLINED**: Optim.jl-specific variant of simulated annealing with
  box-bound enforcement. Our `simulated-annealing` already covers the core
  Metropolis-Hastings algorithm, and box bounds can be enforced by clamping
  perturbations at the call site. Not worth a separate node for a minor variant
  only one library implements.

### Tier 3: Nice to Have — all DECLINED
- **ParticleSwarm** — **DECLINED**: Global optimizer, but fundamentally different
  problem class (population-based stochastic search). Only Optim.jl implements it
  among surveyed libraries. Users needing global optimization are better served by
  simulated annealing (which we have) or domain-specific tools.
- **MomentumGradientDescent** — **DECLINED**: Historical interest only. L-BFGS
  strictly dominates for smooth unconstrained problems. No library defaults to it.
- **AcceleratedGradientDescent** — **DECLINED**: Nesterov's method has theoretical
  optimal convergence rate, but L-BFGS is faster in practice on all standard test
  functions. Only relevant for very large-scale problems where Hessian approximation
  is infeasible — but then L-BFGS (O(mn) memory) already handles that.
- **NGMRES/OACCEL** — **DECLINED**: Advanced nonlinear acceleration methods. Very
  specialized, only Optim.jl implements them, and they're primarily useful for
  accelerating fixed-point iterations rather than general optimization.
- **GoldenSection (1D)** — **DECLINED**: Strictly inferior to Brent's method (which
  we have) in both convergence rate and practical performance. Brent supersedes it.
- **Preconditioner support** — **DECLINED**: Performance enhancement, not a new
  algorithm. Would add complexity to existing nodes (BFGS, CG, L-BFGS) without
  changing behavioral contracts. Better handled as a translation-time optimization.

### Tier 4: Out of Scope — all DECLINED with rationale
- **Manifold optimization** — Very specialized (Riemannian geometry). Different
  mathematical framework, would require new base types. Out of scope for a
  general-purpose scalar minimization library.
- **Complex-valued optimization** — Niche. Would require complex number support
  throughout vec-ops and all algorithms. Not justified by demand.
- **Adam/AdaGrad/RMSProp/Lion** (Optax) — **Different problem class**. These are
  stochastic gradient methods for mini-batch training, not deterministic optimizers.
  They operate on noisy gradient estimates and don't converge to exact optima. Would
  be a separate skill entirely (`stochastic-optimization`), not an extension of this one.
- **COBYLA** (scipy, NLopt) — Derivative-free constrained optimization. Fills a
  genuine capability gap (constrained without gradients), but the algorithm is complex
  (linear approximation of constraints via simplex) and only scipy/NLopt implement it.
  IPNewton covers constrained optimization for the common case where gradients are
  available or can be finite-differenced.
- **SLSQP** (scipy, NLopt) — Sequential quadratic programming. Same problem class as
  IPNewton (general nonlinear constraints) with a different approach. Redundant
  given IPNewton already covers this.
- **Powell** (scipy, Commons Math) — Direction-set derivative-free method. Alternative
  to Nelder-Mead but not clearly better. Only 2 of 11 libraries implement it.
- **BOBYQA/NEWUOA** (NLopt) — Model-based derivative-free methods. Sophisticated but
  NLopt-specific. Nelder-Mead covers the derivative-free case adequately.
- **Levenberg-Marquardt** (scipy `least_squares`, Ceres) — **Different API shape**.
  Takes a vector of residuals r(x) and minimizes ||r(x)||², not a scalar f(x).
  Widely used for curve fitting and calibration, but would require new types
  (`LeastSquaresResult`, residual/Jacobian interfaces). If pursued, should be a
  separate skill (`nonlinear-least-squares`), not an extension of this one.
- **DIRECT** (scipy, NLopt) — Global optimization by recursive partitioning.
  Very different structure (no gradient, no local convergence). Niche.
- **CMA-ES** (Commons Math) — Covariance matrix adaptation evolution strategy.
  Population-based global optimizer. Only Commons Math implements it among surveyed
  libraries. Same reasoning as ParticleSwarm.
- **MMA** (NLopt) — Method of Moving Asymptotes. Specialized for structural
  optimization. Very niche, only NLopt implements it.
- **L-BFGS-B** (scipy) — L-BFGS with built-in box constraints. Functionally
  equivalent to our Fminbox(L-BFGS). No capability gap.

## Coverage Summary

The library now covers every major algorithm class for deterministic scalar
minimization:

| Class | Algorithms | Coverage |
|-------|-----------|----------|
| Derivative-free | Nelder-Mead, Brent 1D, Simulated Annealing | Complete |
| First-order | GD, BFGS, L-BFGS, CG | Complete |
| Second-order | Newton, Newton TR, Krylov TR | Complete |
| Box-constrained | Fminbox | Complete |
| General constrained | IPNewton | Complete |
| Line searches | Backtracking, Strong Wolfe, Hager-Zhang, More-Thuente | Complete |

**Not in scope**: stochastic/mini-batch optimizers (Optax), nonlinear least squares
(Levenberg-Marquardt), global optimization (DIRECT, CMA-ES), manifold optimization.

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
| **Optim.jl v2.0.0** | BFGS, L-BFGS, NelderMead, GD, CG, Newton, NTR, MoreThuente, Fminbox, KrylovTR, IPNewton | **Empirically validated** (66 runs) |
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
