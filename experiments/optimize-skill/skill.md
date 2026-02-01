# Optimize Skill

A modular numerical optimization library. Minimizes scalar functions of one or
more variables using derivative-free (Nelder-Mead) and gradient-based (gradient
descent, BFGS, L-BFGS) methods.

## When to use this skill

When you need to minimize a function without adding an optimization library
dependency. Covers the core algorithms that scipy.optimize.minimize and
Optim.jl provide, implemented from scratch with clear provenance.

## Node Graph

```
vec-ops ─────────────────────────┬──→ line-search ──────┐
                                 │                      │
result-types ──────┬─────────────┤                      │
                   │             │                      │
test-functions     │   finite-diff ─────────────────────┤
                   │                                    │
                   ├──→ nelder-mead                     │
                   │                                    │
                   ├──→ gradient-descent ←──────────────┤
                   │                                    │
                   ├──→ bfgs ←─────────────────────────┤
                   │                                    │
                   ├──→ l-bfgs ←───────────────────────┤
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
| `line-search` | internal | vec-ops | Backtracking (Armijo) and Strong Wolfe line search |
| `nelder-mead` | internal | vec-ops, result-types | Derivative-free simplex optimizer |
| `gradient-descent` | internal | vec-ops, result-types, line-search, finite-diff | Steepest descent with backtracking |
| `bfgs` | internal | vec-ops, result-types, line-search, finite-diff | Full-memory quasi-Newton with Wolfe line search |
| `l-bfgs` | internal | vec-ops, result-types, line-search, finite-diff | Limited-memory BFGS with two-loop recursion |
| `minimize` | root | nelder-mead, gradient-descent, bfgs, l-bfgs, result-types | Dispatcher: selects algorithm from method + gradient availability |

### Subset Extraction

- **Just Nelder-Mead** (derivative-free): `vec-ops` + `result-types` + `nelder-mead`
- **Just BFGS**: `vec-ops` + `result-types` + `line-search` + `finite-diff` + `bfgs`
- **Full library**: all 10 nodes
- **Test functions** are optional — only needed for validation

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

## How to Use This Skill

1. Read this file for overview and the node graph
2. For each node you need, read `nodes/<name>/spec.md` for behavior and test vectors
3. Read `nodes/<name>/to-<lang>.md` for language-specific translation guidance
4. Generate implementation + tests
5. If stuck, consult `reference/optimize/src/<name>.ts` for the TypeScript reference

The per-node specs are self-contained — you can build nodes in dependency order.

## Error Handling

- Line search failure → return result with `converged=false` and descriptive message
- Max iterations → return result with `converged=false`
- Division by zero in finite differences → not guarded (caller's responsibility)
- No exceptions thrown by optimizers — all results are returned via OptimizeResult
