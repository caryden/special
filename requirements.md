# Requirements: Modular Verified References for AI-Native Code Generation

## Motivation

### The Bundling Problem

Software libraries are distributed as monolithic bundles. When you need one function, you get the entire library — plus its transitive dependencies. This is the default packaging model across every ecosystem: npm, PyPI, crates.io, NuGet, Maven.

Consequences:

- **Supply chain attack surface.** Every transitive dependency is an attack vector. A single compromised package deep in the graph can affect thousands of downstream projects. You audit the library you chose; you trust the 200 libraries it pulled in.
- **Dependency hell.** Version conflicts, diamond dependencies, breaking upgrades. The complexity grows combinatorially with the dependency graph.
- **Unused code.** Most projects use a fraction of the libraries they import. The rest is dead weight — dead weight that still gets compiled, shipped, and exposed to attackers.
- **Platform lock-in.** Libraries ship code in a specific language for a specific runtime. Cross-language use requires FFI, bindings, or rewrites.

### The Opportunity

AI coding agents (Claude Code, Copilot, etc.) can now generate correct implementations from reference material. This changes the economics of code distribution. Instead of shipping pre-built code, you can ship a *reference* that an agent translates into exactly what the consumer needs — in their language, for their platform, including only the functionality they asked for.

This was validated in practice: porting a subset of [Optim.jl](https://github.com/JuliaNLSolvers/Optim.jl) (Julia numerical optimization) to TypeScript by having an AI agent analyze the Julia source, port only the needed functionality, translate the unit tests, and then extract additional test conditions from Julia to verify mathematical equivalence. The result: a self-contained TypeScript library with zero external dependencies, verified against the reference, containing only the functions actually needed.

### Prior Art

- [A Software Library With No Code](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Drew Breunig, Jan 2026) — demonstrated the concept using markdown + YAML specs that an LLM consumes to generate implementations. Proved the idea works. Raised the question of whether markdown + YAML is the optimal format.

## Core Hypothesis

There exists an optimal *form* for reference material — a "universal donor" representation — that AI agents can most efficiently and reliably translate into correct implementations in any target language. This form is somewhere on a spectrum:

```
Natural language prose
  → Markdown + YAML
    → Structured DSL
      → Reference implementation in a well-chosen real language
        → Formal specification (Lean/Dafny/TLA+)
```

The hypothesis is that the sweet spot is toward the "reference implementation in a real language" end — specifically, a **type-safe language with low ceremony, deep LLM training representation, and lightweight tooling** rather than a custom specification language or a natural language description.

The current choice is **TypeScript with Bun** (see [ADR-0002](docs/decisions/0002-type-o-language-typescript-bun.md)). The graph metadata is declared via structured JSDoc comments rather than compiled attributes, and the agent reads source files directly rather than relying on reflection-based extraction tooling.

Rationale:

- AI agents have deep training data for real languages; a novel DSL has zero. TypeScript has arguably the deepest LLM training representation of any language.
- Real languages have real toolchains: the reference implementation *runs* and its tests *execute*. Bun provides a built-in test runner with zero configuration.
- The type system is tunable — strict where it helps, loose where it doesn't — and expresses logic without leaking platform-specific details.
- The reference captures both behavioral intent and structural architecture — not just *what* the code does, but how it's organized.
- Lightweight toolchain (Bun is a single binary) means the approach works in any environment including Claude Code Web, Codespaces, and sandboxes.

## The Model

### The Graph Is Already in the Code

The dependency graph between functions, types, and modules is not a new data model to design — it already exists implicitly in any well-structured codebase. Functions call other functions. Types reference other types. Modules import other modules. The graph is *there*; it just isn't surfaced.

This was demonstrated in practice with the Optim.jl port: an AI agent analyzed the Julia source, traced the dependency graph from the requested functions, and extracted only the needed subgraph. It worked — but it required significant back-and-forth because the agent had to *discover* the graph by reading and reasoning about the code. Every agent that consumes the same library would repeat this same discovery work.

The key insight: **the graph should be pre-computed and declared, not discovered at translation time.** The work of understanding the dependency structure is the same for every consumer. It should be done once by the reference author and made explicit in the code.

### Structured Comments as Graph Metadata

The graph is declared directly in the source code via structured JSDoc comments on exported functions. No separate metadata format, no compilation step, no reflection tooling — the agent reads the source files directly.

```typescript
/**
 * L-BFGS optimization algorithm.
 *
 * @node l-bfgs
 * @depends-on line-search, convergence-check, vec-ops
 * @contract l-bfgs.test.ts
 * @hint platform: Target should use platform BLAS for vec-ops if available
 */
export function lbfgs<T>(objective: (x: T[]) => number, x0: T[], opts?: MinOptions): MinResult<T> {
  // ...
}
```

The structured comments pre-compute what every agent would otherwise need to figure out:

- **What depends on what.** Explicit `@depends-on` edges instead of agent inference from call sites.
- **Where the tests are.** Direct `@contract` link between implementation and its behavioral contract.
- **Translation guidance.** `@hint` tags for platform-specific concerns, performance expectations, or adaptation strategies that would otherwise require the agent to reason about from scratch.

The code *is* the reference implementation. The comments *are* the graph. Nothing is separated into a different format or language. The agent reads `.ts` files directly — no compilation, no assembly loading, no reflection API.

If mechanical extraction is ever needed (e.g., tooling to emit a subgraph as a standalone package), the structured comments are trivially parseable by a simple script — regex on JSDoc tags. But the primary consumer is the AI agent reading source.

### Workflow

| Step | Done by | Input | Output |
|------|---------|-------|--------|
| **Author** reference with structured comments | Human developer | Domain knowledge | Annotated TypeScript reference library |
| **Request** a node | User | Node ID | Agent reads source files, builds graph from `@node`/`@depends-on` tags |
| **Plan** translation order | Agent | Dependency graph | Topologically sorted task list (leaves first) |
| **Translate** each node in order | Agent | One node at a time | Native implementation of that node in target language |
| **Verify** at each step | Agent + test runner | Generated code + translated tests | Pass/fail per node |
| **Resolve** ambiguities | Agent + user | `@hint adapt:` tags that require decisions | User's adaptation choices |

The agent reads the full reference only once to build the graph. Then it works through the translation plan one node at a time, keeping context minimal at each step.

### Node Structure

Each annotated node in the reference library represents a discrete unit of functionality: a function, a data type, or a small cohesive module. One source file per node, one test file per node.

Each node carries (via structured comments and the code itself):

- **Identity.** A unique kebab-case identifier (`@node time-ago`).
- **Reference implementation.** The exported function body — working, executable TypeScript.
- **Tests.** A linked test file (`@contract time-ago.test.ts`) that defines the behavioral contract. **Tests must achieve 100% line and function coverage of the reference implementation — no exceptions.** Uncovered code is unverifiable after translation; if a line can't be covered, it shouldn't exist.
- **Dependencies.** Declared edges to other node identifiers (`@depends-on`).
- **Metadata.** Translation hints (`@hint`), descriptions — anything that pre-computes knowledge an agent would otherwise need to derive.

A node is either **pure** (no `@depends-on` — a leaf in the graph) or **composite** (depends on other nodes).

### Selective Extraction

When a consumer requests a node, the agent (or a simple script) computes its **transitive closure** from the `@depends-on` tags — that node plus every node reachable through its dependency edges. Nothing else.

Example: requesting `l-bfgs` from an optimization library yields:

```
l-bfgs → line-search → backtracking-armijo
       → gradient (interface — consumer provides or selects an impl)
       → convergence-check
       → vec-ops (dot, norm, scale, axpy)
```

The consumer gets 6 nodes. Not the 40 other optimization algorithms, not the CLI tools, not the plotting utilities.

### Agent Translation

The agent reads the reference source files, builds the dependency graph from `@node` and `@depends-on` tags, computes the transitive closure for the requested node, and produces a topologically sorted translation plan — leaf nodes first, composite nodes after their dependencies.

For example, a user requests "L-BFGS in Rust." The agent reads the reference, identifies the subgraph, and works through it:

```
Translation Plan: l-bfgs → Rust
Source: reference/optimization/src/

1. Translate node "vec-ops" (pure — no dependencies)
   Source: vec-ops.ts | Tests: vec-ops.test.ts (14 cases)
   Hint: Consider nalgebra or ndarray for target platform

2. Translate node "convergence-check" (pure — no dependencies)
   Source: convergence-check.ts | Tests: convergence-check.test.ts (5 cases)

3. Translate node "backtracking-armijo" (depends: vec-ops)
   Source: backtracking-armijo.ts | Tests: backtracking-armijo.test.ts (8 cases)

4. Translate node "line-search" (depends: backtracking-armijo)
   Source: line-search.ts | Tests: line-search.test.ts (7 cases)

5. Translate node "l-bfgs" (depends: line-search, convergence-check, vec-ops)
   Source: l-bfgs.ts | Tests: l-bfgs.test.ts (13 cases)
   Hint: Target should use platform BLAS for vec-ops if available

6. Run all translated tests (47 expected)
```

Key properties:

- **Minimal context per step.** The agent works on one node at a time — just the current node's reference code, its tests, and the interfaces of previously-translated dependencies.
- **Topological ordering.** The agent never translates a node before its dependencies exist in the target language.
- **Translation hints are inline.** Platform-specific guidance is attached to the relevant node via `@hint` tags, not buried in separate documentation.
- **Verifiable at each step.** Tests run after each node translation, not just at the end. Failures are caught early and localized to the specific node that broke.
- **Adaptable via agent skills.** Where an `@hint adapt:` tag raises an ambiguity the agent can't resolve alone, it asks the user for a decision.

## Evaluation Rubric

Any proposed approach — whether it's a specific donor language, a custom format, or a hybrid — should be evaluated against these properties:

### Agent Effectiveness

- **Translation accuracy.** Does the agent produce correct implementations on the first pass? Measured by test pass rate.
- **Semantic transparency.** Does every token in the representation map directly to behavioral meaning? (Metaprogramming, macros, and heavy abstraction layers reduce transparency — see: RxInfer.jl confusing agents.)
- **Context efficiency.** How many tokens of input does the agent need to produce a correct output? This affects speed, coherence within context window limits, and cost. Not just dollar cost — staying within context windows is the primary concern.
- **Training distribution alignment.** Does the representation match patterns the agent has seen extensively in training? Agents are better at some languages than others due to training data distribution and the inherent entropy of the language.

### Reference Quality

- **Modularity.** Can individual functions or small modules be extracted independently? The unit of extraction should be a function or cohesive module, not a package.
- **Test completeness.** Do the tests fully specify the behavioral contract? Including edge cases, error conditions, and (where relevant) performance bounds? **100% line and function coverage is required — no exceptions.** Every line of reference code is part of the behavioral spec; uncovered code is unverifiable after translation. If a line can't be covered, remove it — zero dead code in reference libraries.
- **Executability.** Can the reference implementation and its tests be run directly? A spec that can't be validated against itself is less trustworthy than one that can.
- **Type expressiveness.** Does the type system capture the important structural constraints? Strong types communicate intent unambiguously across language boundaries.

### Practical Viability

- **Authoring cost.** Can developers realistically create and maintain reference implementations? Using a real language with existing tooling dramatically lowers this barrier vs. a custom spec language.
- **Toolchain maturity.** Does the approach leverage existing compilers, test runners, IDEs, and static analysis? Or does it require building a new toolchain from scratch?
- **Graph metadata support.** Can the dependency graph be declared directly in the source code? Structured comments (JSDoc-style) work in any language. Compiled attributes/annotations (C#, Kotlin/Java) are more formal but require compilation and reflection tooling. The current approach uses structured comments because the primary consumer is an AI agent that reads source directly.
- **Incremental adoption.** Can existing well-tested libraries be converted into this form without a ground-up rewrite? Ideally, adding structured comments to an existing well-structured codebase should be the primary onboarding path — not rewriting from scratch.
- **Human reviewability.** Can a developer audit the reference to understand what they're asking an agent to build?

### Boundary Conditions

The approach has known limits. These should be acknowledged, not hand-waved:

- **Performance-critical code.** Libraries whose value is implementation-level optimization (BLAS, FFmpeg, zlib) cannot be fully captured by a behavioral spec. The *how* is the value. For these, the reference can include performance annotations or directives that tell the agent to bind to platform-native optimized implementations rather than generating naive code.
- **Hardware-specific code.** Drivers, SIMD intrinsics, GPU kernels — platform abstraction is the wrong goal here.
- **Security-sensitive implementations.** Where correctness depends on implementation details (constant-time execution, memory zeroing, side-channel resistance), behavioral tests are insufficient.

The sweet spot is **logic-heavy, platform-independent code**: business rules, protocols, algorithms, data structures, transformations, and the vast majority of application-level code.

## Open Questions

- **Single donor language or domain-dependent?** TypeScript is the current choice. It may not be optimal for all domains — numerical libraries might benefit from a language with stronger numeric generics (C#'s `IFloatingPoint<T>`). This should be revisited with data after the first translation experiments.
- **Comment vocabulary.** The current tags (`@node`, `@depends-on`, `@contract`, `@hint`) are minimal and untested at scale. What metadata actually matters? What do agents need to know that they can't infer from the code itself? This should be driven by empirical observation of where agents struggle during translation.
- **Interface nodes.** How are abstraction boundaries represented? When a node depends on "a gradient function" as an interface rather than a concrete implementation, how is that declared? TypeScript's own interface/type system may be sufficient, or it may need additional `@hint` support.
- **Performance annotations.** What `@hint` vocabulary is needed to tell an agent "don't be naive about this — use platform-optimized implementations where available"? This bridges the boundary condition for performance-critical code.
- **Granularity.** What's the right size for a node? A single function? A class? A small module? Too fine-grained and the comment overhead dominates; too coarse and you lose the unbundling benefit.
- **Versioning and evolution.** How do nodes version? When a node's contract changes, how does that propagate through the graph?
- **Empirical validation.** The "universal donor" hypothesis is testable. Take the same reference library, have agents translate it to multiple target languages, and measure first-pass test pass rate. The whenwords reference library is the first test case.

## Status

First reference library implemented: [whenwords](reference/whenwords/) (5 nodes, 124 tests, 100% coverage). Next step is to test the translation skill — have an agent translate the whenwords reference to a target language and measure the results.
