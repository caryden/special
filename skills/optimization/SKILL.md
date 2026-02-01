---
name: optimization
description: Generate a native numerical optimization library — Nelder-Mead, BFGS, L-BFGS, gradient descent — from a verified TypeScript reference
argument-hint: "<nodes> [--lang <language>] — e.g. 'nelder-mead --lang python' or 'all --lang rust'"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# Optimization Skill

A modular numerical optimization library. Minimizes scalar functions of one or
more variables using derivative-free (Nelder-Mead) and gradient-based (gradient
descent, BFGS, L-BFGS) methods.

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
