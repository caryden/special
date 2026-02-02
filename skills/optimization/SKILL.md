---
name: optimization
description: Generate a native numerical optimization library — Nelder-Mead, BFGS, L-BFGS, CG, Newton, Newton Trust Region, More-Thuente, Fminbox, Simulated Annealing, Krylov Trust Region — from a verified TypeScript reference
argument-hint: "<nodes> [--lang <language>] — e.g. 'nelder-mead --lang python' or 'all --lang rust'"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# Optimization Skill

A modular numerical optimization library. Minimizes scalar functions of one or
more variables using derivative-free (Nelder-Mead, Brent 1D, Simulated Annealing),
first-order (gradient descent, BFGS, L-BFGS, conjugate gradient), and second-order
(Newton, Newton Trust Region, Krylov Trust Region) methods.

## When to use this skill

When you need to minimize a function without adding an optimization library
dependency. Covers the core algorithms that scipy.optimize.minimize and
Optim.jl provide, implemented from scratch with clear provenance.

## Arguments

`$ARGUMENTS` has the format: `<nodes> [--lang <language>]`

- **nodes**: Space-separated list of node names to translate, or `all` for every node.
  Nodes must be provided in dependency order (see the node graph below).
- **--lang**: Target language (e.g. `python`, `rust`, `go`, `typescript`).
  Defaults to `typescript` if omitted.

Examples:
- `nelder-mead --lang python` — translate just the Nelder-Mead subset to Python
- `all --lang rust` — translate the full library to Rust
- `bfgs l-bfgs minimize --lang go` — translate selected nodes to Go

## Node Graph

```
vec-ops ─────────────────────────┬──→ line-search ──────┬──→ hager-zhang ──────┐
                                 │                      │                      │
                                 ├──→ more-thuente      │                      │
                                 │                      │                      │
result-types ──────┬─────────────┤                      │                      │
                   │             │                      │                      │
test-functions     │   finite-diff ─────────────────────┤                      │
                   │             │                      │                      │
                   │     finite-hessian ←───────────────┤                      │
                   │             │                      │                      │
                   ├──→ nelder-mead                     │                      │
                   │                                    │                      │
                   ├──→ brent-1d (standalone)            │                      │
                   │                                    │                      │
                   ├──→ gradient-descent ←──────────────┤                      │
                   │                                    │                      │
                   ├──→ bfgs ←─────────────────────────┤                      │
                   │                                    │                      │
                   ├──→ l-bfgs ←───────────────────────┤                      │
                   │                                    │                      │
                   ├──→ conjugate-gradient ←────────────┴──────────────────────┘
                   │                                    │
                   ├──→ newton ←───────────────────────┤←── finite-hessian
                   │                                    │
                   ├──→ newton-trust-region ←───────────┤←── finite-hessian
                   │                                    │
                   ├──→ fminbox ←──────────────────────┤
                   │                                    │
                   ├──→ simulated-annealing               │
                   │                                    │
                   ├──→ krylov-trust-region ←──────────┤←── finite-hessian
                   │                                    │
                   └──→ minimize (root: public API) ←──┘
```

### Nodes

| Node | Type | Depends On | Description |
|------|------|-----------|-------------|
| `vec-ops` | leaf | — | Pure vector arithmetic: dot, norm, add, sub, scale, etc. |
| `result-types` | leaf | — | OptimizeResult, OptimizeOptions, convergence checking |
| `test-functions` | leaf | — | Standard test functions (Sphere, Rosenbrock, etc.) with analytic gradients |
| `finite-diff` | internal | vec-ops | Numerical gradient via forward/central differences |
| `finite-hessian` | internal | — | Full Hessian via central differences + Hessian-vector product |
| `line-search` | internal | vec-ops | Backtracking (Armijo) and Strong Wolfe line search |
| `hager-zhang` | internal | vec-ops, line-search | Hager-Zhang line search with approximate Wolfe conditions |
| `more-thuente` | internal | vec-ops, line-search | More-Thuente line search with cubic interpolation and strong Wolfe conditions |
| `brent-1d` | leaf | — | Brent's method for 1D minimization on a bounded interval |
| `nelder-mead` | internal | vec-ops, result-types | Derivative-free simplex optimizer |
| `gradient-descent` | internal | vec-ops, result-types, line-search, finite-diff | Steepest descent with backtracking |
| `bfgs` | internal | vec-ops, result-types, line-search, finite-diff | Full-memory quasi-Newton with Wolfe line search |
| `l-bfgs` | internal | vec-ops, result-types, line-search, finite-diff | Limited-memory BFGS with two-loop recursion |
| `conjugate-gradient` | internal | vec-ops, result-types, hager-zhang, finite-diff | Nonlinear CG with Hager-Zhang beta and line search |
| `newton` | internal | vec-ops, result-types, line-search, finite-diff, finite-hessian | Newton's method with Cholesky solve and modified Newton regularization |
| `newton-trust-region` | internal | vec-ops, result-types, finite-diff, finite-hessian | Newton with dogleg trust region subproblem |
| `fminbox` | internal | vec-ops, result-types, any-of(bfgs, l-bfgs, conjugate-gradient, gradient-descent) | Box-constrained optimization via log-barrier method |
| `simulated-annealing` | internal | result-types | Derivative-free stochastic global optimizer with Metropolis criterion |
| `krylov-trust-region` | internal | vec-ops, result-types, finite-diff, finite-hessian | Newton-type optimizer using Steihaug-Toint truncated CG (Hessian-vector products only) |
| `minimize` | root | result-types, any-of(nelder-mead, gradient-descent, bfgs, l-bfgs, conjugate-gradient, newton, newton-trust-region) | Dispatcher: selects algorithm from method + gradient availability |

### Subset Extraction

- **Just Nelder-Mead** (derivative-free): `vec-ops` + `result-types` + `nelder-mead`
- **Just BFGS**: `vec-ops` + `result-types` + `line-search` + `finite-diff` + `bfgs`
- **Just CG**: `vec-ops` + `result-types` + `line-search` + `hager-zhang` + `finite-diff` + `conjugate-gradient`
- **Just Newton**: `vec-ops` + `result-types` + `line-search` + `finite-diff` + `finite-hessian` + `newton`
- **Just Newton TR**: `vec-ops` + `result-types` + `finite-diff` + `finite-hessian` + `newton-trust-region`
- **Just Brent 1D**: `brent-1d` (standalone, no dependencies)
- **Just Fminbox (BFGS)**: `vec-ops` + `result-types` + `line-search` + `finite-diff` + `bfgs` + `fminbox`
- **Just Simulated Annealing**: `result-types` + `simulated-annealing`
- **Just Krylov TR**: `vec-ops` + `result-types` + `finite-diff` + `finite-hessian` + `krylov-trust-region`
- **Full library**: all 20 nodes
- **Test functions** are optional — only needed for validation

## Translation Workflow

For each node in dependency order:

1. Read the node spec at `nodes/<name>/spec.md` for behavior, API, and test vectors
2. Read language-specific hints at `nodes/<name>/to-<lang>.md` if available
3. Generate the implementation and tests in the target language
4. If the spec is ambiguous, consult the TypeScript reference at `reference/src/<name>.ts`

The reference code is TypeScript with 100% line and function coverage. Every node
has a corresponding test file at `reference/src/<name>.test.ts` that serves as the
behavioral contract. Cross-validation against scipy v1.17.0 and Optim.jl v2.0.0
is documented in `reference/CROSS-VALIDATION.md`.

## Key Design Decisions (Off-Policy)

These defaults differ across libraries. Our choices are documented with provenance:

| Parameter | Our Value | scipy | Optim.jl | MATLAB |
|-----------|-----------|-------|----------|--------|
| Gradient tolerance | 1e-8 | 1e-5 | 1e-8 | 1e-6 |
| Step tolerance | 1e-8 | — | disabled | 1e-8 |
| Function tolerance | 1e-12 | 1e-12 | 0 | 1e-6 |
| Max iterations | 1000 | varies | 1000 | 400 |
| Wolfe c1 | 1e-4 | 1e-4 | 1e-4 | 1e-4 |
| Wolfe c2 | 0.9 | 0.9 | 0.9 | 0.9 |
| Default method (no grad) | nelder-mead | BFGS+FD | NelderMead | fminsearch |
| Default method (with grad) | bfgs | BFGS | LBFGS | fminunc |

## Error Handling

- Line search failure: return result with `converged=false` and a descriptive message
- Max iterations exceeded: return result with `converged=false`
- Division by zero in finite differences: not guarded (caller's responsibility)
- No exceptions thrown by optimizers — all results are returned via `OptimizeResult`
- Invalid method name in `minimize`: throw an error before optimization begins
- Empty or zero-length input vectors: behavior is undefined (caller must validate)
