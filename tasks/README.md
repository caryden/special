# Durable Tasks

Structured task files for work that requires specific environments not available in the
current session. Each task is self-contained with context, steps, scripts, and acceptance
criteria so it can be picked up in a future Claude Code session.

## Pattern

Each task file includes:
- **Environment required** — what's needed to run this task
- **Context** — why this task exists and what it validates
- **Steps** — concrete, copy-pasteable scripts and commands
- **Acceptance criteria** — checklist for completion

## Current Tasks

| Task | Environment | Status |
|------|-------------|--------|
| [Julia cross-validation](julia-cross-validation.md) | Julia 1.10+ with Optim.jl | Partial (Brent-1D + SA done, others pending) |
| [MATLAB cross-validation](matlab-cross-validation.md) | MATLAB R2024+ | Pending |
| [C++ cross-validation](cpp-cross-validation.md) | CMake + Ceres/dlib/LBFGSPP | Pending |
| [NLopt cross-validation](nlopt-cross-validation.md) | NLopt 2.10.0 | Pending |
| [Cross-validate new algorithms](cross-validate-new-algorithms.md) | Various | Pending |
| [Performance benchmarks](performance-benchmarks.md) | Node.js + Python (scipy) | Pending |

## Completed Tasks

Archived in `completed/`. These implementation tasks have been finished — the
corresponding nodes are in `skills/optimization/reference/src/` with 100% coverage.

| Task | Completed |
|------|-----------|
| implement-brent-1d | Brent 1D optimizer |
| implement-conjugate-gradient | Hager-Zhang conjugate gradient |
| implement-finite-hessian | Finite-difference Hessian |
| implement-hager-zhang | Hager-Zhang line search |
| implement-newton | Newton's method with line search |
| implement-newton-trust-region | Newton trust-region (dogleg) |

## Usage

When starting a session with the right environment available:

```
I have Julia installed. Please pick up tasks/julia-cross-validation.md
```

The task file provides all the context needed for a fresh session to execute the work.
